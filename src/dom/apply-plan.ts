import { isUntouchedSelect, type PlanItem } from '../core/planner';
import type { Control } from './scan-fields';

// Many Japanese forms rewrite prefecture/city/street asynchronously from the zip field's
// change event, so zip fields go last to avoid being overwritten by that lookup.
const LAST_CATEGORIES = new Set(['zip', 'zip1', 'zip2']);

function isStillEmpty(el: Control, radioInputs?: HTMLInputElement[]): boolean {
  if (radioInputs) return !radioInputs.some((r) => r.checked);
  if (el instanceof HTMLSelectElement) {
    const first = el.options[0];
    return isUntouchedSelect({
      value: el.value,
      options: first ? [{ value: first.value, text: first.text }] : [],
    });
  }
  return el.value.trim() === '';
}

export function applyPlan(
  plan: PlanItem[],
  byId: Map<string, { el: Control; radioInputs?: HTMLInputElement[] }>,
  fill: (el: Control, value: string) => void,
): void {
  const ordered = [
    ...plan.filter((p) => !LAST_CATEGORIES.has(p.category)),
    ...plan.filter((p) => LAST_CATEGORIES.has(p.category)),
  ];
  for (const p of ordered) {
    if (p.status !== 'ok') continue;
    const target = byId.get(p.fieldId);
    if (!target || !target.el.isConnected || !isStillEmpty(target.el, target.radioInputs)) continue;
    if (target.radioInputs) {
      const option = target.radioInputs.find((r) => r.value === p.value && !r.disabled);
      if (!option) continue;
      fill(option, p.value);
      continue;
    }
    fill(target.el, p.value);
  }
}
