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

export interface RadioFillOption {
  value: string;
  disabled: boolean;
  fill(value: string): void;
}

// One fillable field as the fill module sees it: liveness facts as getters so
// a page that changed between planning and applying is read at fill time, and
// radio dispatch internalized (the caller never chooses option vs element).
export interface FillTarget {
  readonly connected: boolean;
  readonly empty: boolean;
  readonly radioOptions?: readonly RadioFillOption[];
  fill(value: string): void;
}

export type FillResult = 'filled' | 'skipped-status' | 'missing-target' | 'detached' | 'already-filled' | 'no-option';

export interface FillOutcome {
  fieldId: string;
  result: FillResult;
}

// Single owner of fill ordering, guards, radio resolution, and dispatch: the
// plan goes in, per-field outcomes come out. The native-setter discipline
// stays behind the fill callbacks, never in caller branches.
export function fillPlan(plan: PlanItem[], targets: Map<string, FillTarget>): FillOutcome[] {
  const ordered = [
    ...plan.filter((p) => !LAST_CATEGORIES.has(p.category)),
    ...plan.filter((p) => LAST_CATEGORIES.has(p.category)),
  ];
  const out: FillOutcome[] = [];
  for (const p of ordered) {
    if (p.status !== 'ok') {
      out.push({ fieldId: p.fieldId, result: 'skipped-status' });
      continue;
    }
    const target = targets.get(p.fieldId);
    if (!target) {
      out.push({ fieldId: p.fieldId, result: 'missing-target' });
      continue;
    }
    if (!target.connected) {
      out.push({ fieldId: p.fieldId, result: 'detached' });
      continue;
    }
    if (!target.empty) {
      out.push({ fieldId: p.fieldId, result: 'already-filled' });
      continue;
    }
    if (target.radioOptions) {
      const option = target.radioOptions.find((r) => r.value === p.value && !r.disabled);
      if (!option) {
        out.push({ fieldId: p.fieldId, result: 'no-option' });
        continue;
      }
      option.fill(p.value);
      out.push({ fieldId: p.fieldId, result: 'filled' });
      continue;
    }
    target.fill(p.value);
    out.push({ fieldId: p.fieldId, result: 'filled' });
  }
  return out;
}

// DOM binding for fillPlan: snapshots the control map into targets. Reads stay
// live through getters; the fill closures keep the prototype-setter discipline
// of fillField (never a plain assignment, for React/Vue trackers).
export function targetsFromControls(
  byId: Map<string, { el: Control; radioInputs?: HTMLInputElement[] }>,
  fill: (el: Control, value: string) => void,
): Map<string, FillTarget> {
  const targets = new Map<string, FillTarget>();
  for (const [id, t] of byId) {
    const { el, radioInputs } = t;
    targets.set(id, {
      get connected() { return el.isConnected; },
      get empty() { return isStillEmpty(el, radioInputs); },
      ...(radioInputs
        ? { radioOptions: radioInputs.map((r) => ({ value: r.value, disabled: r.disabled, fill: (v: string) => fill(r, v) })) }
        : {}),
      fill: (value: string) => fill(el, value),
    });
  }
  return targets;
}
