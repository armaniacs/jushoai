import { classifyAll } from '../core/analyze';
import { isEnglishPageText } from '../core/page-language';
import type { PlanItem } from '../core/planner';
import { buildFeedbackInput, replanItems, snapshotItems } from '../content-run';
import { applyPlan } from '../dom/apply-plan';
import { planMounts } from '../dom/mount-plan';
import { detectForms, scanContainer } from '../dom/detect-forms';
import { fillField } from '../dom/fill';
import { BackgroundClassifier, getAiStatusViaBackground, requestDownloadViaBackground } from '../llm/background-gateway';
import { buildFeedbackIssueUrl, FEEDBACK_REPO, type FeedbackSnapshot } from '../feedback/issue-url';
import { isReady, loadData, loadLastUsed, resolveAddressId, resolveLastId, saveLastUsed } from '../storage';
import { detectBrowser } from '../llm/browser-support';
import { buildGuide, showAiGuide, type GuideHandle } from '../ui/ai-guide';
import { mountButton, type ButtonHandle } from '../ui/button';
import { showPreview, type PreviewHandle, type PreviewRow } from '../ui/preview';
import { ANALYZE_MESSAGE_TYPE, type ClassifyFailure } from '../messages';

// Consent verification for the preview apply path. The preview host lives in
// the page light DOM, so page CSS or scripts can hide, move, or cover it after
// it opens. The apply click is the last trust point: verify the panel is still
// genuinely visible before injecting anything. Hit-testing and visibility
// queries are injectable so unit tests can use fakes (jsdom has no layout).
export interface ConsentPoint {
  x: number;
  y: number;
}

// Where the consent click is aimed: a viewport point, offscreen, or without a
// box at all (hidden).
export type ApplyPoint = ConsentPoint | { offscreen: true } | { empty: true };

export interface ConsentCheckDeps {
  getHost(): Element | null;
  isHostConnected(): boolean;
  getApplyPoint(): ApplyPoint;
  isHostVisible(): boolean;
  hitTest(x: number, y: number): Element | null;
}

export type ConsentVerdict = { ok: true } | { ok: false; reason: string };

// Whether the hit-test topmost node is our own UI. elementFromPoint retargets
// shadow content to the host in some browsers but returns the inner node in
// others; both mean ours is topmost. host.contains cannot pierce the shadow
// boundary, so compare through the hit node's root instead (root.host works
// even for closed roots). A page element covering the button is always a
// light-DOM node outside the host and stays rejected. Our own panel content
// cannot be a cover: pages cannot insert nodes into the closed shadow tree.
function isOwnTopmost(host: Element, hit: Element | null): boolean {
  if (hit === null) return false;
  if (host.contains(hit)) return true;
  const root = hit.getRootNode();
  return root instanceof ShadowRoot && root.host === host;
}

export function verifyApplyConsent(deps: ConsentCheckDeps): ConsentVerdict {
  const host = deps.getHost();
  if (host === null || !deps.isHostConnected()) {
    return { ok: false, reason: 'パネルがページから取り除かれたため入力を中止しました' };
  }
  const point = deps.getApplyPoint();
  if ('offscreen' in point) {
    return { ok: false, reason: 'パネルが画面の外にあるため入力を中止しました' };
  }
  if ('empty' in point) {
    return { ok: false, reason: 'パネルが表示されていない疑いがあるため入力を中止しました' };
  }
  if (!deps.isHostVisible()) {
    return { ok: false, reason: 'パネルが表示されていないため入力を中止しました' };
  }
  // The topmost node must be our own UI: the host itself, its light-DOM
  // children, or a node inside our shadow tree (see isOwnTopmost).
  const hit = deps.hitTest(point.x, point.y);
  if (!isOwnTopmost(host, hit)) {
    return { ok: false, reason: 'パネルが他の要素に覆われているため入力を中止しました' };
  }
  return { ok: true };
}

