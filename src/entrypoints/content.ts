import { classifyAll } from '../analyze';
import { buildPlan, type PlanItem } from '../core/planner';
import { applyPlan } from '../dom/apply-plan';
import { detectForms, scanContainer } from '../dom/detect-forms';
import { fillField } from '../dom/fill';
import { checkAiStatus, getLanguageModel, startDownload } from '../llm/availability';
import { PromptApiClassifier } from '../llm/classifier';
import { isReady, loadData } from '../storage';
import { mountButton, type ButtonHandle } from '../ui/button';
import { showPreview, type PreviewHandle, type PreviewRow } from '../ui/preview';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const mounted = new Map<Element, ButtonHandle>();
    let openPreview: PreviewHandle | null = null;

    async function run(container: Element, button: ButtonHandle) {
      const data = await loadData();
      if (!isReady(data)) {
        void chrome.runtime.sendMessage({ type: 'open-options' });
        return;
      }

      const lm = getLanguageModel();
      const status = await checkAiStatus(lm);
      button.setStatus(status);
      if (lm && status === 'downloadable') void startDownload(lm);
      const classifier = lm && status === 'available' ? new PromptApiClassifier(lm) : null;

      const fields = scanContainer(container, document);
      const byId = new Map(fields.map((f) => [f.meta.id, f]));
      const items = await classifyAll(fields.map((f) => f.meta), classifier);

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
        const handle = mountButton(form.fields[0]!.el, () => void run(form.container, handle));
        mounted.set(form.container, handle);
        void checkAiStatus().then((s) => handle.setStatus(s));
      }
    }

    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 500);
    };
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', () => mounted.forEach((h) => h.reposition()));
  },
});
