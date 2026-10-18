import { FILL_LAST_CATEGORIES } from '../core/fill-order';
import { isUntouchedSelect, type PlanItem, type PlanStatus } from '../core/planner';
import type { Control } from './scan-fields';

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
  readonly connected: boolean;
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

// Single source of the FillResult vocabulary: the type below is derived from
// this array, so adding a result without listing it here is a compile error,
// not a silent accounting gap.
const FILL_RESULTS = [
  'filled',
  'skipped-status',
  'missing-target',
  'detached',
  'already-filled',
  'no-option',
  'error',
] as const;

export type FillResult = (typeof FILL_RESULTS)[number];

export interface FillOutcome {
  fieldId: string;
  result: FillResult;
}

// Countable summary of fillPlan outcomes: how many fields were
// applied, how many need attention (by-design skips excluded), and the
// breakdown by reason, so partial/non application is visible without
// changing the fill guards themselves.
export interface FillSummary {
  filled: number;
  unapplied: number;
  total: number;
  byResult: Record<FillResult, number>;
}

// Correspondence table, plan to outcome: rows the planner already marked as
// not-to-fill map to a single by-design result. Adding a PlanStatus without an
// entry here is a compile error, not a silent accounting gap.
const PLAN_STATUS_RESULT: Record<Exclude<PlanStatus, 'ok'>, FillResult> = {
  filled: 'skipped-status',
  'warn-maxlength': 'skipped-status',
  'warn-no-option': 'skipped-status',
  'warn-no-value': 'skipped-status',
};

// By-design outcomes that must not raise the partial-application warning:
// the plan already marked the row as not-to-fill, or the field left the
// empty state through the user's own action before applying.
const BY_DESIGN_RESULTS: ReadonlySet<FillResult> = new Set<FillResult>([
  'skipped-status',
  'already-filled',
]);

export function summarizeFillOutcomes(outcomes: FillOutcome[]): FillSummary {
  const byResult = Object.fromEntries(FILL_RESULTS.map((r) => [r, 0])) as Record<FillResult, number>;
  for (const o of outcomes) byResult[o.result] += 1;
  const unapplied = outcomes.filter((o) => o.result !== 'filled' && !BY_DESIGN_RESULTS.has(o.result)).length;
  return { filled: byResult.filled, unapplied, total: outcomes.length, byResult };
}

// The single report behind one fill run: the ordered outcomes, the same
// outcomes keyed by field id (order-independent access; callers must not zip
// the array with the plan by index), and the derived summary. This is the one
// Module behind the whole "what happened during apply" concept: vocabulary,
// counting, warning decision, and per-field lookup live here, not across
// session/content callers.
export interface FillReport {
  outcomes: FillOutcome[];
  // One entry per field id; ids are unique per scan (`jai-N`), so a later
  // duplicate would collapse here. Keep producers unique.
  byId: Map<string, FillResult>;
  summary: FillSummary;
}

// Warning decision in one call: by-design skips never warn, true failures do.
// Callers branch on this instead of re-implementing the exclusion.
export function shouldWarn(summary: FillSummary): boolean {
  return summary.unapplied > 0;
}

// Single owner of fill ordering, guards, radio resolution, and dispatch: the
// plan goes in, one report comes out. The native-setter discipline stays
// behind the fill callbacks, never in caller branches.
export function fillPlan(plan: PlanItem[], targets: Map<string, FillTarget>): FillReport {
  const ordered = [
    ...plan.filter((p) => !FILL_LAST_CATEGORIES.has(p.category)),
    ...plan.filter((p) => FILL_LAST_CATEGORIES.has(p.category)),
  ];
  const out: FillOutcome[] = [];
  for (const p of ordered) {
    // One misbehaving field (a throwing getter or fill callback) must not
    // abort the remaining fields or lose their outcomes: isolate per field.
    // Caught errors surface as 'error' outcomes (and in the debug record),
    // never silently: an all-error summary still raises the banner.
    try {
      out.push(applyOne(p, targets));
    } catch (e) {
      console.debug('[JushoAI] fill field error', p.fieldId, e);
      out.push({ fieldId: p.fieldId, result: 'error' });
    }
  }
  return {
    outcomes: out,
    byId: new Map(out.map((o) => [o.fieldId, o.result])),
    summary: summarizeFillOutcomes(out),
  };
}

function applyOne(p: PlanItem, targets: Map<string, FillTarget>): FillOutcome {
    if (p.status !== 'ok') {
      return { fieldId: p.fieldId, result: PLAN_STATUS_RESULT[p.status] };
    }
    const target = targets.get(p.fieldId);
    if (!target) {
      return { fieldId: p.fieldId, result: 'missing-target' };
    }
    if (!target.connected) {
      return { fieldId: p.fieldId, result: 'detached' };
    }
    if (!target.empty) {
      return { fieldId: p.fieldId, result: 'already-filled' };
    }
    if (target.radioOptions) {
      const same = target.radioOptions.filter((r) => r.value === p.value);
      // No match, or every match disabled, keeps the historical 'no-option'.
      if (same.every((r) => r.disabled)) {
        return { fieldId: p.fieldId, result: 'no-option' };
      }
      // Prefer a live option when values collide: the snapshot list can hold a
      // detached node while a page rewrite already mounted its replacement.
      const live = same.find((r) => !r.disabled && r.connected);
      // The option list is a snapshot: a page rewrite between planning and
      // applying can detach the single matching node while the group anchor
      // stays connected. Writing into it would report success for nothing.
      if (!live) {
        return { fieldId: p.fieldId, result: 'detached' };
      }
      live.fill(p.value);
      return { fieldId: p.fieldId, result: 'filled' };
    }
    target.fill(p.value);
    return { fieldId: p.fieldId, result: 'filled' };
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
        // value/disabled stay live through getters like connected/empty above:
        // a page script that disables or swaps a radio option between planning
        // and applying must be read at fill time, not at snapshot time. The
        // same holds for connectedness: a detached option must never report
        // success.
        ? {
            radioOptions: radioInputs.map((r) => ({
              get value() { return r.value; },
              get disabled() { return r.disabled; },
              get connected() { return r.isConnected; },
              fill: (v: string) => fill(r, v),
            })),
          }
        : {}),
      fill: (value: string) => fill(el, value),
    });
  }
  return targets;
}
