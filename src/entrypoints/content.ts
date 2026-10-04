import { classifyAll } from '../analyze';
import { buildPlan, type PlanItem } from '../core/planner';
import { applyPlan } from '../dom/apply-plan';
import { detectForms, scanContainer } from '../dom/detect-forms';
import { fillField } from '../dom/fill';
import { BackgroundClassifier, getAiStatusViaBackground, requestDownloadViaBackground } from '../llm/background-gateway';
import { isReady, loadData } from '../storage';
import { detectBrowser } from '../llm/browser-support';
import { buildGuide, showAiGuide, type GuideHandle } from '../ui/ai-guide';
import { mountButton, type ButtonHandle } from '../ui/button';
import { showPreview, type PreviewHandle, type PreviewRow } from '../ui/preview';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const mounted = new Map<Element, ButtonHandle>();
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
      const data = await loadData();
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
      const items = await classifyAll(fields.map((f) => f.meta), classifier);
      void getAiStatusViaBackground().then((i) => button.setStatus(i));

      let addressId = data.addresses[0]!.id;
      let plan: PlanItem[] = [];
      const replan = (): PreviewRow[] => {
        const address = data.addresses.find((a) => a.id === addressId) ?? null;
        plan = buildPlan(items, { profile: data.profile, address });
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

      openPreview?.close();
      const preview = showPreview({
        rows: replan(),
        addresses: data.addresses,
        selectedAddressId: addressId,
        onAddressChange: (id) => {
          addressId = id;
          preview.setRows(replan());
        },
        onApply: () => {
          applyPlan(plan, byId, fillField);
          preview.close();
          openPreview = null;
        },
        onCancel: () => {
          preview.close();
          openPreview = null;
        },
      });
      openPreview = preview;
    }

    function sync() {
      const forms = detectForms(document);
      const live = new Set(forms.map((f) => f.container));
      for (const [container, handle] of mounted) {
        if (!live.has(container) || !container.isConnected) {
          handle.destroy();
          mounted.delete(container);
        }
      }
      for (const form of forms) {
        if (mounted.has(form.container)) continue;
        const handle = mountButton(
          form.anchor.el,
          () => void guardedRun(form.container, handle),
          (info) => {
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
        mounted.set(form.container, handle);
        void getAiStatusViaBackground().then((s) => handle.setStatus(s));
      }
      mounted.forEach((h) => h.reposition());
    }

    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 500);
    };
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    const repositionAll = () => mounted.forEach((h) => h.reposition());
    window.addEventListener('resize', repositionAll);
    window.addEventListener('load', repositionAll);
  },
});
