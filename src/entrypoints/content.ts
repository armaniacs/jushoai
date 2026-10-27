import { isExcludedUrl } from '../core/exclusions';
import { isEnglishPageText } from '../core/page-language';
import { fillOneReasonLabel } from '../core/fill-one';
import { fillOneEntry } from '../content/fill-one-entry';
import { loadFillOneState, loadRunState } from '../content/flow-state';
import { createFillSession, classifyWithReason } from '../content-session';
import { bindPreview } from '../content/preview-bind';
import { KvStoreReadError } from '../kv-store';
import { EXCLUDED_URLS_KEY, loadExcludedUrls } from '../exclusions-store';
import { fillPlan, targetsFromControls } from '../dom/fill-plan';
import { collectAvoidRects } from '../dom/avoid-rects';
import { planMounts } from '../dom/mount-plan';
import { detectForms, scanContainer } from '../dom/detect-forms';
import { scanFields } from '../dom/scan-fields';
import { fillField } from '../dom/fill';
import { draftFromMetas } from '../core/import-draft';
import { fieldKeyFor, hostOf, applyMapping } from '../core/domain-mapping';
import { upsertMapping } from '../mapping-store';
import { chooseMapping } from '../ui/mapping-panel';
import { matches, recordFor } from '../core/site-approval';
import { assignedFirst, assignmentFor } from '../core/site-profile';
import { mergeCarryover } from '../core/carryover';
import { upsertApproval } from '../approval-store';
import { upsertAssignment } from '../assignment-store';
import { IMPORT_DRAFT_MESSAGE_TYPE } from '../import-message';
import { guestProfile, guestAddress, type GuestValues } from '../core/guest';
import { GUEST_MESSAGE_TYPE } from '../guest-message';
import { confirmGuest } from '../ui/guest-panel';
import type { FieldMeta } from '../core/types';
import { egressRowsFor } from '../ai/egress-preview';
import { confirmEgress } from '../ui/egress-panel';
import { mergeLlmSkip, planEgress, shouldDisableClassifier } from '../core/egress-plan';
import { confirmFillOne, showFillOneBlocked } from '../ui/fill-one-panel';
import { FILL_ONE_MESSAGE } from '../context-menu';
import { BackgroundClassifier, getAiStatusViaBackground, requestDownloadViaBackground } from '../llm/background-gateway';
import { hintForButton } from '../ai/failure-text';
import type { ClassifyFailure } from '../messages';
import { isReady, saveLastUsed } from '../storage';
import { detectBrowser } from '../llm/browser-support';
import { buildGuide, showAiGuide, type GuideHandle } from '../ui/ai-guide';
import { mountButton, type ButtonHandle } from '../ui/button';
import { attachRepositionTracking } from '../ui/panel';
import { type PreviewHandle } from '../ui/preview';
import { ANALYZE_MESSAGE_TYPE } from '../analyze-contract';
import { applyIfConsented, defaultConsentCheckDeps } from '../content/consent-check';
import { createExclusionGate } from '../content/exclusion-gate';
import { createTabDispatcher } from '../content/tab-dispatch';
import { persistWrite } from '../content/persist-write';

// --- PBI-21: sync prefilter -------------------------------------------------
// sync() is debounced off the MutationObserver, but even a skipped sync pays a
// full-document querySelectorAll to build its signature. This prefilter drops
// clearly irrelevant batches before they even reset the debounce timer, using
// only the mutation records (no DOM scan). Anything ambiguous is treated as
// relevant so detection behavior never changes; the signature check inside
// sync() stays as the second layer.

// Nodes whose presence can change the scan or the rule verdict: controls
// themselves plus every label source scan-fields reads (label text,
// aria-label/ledby targets, fieldset legends, option text).
const INTERESTING_SELECTOR = 'input, select, label, fieldset, legend, option, textarea';

