import { classifyAll } from '../core/analyze';
import type { Item } from '../core/classify-rules';
import { buildPlan, type PlanItem } from '../core/planner';
import { applyPlan } from '../dom/apply-plan';
import { planMounts } from '../dom/mount-plan';
import { detectForms, scanContainer } from '../dom/detect-forms';
import { fillField } from '../dom/fill';
import { BackgroundClassifier, getAiStatusViaBackground, requestDownloadViaBackground } from '../llm/background-gateway';
import { buildFeedbackIssueUrl, FEEDBACK_REPO, type FeedbackSnapshot } from '../feedback/issue-url';
import { isReady, loadData, loadLastUsed, resolveLastId, saveLastUsed } from '../storage';
import { detectBrowser } from '../llm/browser-support';
import { buildGuide, showAiGuide, type GuideHandle } from '../ui/ai-guide';
import { mountButton, type ButtonHandle } from '../ui/button';
import { showPreview, type PreviewHandle, type PreviewRow } from '../ui/preview';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const mounted = new Map<Element, { handle: ButtonHandle; anchor: Element }>();
    const running = new Set<Element>();
    let openPreview: PreviewHandle | null = null;
    let openGuide: GuideHandle | null = null;
    const browser = detectBrowser(navigator.userAgent);

    async function guardedRun(container: Element, button: ButtonHandle) {
      if (running.has(container)) return;
      running.add(container);
      try {
        await run(container, button);
      } catch {
        // Typically "Extension context invalidated" after the extension was updated.
        button.showError('エラー: ページを再読み込み');
      } finally {
        running.delete(container);
      }
    }

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
      let items = await classifyAll(metas, classifier);
      void getAiStatusViaBackground().then((i) => button.setStatus(i));
      const snapshot = (list: Item[]): Map<string, FeedbackSnapshot> =>
        new Map(list.map((i) => [i.meta.id, { category: i.cls.category, source: i.cls.source }]));
      const beforeItems = snapshot(items);
      let afterItems: Map<string, FeedbackSnapshot> | null = null;

      let profileId = resolveLastId(last.profileId, data.profiles.map((p) => p.id)) ?? data.profiles[0]!.id;
      let addressId = resolveLastId(last.addressId, data.addresses.map((a) => a.id)) ?? data.addresses[0]!.id;
      let plan: PlanItem[] = [];
      const replan = (): PreviewRow[] => {
        const profile = data.profiles.find((p) => p.id === profileId) ?? data.profiles[0]!;
        const address = data.addresses.find((a) => a.id === addressId) ?? null;
        plan = buildPlan(items, { profile, address });
        return plan.map((p) => {
          const m = byId.get(p.fieldId)!.meta;
          return {
            label: m.label || m.nearby || m.placeholder || m.name || m.htmlId,
            display: p.display,
            status: p.status,
            source: p.source,
          };
        });
      };

      async function reanalyze() {
        if (!classifier) return;
        items = await classifyAll(metas, classifier, { force: true });
        afterItems = snapshot(items);
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
          preview.setRows(replan());
        },
        onAddressChange: (id) => {
          addressId = id;
          preview.setRows(replan());
        },
        onApply: (sendFeedback) => {
          void saveLastUsed({ profileId, addressId });
          applyPlan(plan, byId, fillField);
          preview.close();
          openPreview = null;
          if (sendFeedback && afterItems) {
            const url = buildFeedbackIssueUrl(FEEDBACK_REPO, {
              pageHref: location.href,
              provider: info.provider,
              version: chrome.runtime.getManifest().version,
              before: beforeItems,
              after: afterItems,
              fields: metas,
            });
            window.open(url, '_blank', 'noopener');
          }
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
