import { FILL_LAST_CATEGORIES } from '../core/fill-order';
import { isUntouchedSelect, type PlanItem, type PlanStatus } from '../core/planner';
import { uncheckRadio } from './fill';
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
  // PBI-132 undo surface: snapshot reads the live value for the user-edit
  // guard, restoreEmpty puts the field back to its pre-fill (empty) state
  // through the same setter discipline as fill. A field the fill module
  // filled was empty before, so the empty state IS the pre-fill value.
  snapshot(): string;
  restoreEmpty(): void;
}

// One filled field's way back (PBI-132): the filled value plus the live
// snapshot/restore closures from the target. Held in the content-script
// session's memory only — never persisted, never sent (BDD: 履歴は外部に出ない).
export interface UndoEntry {
  fieldId: string;
  value: string;
  snapshot(): string;
  restoreEmpty(): void;
}

export interface UndoReport {
  restored: string[];
  skipped: string[];
}

// One-shot inverse of a fill run: a field still holding exactly what JushoAI
// filled goes back to its empty state; a field the user edited after the fill
// is skipped, so their own input is never wiped. Readonly/disabled and
// already-filled fields never get entries in the first place (only 'filled'
// outcomes are recorded), so the undo cannot touch them.
export function undoFill(entries: UndoEntry[]): UndoReport {
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const e of entries) {
    if (e.snapshot() === e.value) {
      e.restoreEmpty();
      restored.push(e.fieldId);
    } else {
      skipped.push(e.fieldId);
    }
  }
  return { restored, skipped };
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

// Single owner of the reason vocabulary's display labels (PBI-58): the panel
// result view and the issue-report body both read from here, so a wording
// change touches one table. Unknown future keys fall back to the raw key at
// each call site, never here.
export const FILL_RESULT_LABELS: Record<FillResult, string> = {
  filled: '適用済み',
  'skipped-status': '見送り（仕様どおり）',
  'missing-target': '対象欄なし',
  detached: '欄が外れた',
  'already-filled': '入力済みのため見送り',
  'no-option': '選択肢なし',
  error: 'エラー',
};

// Single reader for the table (PBI-61): call sites never cast. Unknown
// future keys fall back to the raw key so a new reason stays visible
// instead of crashing the breakdown. The table keys are compile-checked
// (Record<FillResult, string>), so only a call-site string outside the
// vocabulary reaches the fallback.
export function fillResultLabel(result: string): string {
  return (FILL_RESULT_LABELS as Record<string, string>)[result] ?? result;
}

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
  // PBI-132: one entry per filled field, in fill order. Only 'filled'
  // outcomes get entries, so the undo surface excludes by-design skips,
  // already-filled fields, and failures by construction.
  undo: UndoEntry[];
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
  const undo: UndoEntry[] = [];
  for (const p of ordered) {
    // One misbehaving field (a throwing getter or fill callback) must not
    // abort the remaining fields or lose their outcomes: isolate per field.
    // Caught errors surface as 'error' outcomes (and in the debug record),
    // never silently: an all-error summary still raises the banner.
    try {
      const outcome = applyOne(p, targets);
      if (outcome.result === 'filled') {
        const target = targets.get(p.fieldId);
        if (target) {
          undo.push({
            fieldId: p.fieldId,
            value: p.value,
            snapshot: () => target.snapshot(),
            restoreEmpty: () => target.restoreEmpty(),
          });
        }
      }
      out.push(outcome);
    } catch (e) {
      console.debug('[JushoAI] fill field error', p.fieldId, e);
      out.push({ fieldId: p.fieldId, result: 'error' });
    }
  }
  return {
    outcomes: out,
    byId: new Map(out.map((o) => [o.fieldId, o.result])),
    summary: summarizeFillOutcomes(out),
    undo,
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
      // PBI-132 undo surface: snapshot reads the live value (the checked
      // option's value for a radio group); restoreEmpty goes back through
      // the same setter discipline as fill — '' for inputs, the untouched
      // first option for selects, uncheck for radios.
      snapshot: () => {
        if (radioInputs) return radioInputs.find((r) => r.checked)?.value ?? '';
        return el.value;
      },
      restoreEmpty: () => {
        if (radioInputs) {
          for (const r of radioInputs) {
            if (r.checked) uncheckRadio(r);
          }
          return;
        }
        if (el instanceof HTMLSelectElement) {
          const first = el.options[0];
          if (first) fill(el, first.value);
          return;
        }
        fill(el, '');
      },
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