// Attributes mirrored into the FieldMeta snapshot. Class/style/data churn on
// unrelated elements (the bulk of heavy-page mutations) matches none of these.
const RECLASSIFY_ATTRS = new Set([
  'type', 'name', 'id', 'autocomplete', 'placeholder', 'pattern',
  'maxlength', 'disabled', 'readonly', 'checked', 'selected',
  'aria-label', 'aria-labelledby', 'for', 'data-fieldset-label',
]);

// Minimal structural view of a MutationRecord: real records satisfy it, and
// unit tests can build fakes without a full DOM.
export interface PrefilterNode {
  nodeType: number;
  matches?: (selector: string) => boolean;
  querySelector?: (selector: string) => Element | null;
}

export interface PrefilterMutation {
  type: string;
  attributeName?: string | null;
  target: PrefilterNode;
  addedNodes?: ArrayLike<PrefilterNode>;
  removedNodes?: ArrayLike<PrefilterNode>;
}

function nodeTouchesControls(node: PrefilterNode): boolean {
  // A non-element node (e.g. a text node spliced into a label) can still move
  // the label text the rules read, so only element nodes can be cleared.
  if (node.nodeType !== 1) return true;
  if (node.matches?.(INTERESTING_SELECTOR)) return true;
  return node.querySelector?.(INTERESTING_SELECTOR) != null;
}

export function isRelevantMutation(m: PrefilterMutation): boolean {
  if (m.type === 'childList') {
    const added = m.addedNodes ? Array.from(m.addedNodes) : [];
    const removed = m.removedNodes ? Array.from(m.removedNodes) : [];
    // An empty childList record carries no change; anything else must contain
    // at least one interesting node to matter.
    if (added.length === 0 && removed.length === 0) return false;
    return [...added, ...removed].some(nodeTouchesControls);
  }
  if (m.type === 'attributes') {
    const t = m.target;
    if (t.nodeType !== 1 || !t.matches) return true;
    if (t.matches('input, select, textarea')) {
      return m.attributeName == null || RECLASSIFY_ATTRS.has(m.attributeName);
    }
    // Label-source edits (a label's `for`, a legend move) feed classification.
    if (t.matches('label, fieldset, legend, option')) return true;
    return false;
  }
  // characterData (label text edits) and unknown record kinds stay relevant:
  // the signature check inside sync() still dedupes them when nothing changed.
  return true;
}