const CONSENT_HOST_SELECTOR = '[data-jushoai]';

export interface ConsentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// DOM queries behind the default deps. The boundary between testable logic and
// renderer facts: hostCenter / viewport checks / visibility fallback are pure
// over this env and unit-testable with fakes; rectOf / elementFromPoint need a
// real layout engine, so the browser env delegates to the live DOM while tests
// inject rects and hits.
export interface ConsentEnv {
  queryHost(): Element | null;
  viewport(): { width: number; height: number };
  rectOf(el: Element): ConsentRect;
  elementFromPoint(x: number, y: number): Element | null;
  computedStyle(el: Element): { display: string; visibility: string; opacity: string };
}

const browserConsentEnv: ConsentEnv = {
  queryHost: () => document.querySelector(CONSENT_HOST_SELECTOR),
  viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
  rectOf: (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  },
  elementFromPoint: (x, y) => document.elementFromPoint(x, y),
  computedStyle: (el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity };
  },
};

const inViewport = (env: ConsentEnv, x: number, y: number): boolean => {
  const v = env.viewport();
  return x >= 0 && y >= 0 && x < v.width && y < v.height;
};

// getButtonPoint reads the apply button through the preview handle (the button
// lives inside the closed shadow root). A null button box means the button is
// hidden, which blocks the apply; without a provider the host center is used.
export function defaultConsentCheckDeps(
  getButtonPoint?: () => ConsentPoint | null,
  env: ConsentEnv = browserConsentEnv,
  getPreviewHost?: () => Element | null,
): ConsentCheckDeps {
  // The document holds several JushoAI hosts; the gate must verify the panel
  // host, never the first match (which is usually the form button host).
  const getHost = (): Element | null => getPreviewHost?.() ?? env.queryHost();
  const hostCenter = (): ApplyPoint => {
    const host = getHost();
    if (host === null) return { offscreen: true };
    const rect = env.rectOf(host);
    if (rect.width === 0 && rect.height === 0) return { empty: true };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (!inViewport(env, x, y)) return { offscreen: true };
    return { x, y };
  };
  return {
    getHost,
    isHostConnected: () => getHost()?.isConnected ?? false,
    getApplyPoint: () => {
      if (!getButtonPoint) return hostCenter();
      // A throwing provider must fail safe: block the apply instead of
      // leaving the click half-handled.
      let p: ConsentPoint | null;
      try {
        p = getButtonPoint();
      } catch {
        return { empty: true };
      }
      if (p === null) return { empty: true };
      if (!inViewport(env, p.x, p.y)) return { offscreen: true };
      return p;
    },
    isHostVisible: () => {
      const host = getHost();
      if (host === null) return false;
      if (typeof host.checkVisibility === 'function') {
        return host.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      }
      const style = env.computedStyle(host);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    },
    hitTest: (x, y) => env.elementFromPoint(x, y),
  };
}