// An empty batch (the initial start() call) always syncs; otherwise at least
// one record must be relevant. Accepts real MutationRecord[] structurally.
export function shouldSyncForMutations(records: readonly PrefilterMutation[]): boolean {
  if (records.length === 0) return true;
  return records.some(isRelevantMutation);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    const mounted = new Map<Element, { handle: ButtonHandle; anchor: Element; container: Element }>();
    const running = new Set<Element>();
    let openPreview: PreviewHandle | null = null;
    let openGuide: GuideHandle | null = null;
    // Last AI failure behind the current status (cleared on success): the
    // badge guide reads it so a failed-while-available run still points at
    // the AI判定画面の接続テスト instead of saying "available" alone.
    let lastFailure: ClassifyFailure | null = null;
    const browser = detectBrowser(navigator.userAgent);

    // Single place that tears down open panels: closing one panel must never
    // leave the other behind (they occupy the same fixed corner). Idempotent
    // closes make repeated calls safe.
    const closeOpenPanels = (): void => {
      openPreview?.close();
      openPreview = null;
      openGuide?.close();
      openGuide = null;
    };

    // Only a dead extension context calls for a reload. Every other failure
    // (classification, network, bad response) is retryable on the classify side.
    // PBI-159: the flow's state bundle reads through kv-store's typed read
    // error now, so the dead-context marker can ride the KvStoreReadError
    // cause — the same unwrap isQuotaExceededError applies to StorageSaveError.
    const isContextInvalidated = (e: unknown): boolean => {
      if (e instanceof KvStoreReadError) return isContextInvalidated(e.cause);
      const msg = e instanceof Error ? e.message : String(e);
      return msg.includes('Extension context invalidated');
    };

    // --- PBI-137: single-field entry -------------------------------------------
    // The remembered right-click target (capture-phase contextmenu) resolves
    // the context-menu entry; keyboard entries resolve the focused control.
    let lastContextTarget: Element | null = null;
    document.addEventListener('contextmenu', (e) => {
      lastContextTarget = e.target instanceof Element ? e.target : null;
    }, true);

    // --- PBI-144: one-shot guest values ----------------------------------------
    // Memory only: set by the guest panel, overlaid onto the session's
    // throwaway copies at plan time, destroyed with the tab. Never
    // chrome.storage, never the audit log, never the export/import.
    let guest: GuestValues | null = null;
    // PBI-142: the earlier page's approved values for this tab. Content-script
    // memory only — a tab close destroys it, nothing persists or is sent.
    let carryover: Record<string, string> = {};

    // Rule-only for one field: no LLM, no egress gate. The same planner
    // guards as the full preview (入力済み・readonly/disabled・maxlength超過は
    // 警告して注入しない) and the value is always confirmed in a panel first.
    // The entry is extracted (src/content/fill-one-entry.ts) so the exclusion
    // gate is checked in one place for every entry: right-click, Alt+J.
    async function fillOne(target: Element | null): Promise<void> {
      await fillOneEntry(target, {
        isExcluded: () => gate.isExcluded(),
        scan: (el) => scanFields(document.body).find(
          (f) => f.el === el || (f.radioInputs?.some((r) => r === el) ?? false),
        ) ?? null,
        load: () => loadFillOneState(),
        ready: isReady,
        carryover: () => carryover,
        domain: () => hostOf(location.href),
        onNoData: () => { void chrome.runtime.sendMessage({ type: 'open-options' }); },
        showBlocked: (label, reason) => showFillOneBlocked(label, fillOneReasonLabel(reason)),
        confirm: (label, display) => confirmFillOne(label, display),
        fill: (el, value) => fillField(el, value),
      });
    }

    // The fill is fire-and-forget, but a failure must never become an
    // unhandled rejection: the batched state read (loadFillOneState) rejects
    // with KvStoreReadError, and PBI-153 closed this gap for the writes only.
    // The report matches the persist writes (../content/persist-write); an
    // invalidated context keeps the same reload guidance the in-page button
    // shows, every other error passes through for the console.
    const reportFillOneFailure = (e: unknown): void => {
      console.warn(
        `[JushoAI] フィールド補完に失敗しました${
          isContextInvalidated(e) ? '（ページを再読み込みしてください）' : ''
        }`,
        e,
      );
    };

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        void fillOne(document.activeElement).catch(reportFillOneFailure);
      }
    }, true);

    async function guardedRun(container: Element, button: ButtonHandle): Promise<boolean> {
      if (running.has(container)) return true;
      running.add(container);
      try {
        await run(container, button);
        return true;
      } catch (e) {
        button.showError(
          isContextInvalidated(e)
            ? { kind: 'transient', text: 'エラー: ページを再読み込み' }
            : { kind: 'transient', text: 'エラー: 分類に失敗、再試行してください' },
        );
        return false;
      } finally {
        running.delete(container);
      }
    }

    // The classifier keeps working rule-only when AI fails, so surface WHY it
    // failed (set-up vs retryable) instead of leaving the user to guess.
    // Raw statuses never leave the single table in ../ai/failure-text;
    // only these coarse guidance lines do.
    async function run(container: Element, button: ButtonHandle) {
      // PBI-159: the run flow's whole state bundle comes from the one loader
      // (../content/flow-state) behind a single batched read — the profile
      // data, the last-used selection and the per-site learned state. Which
      // stores the flow needs lives there, not here.
      const { data, last, priorApprovals, assignments, activeMappings } = await loadRunState();
      // PBI-144: the guest bypasses the readiness gate — a one-shot fill needs
      // no saved profile, and the guest values overlay the (empty) stored
      // copies below. No guest and nothing saved stays the settings guidance.
      if (!isReady(data) && !guest) {
        void chrome.runtime.sendMessage({ type: 'open-options' });
        return;
      }
      // PBI-128/141/138: the taught correction layer also gates the LLM pending
      // set below, so a field the user already corrected never sends its
      // metadata.
      const priorApproval = priorApprovals[hostOf(location.href)] ?? null;

      const info = await getAiStatusViaBackground();
      button.setStatus(info);
      if (info.provider === 'built-in' && info.status === 'downloadable') {
        void requestDownloadViaBackground()
          .then(() => getAiStatusViaBackground())
          .then((s) => button.setStatus(s));
      }
      const classifier = info.status === 'available' ? new BackgroundClassifier() : null;
      // PBI-45: run() passes intent only — which classifier to use. The reason
      // binding (attempt seam {map, failureReason} → return value) and the
      // apply ordering (consent→inject→persist→feedback→display) are owned by
      // the session module via classifyWithReason; no reporting wrapper and no
      // `let failureReason` closure escape remain here (PBI-42引継ぎの解消).
      // The pending split (ACCEPT_THRESHOLD) is owned by splitPending
      // (PBI-154), so only sub-threshold fields reach the LLM and the audit
      // keeps one record per attempt.

      const fields = scanContainer(container, document);
      const byId = new Map(fields.map((f) => [f.meta.id, f]));
      const metas = fields.map((f) => f.meta);
      // PBI-124: the egress gate runs before any AI call. Rule classification
      // is local (pure), so the pending split is known before the gate without
      // any network. Suspect rows default to excluded; closing the gate
      // (Escape included) resolves as rule-only, so no choice means no send.
      let effectiveClassifier = classifier;
      // PBI-145: the gate's pending list and the actual send come from the
      // same split (splitPending, PBI-154), so the gate shows exactly what
      // classifyAll will send and a taught field's metadata never reaches
      // the LLM.
      let llmSkip: ReadonlySet<string> | undefined;
      {
        const taught = new Set(
          activeMappings.filter((e) => e.domain === hostOf(location.href)).map((e) => e.fieldKey),
        );
        const plan = planEgress(metas, taught);
        llmSkip = plan.taughtIds.size > 0 ? plan.taughtIds : undefined;
        if (classifier && plan.pending.length > 0) {
          closeOpenPanels();
          const decision = await confirmEgress(egressRowsFor(plan.pending));
          if (decision.mode === 'rule-only') {
            effectiveClassifier = null;
          } else {
            const unchecked = plan.pending.map((m) => m.id).filter((id) => !decision.send.has(id));
            llmSkip = mergeLlmSkip(plan.taughtIds, unchecked);
            if (shouldDisableClassifier(llmSkip, plan.nonConfidentCount)) effectiveClassifier = null;
          }
        }
      }
      const englishPage = isEnglishPageText(document.body?.innerText ?? '');
      const metasById = new Map(fields.map((f) => [f.meta.id, f.meta]));
      // PBI-55: the same context feeds the apply-time feedback and the
      // post-apply breakdown report, so the report URL cannot drift from it.
      const feedbackCtx = () => ({
        pageHref: location.href,
        provider: info.provider,
        version: chrome.runtime.getManifest().version,
      });
      const openFeedbackUrl = (url: string): void => { window.open(url, '_blank', 'noopener'); };
      // PBI-144: the guest REPLACES the stored data for that fill — stored and
      // guest values never mix, so the preview shows exactly what will fill.
      // The stored arrays are never mutated, so chrome.storage stays untouched
      // and the overlay dies with the tab.
      const activeGuest = guest;
      // PBI-141: the assigned profile becomes the first candidate. A guest fill
      // has a single profile and no assignment.
      const assignedProfileId = activeGuest
        ? null
        : assignmentFor(location.href, assignments, data.profiles.map((p) => p.id));
      const sessionProfiles = activeGuest
        ? [guestProfile(activeGuest)]
        : assignedFirst(data.profiles, assignedProfileId);
      const sessionAddresses = activeGuest ? [guestAddress(activeGuest)] : data.addresses;
      const session = createFillSession(
        {
          profiles: sessionProfiles,
          addresses: sessionAddresses,          lastProfileId: last.profileId,
          lastAddressId: last.addressId,
          assignedProfileId,
          carryover,
          metas,
          metasById,
          englishPage,
          canReanalyze: effectiveClassifier !== null,
        },
        {
          // PBI-138: the taught mapping rides as a correction layer on top of
          // whatever classification path ran — the learned pair wins over the
          // rule, and an excluded page never gets here (the session returns
          // excluded before opening any panel).
          classify: (ms, opts) =>
            classifyWithReason(effectiveClassifier, ms, { ...opts, llmSkip }).then((res) => ({
              ...res,
              items: applyMapping(res.items, activeMappings, hostOf(location.href)),
            })),
          checkConsent: (p) => {
            let verdict: { ok: true } | { ok: false; reason: string } = { ok: false, reason: '' };
            // applyIfConsented reports through callbacks; the no-op apply keeps the
            // check side-effect free while reusing the single consent vocabulary.
            applyIfConsented(
              defaultConsentCheckDeps(() => p.getApplyPoint(), undefined, () => p.getHost()),
              () => { verdict = { ok: true }; },
              (reason) => { verdict = { ok: false, reason }; },
            );
            return verdict;
          },
          injectPlan: (plan) => {
            const report = fillPlan(plan, targetsFromControls(byId, fillField));
            // Developer record (PBI-82/94): countable breakdown by reason.
            // Display decisions stay with onApply so the partial banner cannot
            // clobber the AI failure hint; the happy path stays silent.
            console.debug('[JushoAI] fill outcomes', report.summary);
            return report;
          },
          // PBI-153: a failed write is reported instead of becoming an
          // unhandled rejection; the typed error keeps it identifiable.
          persistSelection: (sel) => { persistWrite('最終使用状態', () => saveLastUsed(sel)); },
          openUrl: openFeedbackUrl,
          feedbackContext: feedbackCtx,
          isExcluded: () => gate.isExcluded(),
          // PBI-142: the filled values merge into this tab's carryover, so the
          // next page re-offers them. Tab-scoped memory only — never storage.
          recordCarryover: (entries) => {
            carryover = mergeCarryover(carryover, entries);
          },
        },
      );
      const started = await session.start();
      if (started.failureReason) {
        lastFailure = started.failureReason;
        button.showError({ kind: 'transient', text: hintForButton(started.failureReason) });
      } else {
        lastFailure = null;
      }
      void getAiStatusViaBackground().then((i) => button.setStatus(i));

      // Preview and guide occupy the same fixed corner; opening one must close the other.
      closeOpenPanels();
      // Classification takes long enough for the settings to change under it; an
      // exclusion that landed meanwhile must not open a panel on this page.
      if (started.excluded) return;
      // PBI-64: the preview wiring (reanalyze/switch/apply/cancel) lives in
      // bindPreview; run() keeps classification, the panel-open decision, and
      // the exclusion guard above.
      const preview = bindPreview({
        session,
        button,
        rows: started.rows,
        addresses: sessionAddresses,
        profiles: sessionProfiles,
        reanalyzable: effectiveClassifier !== null,
        feedbackContext: feedbackCtx,
        openFeedbackUrl,
        onClosed: () => { openPreview = null; },
        onFailure: (reason) => { lastFailure = reason; },
        // PBI-138: the 分類を直す flow. The correction runs through the session
        // (rule-only re-plan) and the learned pair persists only when the user
        // approved remembering it. The stored pair is a field signature →
        // category, never a profile or correction value.
        onFix: (fieldId, label, panel) => {
          void chooseMapping(label, session.categoryFor(fieldId)).then((decision) => {
            if (!decision) return;
            panel.setRows(session.recategorize(fieldId, decision.category));
            if (!decision.remember) return;
            // PBI-153: the IIFE's `void` used to let a failed write surface as
            // an unhandled rejection; persistWrite reports it instead.
            persistWrite('覚えた対応付け', async () => {
              const meta = metas.find((m) => m.id === fieldId);
              const fieldKey = meta ? fieldKeyFor(meta) : null;
              if (!fieldKey) return;
              await upsertMapping({ domain: hostOf(location.href), fieldKey, category: decision.category });
            });
          });
        },
        // PBI-128: the per-site approval memory. A record for this host with
        // the same form shape and selection shortens the preview to the
        // changed rows; a clean apply records the shape (digests only — no
        // raw profile value, no raw label).
        approval: matches(priorApproval, location.href, metas, session.selectedProfileId, session.selectedAddressId)
          ? priorApproval
          : null,
        recordApproval: (rows) => {
          // PBI-153: reported through persistWrite instead of an unhandled
          // rejection inside the `void` IIFE.
          persistWrite('サイトごとの承認', async () => {
            const record = recordFor(location.href, metas, rows, session.selectedProfileId, session.selectedAddressId);
            if (!record.domain) return;
            await upsertApproval(record);
          });
        },
        // PBI-141: the profile used on this host is learned from use. Only the
        // host → profileId pair persists — never a profile value.
        recordAssignment: (profileId) => {
          // PBI-153: reported through persistWrite instead of an unhandled
          // rejection from the bare `void`.
          persistWrite('サイトごとの割当て', () => upsertAssignment(hostOf(location.href), profileId));
        },
        // PBI-144: the guest is one-shot — the fill consumes it. Without this
        // the closure would keep overlaying the stored data for every later
        // press on the same tab (BDD: タブを閉じるか完了する→破棄).
        onApplied: () => {
          if (activeGuest) guest = null;
        },
      });
      openPreview = preview;
    }

    let lastScan = '';
    function sync() {
      // A history-API route can move into an excluded path without a reload, so
      // the URL is re-evaluated on every scan. Leaving an excluded path is
      // handled by the settings message or by a reload: the script is stopped by
      // design while the exclusion holds.
      if (isExcludedUrl(window.location.href, gate.entries())) {
        gate.recheck();
        return;
      }
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
            closeOpenPanels();
            openGuide = showAiGuide(
              buildGuide(info, browser, lastFailure),
              () => {
                openGuide = null;
              },
              () => void chrome.runtime.sendMessage({ type: 'open-options' }),
            );
          },
        );
        mounted.set(form.container, { handle, anchor: form.anchor.el, container: form.container });
        void getAiStatusViaBackground().then((s) => handle.setStatus(s));
      }
      // PBI-161: the blockers are re-collected per scan and cached in
      // document coordinates; reposition() converts them to viewport space,
      // so scrolling stays a conversion instead of a fresh sweep.
      mounted.forEach((m) => {
        m.handle.setAvoids(collectAvoidRects(m.container, document));
        m.handle.reposition();
      });
    }

    // PBI-156: one guarded dispatcher registers every tab-bound message. The
    // type guard, the exclusion gate (after the type guard, before the body),
    // and the response plumbing live in ../content/tab-dispatch, so a new
    // listener cannot re-copy them.
    const registerTabMessage = createTabDispatcher({
      isExcluded: () => gate.isExcluded(),
      addListener: (fn) => chrome.runtime.onMessage.addListener(fn),
    });

    // Triggered by the action popup's "AI で分析" button: runs the same flow as
    // the in-page button on the first detected form, reusing its handle so
    // errors surface the same way. No form mounted means nothing to fill.
    registerTabMessage(ANALYZE_MESSAGE_TYPE, {
      excludedResponse: { ok: false, reason: 'no-form' },
      handler: (_msg, sendResponse) => {
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
      },
    });

    // PBI-127: the settings page's フォームから取り込む button asks the active
    // tab for a draft of the page's own filled values. Rule-only
    // (draftFromMetas: the classifyRulePipeline entrance, PBI-150 — resolveKana
    // rides so a filled furigana pair reaches the kana profile keys), no LLM
    // and no gate: the values stay on-device and never cross the network. An
    // excluded page keeps its opt-out — no draft from there.
    registerTabMessage(IMPORT_DRAFT_MESSAGE_TYPE, {
      handler: (_msg, sendResponse) => {
        const form = detectForms(document)[0];
        if (!form) {
          sendResponse({ ok: false });
          return false;
        }
        const scanned = scanContainer(form.container, document);
        sendResponse({ ok: true, draft: draftFromMetas(scanned.map((f) => f.meta)) });
        return false;
      },
    });

    // PBI-144: the popup's ゲストで入力 button asks the tab to open the one-shot
    // entry panel. The typed values stay in this script's memory (the tab close
    // destroys them): never chrome.storage, never the audit log, never the
    // export/import. An excluded page keeps its opt-out.
    registerTabMessage(GUEST_MESSAGE_TYPE, {
      handler: (_msg, sendResponse) => {
        sendResponse({ ok: true });
        void confirmGuest().then((decision) => {
          if (!decision) return;
          guest = decision;
          closeOpenPanels();
          const first = detectForms(document)[0];
          const entry = first ? mounted.get(first.container) : undefined;
          if (first && entry) void guardedRun(first.container, entry.handle);
        });
        return false;
      },
    });

    // PBI-137: the context-menu entry fills the remembered (or focused) field.
    // The handler is fire-and-forget and returns false, so the response
    // channel closes immediately — an excluded page now receives the default
    // { ok: false } instead of the old no-response. The exclusion check inside
    // fillOneEntry stays: the Alt+J path never reaches this dispatcher.
    registerTabMessage(FILL_ONE_MESSAGE.type, {
      handler: () => {
        void fillOne(lastContextTarget ?? document.activeElement).catch(reportFillOneFailure);
        return false;
      },
    });

    let observer: MutationObserver | null = null;
    let timer: number | undefined;
    let detachTracking: (() => void) | null = null;
    const schedule = (records?: readonly PrefilterMutation[]) => {
      // PBI-21: irrelevant batches (ad churn, text ticks) never reach the scan
      // or reset the debounce; the signature check in sync() stays the second
      // layer for ambiguous-but-ineffective batches.
      if (records && !shouldSyncForMutations(records)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 500);
    };

    // Everything the page can observe about JushoAI is created in start() and
    // torn down in stop(), so an exclusion can turn the whole thing off (and
    // back on) without a reload: observers, pending syncs, mounted buttons and
    // any open panel.
    const stop = () => {
      window.clearTimeout(timer);
      timer = undefined;
      observer?.disconnect();
      observer = null;
      detachTracking?.();
      detachTracking = null;
      for (const m of mounted.values()) m.handle.destroy();
      mounted.clear();
      running.clear();
      lastScan = '';
      closeOpenPanels();
    };

    const start = () => {
      if (observer) return;
      schedule();
      // attributes + characterData used to bypass sync entirely (childList
      // only): a renamed input or relabeled field never re-detected. Now the
      // prefilter admits those while attributeFilter keeps class/style churn
      // from ever producing a record.
      observer = new MutationObserver((records) => schedule(records));
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [...RECLASSIFY_ATTRS],
        characterData: true,
      });
      detachTracking = attachRepositionTracking({
        doc: document,
        win: window,
        reposition: () => mounted.forEach((m) => m.handle.reposition()),
      });
    };

    const gate = createExclusionGate({
      loadExcluded: loadExcludedUrls,
      href: () => window.location.href,
      start,
      stop,
    });

    // The settings page writes the list and every content script learns about it
    // through storage.onChanged: runtime.sendMessage does not reach content
    // scripts, and this needs no message type or per-tab send. Registered before
    // the first evaluation, so a change still arrives while this script is
    // stopped for an excluded page.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && EXCLUDED_URLS_KEY in changes) void gate.refresh();
    });

    await gate.init();
  },
});