// Runs apply only when consent verification passes; on failure reports the
// reason through abort and leaves the panel open for cancel or retry.
export function applyIfConsented(
  deps: ConsentCheckDeps,
  apply: () => void,
  abort: (reason: string) => void,
): boolean {
  const verdict = verifyApplyConsent(deps);
  if (!verdict.ok) {
    abort(verdict.reason);
    return false;
  }
  apply();
  return true;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const mounted = new Map<Element, { handle: ButtonHandle; anchor: Element }>();
    const running = new Set<Element>();
    let openPreview: PreviewHandle | null = null;
    let openGuide: GuideHandle | null = null;
    const browser = detectBrowser(navigator.userAgent);

    // Only a dead extension context calls for a reload. Every other failure
    // (classification, network, bad response) is retryable on the classify side.
    const isContextInvalidated = (e: unknown): boolean => {
      const msg = e instanceof Error ? e.message : String(e);
      return msg.includes('Extension context invalidated');
    };

    async function guardedRun(container: Element, button: ButtonHandle): Promise<boolean> {
      if (running.has(container)) return true;
      running.add(container);
      try {
        await run(container, button);
        return true;
      } catch (e) {
        button.showError(
          isContextInvalidated(e) ? 'エラー: ページを再読み込み' : 'エラー: 分類に失敗、再試行してください',
        );
        return false;
      } finally {
        running.delete(container);
      }
    }

    // The classifier keeps working rule-only when AI fails, so surface WHY it
    // failed (set-up vs retryable) instead of leaving the user to guess.
    // Raw statuses never leave this map; only these coarse guidance lines do.
    const AI_FAILURE_HINT: Record<ClassifyFailure, string> = {
      'not-configured': 'AI未設定のためルールのみで表示',
      permission: 'AI通信が未許可のためルールのみで表示: 設定で許可してください',
      auth: 'AI認証に失敗したためルールのみで表示: APIキーを確認してください',
      unavailable: '内蔵AIが未準備のためルールのみで表示',
      network: 'AI通信に失敗したためルールのみで表示: 再試行できます',
      rejected: 'AIが要求を拒否したためルールのみで表示: モデル設定を確認してください',
      'bad-response': 'AI応答を解釈できずルールのみで表示',
    };

    async function run(container: Element, button: ButtonHandle) {
      const [data, last] = await Promise.all([loadData(), loadLastUsed()]);
      if (!isReady(data)) {
        void chrome.runtime.sendMessage({ type: 'open-options' });
        return;
      }

      const info = await getAiStatusViaBackground();
      button.setStatus(info);
      if (info.provider === 'built-in' && info.status === 'downloadable') {
        void requestDownloadViaBackground()
          .then(() => getAiStatusViaBackground())
          .then((s) => button.setStatus(s));
      }
      const classifier = info.status === 'available' ? new BackgroundClassifier() : null;

      const fields = scanContainer(container, document);
      const byId = new Map(fields.map((f) => [f.meta.id, f]));
      const metas = fields.map((f) => f.meta);
      const englishPage = isEnglishPageText(document.body?.innerText ?? '');
      let items = await classifyAll(metas, classifier, { englishPage });
      const reason = classifier?.lastFailureReason;
      if (reason) button.showError(AI_FAILURE_HINT[reason]);
      void getAiStatusViaBackground().then((i) => button.setStatus(i));
      const beforeItems = snapshotItems(items);
      let afterItems: Map<string, FeedbackSnapshot> | null = null;

      let profileId = resolveLastId(last.profileId, data.profiles.map((p) => p.id)) ?? data.profiles[0]!.id;
      let addressId = resolveAddressId(data.addresses, profileId, last.addressId) ?? data.addresses[0]!.id;
      let plan: PlanItem[] = [];
      const metasById = new Map(fields.map((f) => [f.meta.id, f.meta]));
      const replan = (): PreviewRow[] => {
        const profile = data.profiles.find((p) => p.id === profileId) ?? data.profiles[0]!;
        const address = data.addresses.find((a) => a.id === addressId) ?? null;
        const out = replanItems(items, profile, address, metasById);
        plan = out.plan;
        return out.rows;
      };

      async function reanalyze() {
        if (!classifier) return;
        items = await classifyAll(metas, classifier, { force: true, englishPage });
        const reason = classifier.lastFailureReason;
        if (reason) button.showError(AI_FAILURE_HINT[reason]);
        afterItems = snapshotItems(items);
        preview.setRows(replan());
      }

      // Preview and guide occupy the same fixed corner; opening one must close the other.
      openPreview?.close();
      openPreview = null;
      openGuide?.close();
      openGuide = null;
      const preview = showPreview({
        rows: replan(),
        addresses: data.addresses,
        selectedAddressId: addressId,
        onReanalyze: classifier ? reanalyze : undefined,
        profiles: data.profiles,
        selectedProfileId: profileId,
        onProfileChange: (id) => {
          profileId = id;
          addressId = resolveAddressId(data.addresses, id, addressId) ?? data.addresses[0]!.id;
          preview.setAddressId(addressId);
          preview.setRows(replan());
        },
        onAddressChange: (id) => {
          addressId = id;
          preview.setRows(replan());
        },
        onApply: (sendFeedback) => {
          // Last trust point: the host may have been hidden, moved, or covered
          // since the panel opened. The aim point comes from the apply button
          // through the preview handle; abort before injecting anything. The
          // panel stays open for cancel or retry, and the reason goes to the
          // form button, which stays visible even when the panel is hidden.
          applyIfConsented(
            defaultConsentCheckDeps(() => preview.getApplyPoint(), undefined, () => preview.getHost()),
            () => {
              void saveLastUsed({ profileId, addressId });
              applyPlan(plan, byId, fillField);
              preview.close();
              openPreview = null;
              const feedbackInput = buildFeedbackInput({
                pageHref: location.href,
                provider: info.provider,
                version: chrome.runtime.getManifest().version,
                before: beforeItems,
                after: afterItems,
                fields: metas,
                sendFeedback,
              });
              if (feedbackInput) {
                const url = buildFeedbackIssueUrl(FEEDBACK_REPO, feedbackInput);
                window.open(url, '_blank', 'noopener');
              }
            },
            (reason) => button.showError(reason),
          );
        },
        onCancel: () => {
          preview.close();
          openPreview = null;
        },
      });
      openPreview = preview;
    }

    let lastScan = '';
    function sync() {
      // childList changes on heavy pages fire this at ~2Hz; skip the full rescan when the
      // control set and mounted anchors are unchanged.
      const sig = Array.from(document.querySelectorAll('input, select'), (el) => {
        const input = el as HTMLInputElement;
        return `${el.tagName}:${input.type}:${input.name}:${el.id}`;
      }).join('|');
      if (sig === lastScan && [...mounted.values()].every((m) => m.anchor.isConnected)) return;
      lastScan = sig;
      const forms = detectForms(document);
      const plan = planMounts(new Map([...mounted].map(([c, m]) => [c, m.anchor])), forms);
      for (const container of plan.destroy) {
        mounted.get(container)?.handle.destroy();
        mounted.delete(container);
      }
      for (const form of plan.mount) {
        const handle = mountButton(
          form.anchor.el,
          () => void guardedRun(form.container, handle),
          (info) => {
            openPreview?.close();
            openPreview = null;
            openGuide?.close();
            openGuide = showAiGuide(
              buildGuide(info, browser),
              () => {
                openGuide = null;
              },
              () => void chrome.runtime.sendMessage({ type: 'open-options' }),
            );
          },
        );
        mounted.set(form.container, { handle, anchor: form.anchor.el });
        void getAiStatusViaBackground().then((s) => handle.setStatus(s));
      }
      mounted.forEach((m) => m.handle.reposition());
    }

    // Triggered by the action popup's "AI で分析" button: runs the same flow as
    // the in-page button on the first detected form, reusing its handle so
    // errors surface the same way. No form mounted means nothing to fill.
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (typeof msg !== 'object' || msg === null || (msg as { type?: unknown }).type !== ANALYZE_MESSAGE_TYPE) {
        return false;
      }
      const first = detectForms(document)[0];
      const entry = first ? mounted.get(first.container) : undefined;
      if (!first || !entry) {
        sendResponse({ ok: false, reason: 'no-form' });
        return false;
      }
      void guardedRun(first.container, entry.handle).then(
        (started) => sendResponse(started ? { ok: true } : { ok: false, reason: 'error' }),
        () => sendResponse({ ok: false, reason: 'error' }),
      );
      return true;
    });

    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 500);
    };
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    const repositionAll = () => mounted.forEach((m) => m.handle.reposition());
    window.addEventListener('resize', repositionAll);
    window.addEventListener('load', repositionAll);
  },
});
