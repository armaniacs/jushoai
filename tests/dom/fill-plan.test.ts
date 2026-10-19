import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FILL_LAST_CATEGORIES } from '../../src/core/fill-order';
import type { PlanItem } from '../../src/core/planner';
import {
  FILL_RESULT_LABELS, fillPlan, fillResultLabel, shouldWarn, summarizeFillOutcomes, targetsFromControls,
} from '../../src/dom/fill-plan';
import type { FillResult } from '../../src/dom/fill-plan';
import type { Control } from '../../src/dom/scan-fields';

const item = (fieldId: string, category: PlanItem['category'], value = 'v'): PlanItem => ({
  fieldId, category, value, display: value, source: 'rule', status: 'ok',
});

beforeEach(() => {
  document.body.innerHTML = `
    <input id="a"><input id="zip"><input id="b"><input id="z1">
    <select id="s"><option value="">--</option><option value="13">東京都</option><option value="27">大阪府</option></select>`;
});

const byId = () =>
  new Map(
    ['a', 'zip', 'b', 'z1', 's'].map((id) => [id, { el: document.getElementById(id) as Control }]),
  );

const run = (
  plan: PlanItem[],
  map: Map<string, { el: Control; radioInputs?: HTMLInputElement[] }>,
  fill: (el: Control, value: string) => void = vi.fn(),
) => fillPlan(plan, targetsFromControls(map, fill)).outcomes;

describe('fillPlan', () => {
  it('fills ok items and skips non-ok ones with per-field outcomes', () => {
    const fill = vi.fn();
    const out = run([item('a', 'lastName'), { ...item('b', 'firstName'), status: 'filled' }], byId(), fill);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill.mock.calls[0]![0]).toBe(document.getElementById('a'));
    expect(out).toEqual([
      { fieldId: 'a', result: 'filled' },
      { fieldId: 'b', result: 'skipped-status' },
    ]);
  });

  it('skips a field the user typed into after planning', () => {
    (document.getElementById('a') as HTMLInputElement).value = 'typed';
    const fill = vi.fn();
    const out = run([item('a', 'lastName')], byId(), fill);
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 'a', result: 'already-filled' }]);
  });

  it('skips a select the user changed away from its first option', () => {
    (document.getElementById('s') as HTMLSelectElement).value = '27';
    const fill = vi.fn();
    const out = run([item('s', 'prefecture', '13')], byId(), fill);
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 's', result: 'already-filled' }]);
  });

  it('skips detached elements and unknown field ids', () => {
    const map = byId();
    document.getElementById('a')!.remove();
    const fill = vi.fn();
    const out = run([item('a', 'lastName'), item('ghost', 'city')], map, fill);
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([
      { fieldId: 'a', result: 'detached' },
      { fieldId: 'ghost', result: 'missing-target' },
    ]);
  });

  it('fills zip fields after all other fields', () => {
    const order: string[] = [];
    const out = run(
      [item('zip', 'zip'), item('z1', 'zip1'), item('a', 'lastName'), item('s', 'prefecture', '13'), item('b', 'city')],
      byId(),
      (el) => order.push(el.id),
    );
    expect(order).toEqual(['a', 's', 'b', 'zip', 'z1']);
    expect(out.every((o) => o.result === 'filled')).toBe(true);
  });
});

describe('fillPlan radio groups', () => {
  const radios = () => {
    document.body.innerHTML = '<input id="r0" name="g" type="radio" value="0"><input id="r1" name="g" type="radio" value="1">';
    const inputs = Array.from(document.querySelectorAll('input'));
    return new Map([['g', { el: inputs[0]!, radioInputs: inputs }]]);
  };
  it('fills the matching option input', () => {
    const fill = vi.fn();
    const out = run([item('g', 'gender', '1')], radios(), fill);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill.mock.calls[0]![0]).toBe(document.getElementById('r1'));
    expect(out).toEqual([{ fieldId: 'g', result: 'filled' }]);
  });
  it('skips the group when one option is already checked', () => {
    const map = radios();
    (document.getElementById('r0') as HTMLInputElement).checked = true;
    const fill = vi.fn();
    const out = run([item('g', 'gender', '1')], map, fill);
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 'g', result: 'already-filled' }]);
  });
  it('reports no-option when no radio matches the value', () => {
    const fill = vi.fn();
    const out = run([item('g', 'gender', '9')], radios(), fill);
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 'g', result: 'no-option' }]);
  });
  it('reads a disabled option at fill time, not at snapshot time', () => {
    const fill = vi.fn();
    const targets = targetsFromControls(radios(), fill);
    (document.getElementById('r1') as HTMLInputElement).disabled = true;
    const out = fillPlan([item('g', 'gender', '1')], targets).outcomes;
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 'g', result: 'no-option' }]);
  });
  it('reads a swapped option value at fill time, not at snapshot time', () => {
    const fill = vi.fn();
    const targets = targetsFromControls(radios(), fill);
    (document.getElementById('r1') as HTMLInputElement).value = 'other';
    const out = fillPlan([item('g', 'gender', '1')], targets).outcomes;
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 'g', result: 'no-option' }]);
  });
});

describe('summarizeFillOutcomes', () => {
  it('distinguishes full application from partial application with a countable breakdown', () => {
    const fill = vi.fn();
    const full = run([item('a', 'lastName'), item('b', 'city')], byId(), fill);
    expect(summarizeFillOutcomes(full)).toMatchObject({ filled: 2, unapplied: 0 });

    // By-design skips (user-typed, plan-level) stay silent; only true
    // failures (here: detached) raise the warning count.
    (document.getElementById('a') as HTMLInputElement).value = 'typed';
    const map = byId();
    document.getElementById('b')!.remove();
    const partial = run(
      [item('a', 'lastName'), item('b', 'city'), { ...item('s', 'prefecture', '13'), status: 'filled' }],
      map,
      fill,
    );
    const summary = summarizeFillOutcomes(partial);
    expect(summary.filled).toBe(0);
    expect(summary.unapplied).toBe(1);
    expect(summary.byResult).toMatchObject({ filled: 0, 'already-filled': 1, detached: 1, 'skipped-status': 1 });
  });

  it('counts every FillResult vocabulary member without gaps', () => {
    const summary = summarizeFillOutcomes([
      { fieldId: '1', result: 'filled' },
      { fieldId: '2', result: 'skipped-status' },
      { fieldId: '3', result: 'missing-target' },
      { fieldId: '4', result: 'detached' },
      { fieldId: '5', result: 'already-filled' },
      { fieldId: '6', result: 'no-option' },
      { fieldId: '7', result: 'error' },
    ]);
    expect(summary).toMatchObject({ filled: 1, unapplied: 4 });
    expect(Object.values(summary.byResult).reduce((a, b) => a + b, 0)).toBe(7);
  });
});

describe('fillPlan report', () => {
  it('keys outcomes by field id independent of fill order', () => {
    const report = fillPlan(
      [item('zip', 'zip'), item('a', 'lastName'), item('ghost', 'city')],
      targetsFromControls(byId(), vi.fn()),
    );
    expect(report.byId.get('a')).toBe('filled');
    expect(report.byId.get('ghost')).toBe('missing-target');
    expect(report.byId.get('zip')).toBe('filled');
    expect(report.summary).toMatchObject({ filled: 2, unapplied: 1, total: 3 });
  });

  it('decides the warning in one call', () => {
    expect(shouldWarn({ filled: 2, unapplied: 0, total: 2, byResult: { filled: 2 } } as never)).toBe(false);
    expect(shouldWarn({ filled: 1, unapplied: 1, total: 2, byResult: { filled: 1 } } as never)).toBe(true);
  });
});

describe('fillPlan robustness', () => {
  it('isolates a throwing field and still reports every outcome', () => {
    const plan = [item('a', 'lastName'), item('b', 'city')];
    const targets = targetsFromControls(byId(), () => {});
    targets.set('a', {
      get connected(): boolean { throw new Error('boom'); },
      get empty() { return true; },
      fill: () => {},
    });
    const out = fillPlan(plan, targets).outcomes;
    expect(out).toEqual([
      { fieldId: 'a', result: 'error' },
      { fieldId: 'b', result: 'filled' },
    ]);
  });

  it('reports a detached matching radio option instead of success', () => {
    document.body.innerHTML = '<input id="r0" name="g" type="radio" value="0"><input id="r1" name="g" type="radio" value="1">';
    const inputs = Array.from(document.querySelectorAll('input'));
    document.getElementById('r1')!.remove();
    const map = new Map([['g', { el: inputs[0]!, radioInputs: inputs }]]);
    const fill = vi.fn();
    const out = run([item('g', 'gender', '1')], map, fill);
    expect(fill).not.toHaveBeenCalled();
    expect(out).toEqual([{ fieldId: 'g', result: 'detached' }]);
  });

  it('prefers a live option when values collide after a rewrite', () => {
    document.body.innerHTML = '<input id="r0" name="g" type="radio" value="1"><input id="r1" name="g" type="radio" value="1">';
    const inputs = Array.from(document.querySelectorAll('input'));
    document.getElementById('r0')!.remove();
    const map = new Map([['g', { el: inputs[1]!, radioInputs: inputs }]]);
    const fill = vi.fn();
    const out = run([item('g', 'gender', '1')], map, fill);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill.mock.calls[0]![0]).toBe(document.getElementById('r1'));
    expect(out).toEqual([{ fieldId: 'g', result: 'filled' }]);
  });

  it('returns outcomes in fill order, not plan order', () => {
    const out = run(
      [item('zip', 'zip'), item('a', 'lastName'), item('ghost', 'city')],
      byId(),
      vi.fn(),
    );
    expect(out.map((o) => o.fieldId)).toEqual(['a', 'ghost', 'zip']);
  });
});

describe('FILL_LAST_CATEGORIES', () => {
  it('is the single definition holding the zip categories', () => {
    expect([...FILL_LAST_CATEGORIES].sort()).toEqual(['zip', 'zip1', 'zip2']);
  });

  it('defers exactly the constant members to the end, keeping stable order within groups', () => {
    const order: string[] = [];
    const out = run(
      [item('zip', 'zip'), item('z1', 'zip1'), item('a', 'lastName'), item('s', 'prefecture', '13')],
      byId(),
      (el) => order.push(el.id),
    );
    expect(order).toEqual(['a', 's', 'zip', 'z1']);
    expect(out.every((o) => o.result === 'filled')).toBe(true);
  });
});

describe('fillResultLabel (PBI-61)', () => {
  it('resolves every known reason to its Japanese label', () => {
    expect(fillResultLabel('filled')).toBe('適用済み');
    expect(fillResultLabel('error')).toBe('エラー');
  });

  it('falls back to the raw key for unknown future reasons', () => {
    expect(fillResultLabel('future-reason')).toBe('future-reason');
  });

  it('resolves every FillResult through the table, never the fallback', () => {
    // The table is Record<FillResult, string>, so its keys are exactly the
    // FillResult union — a new reason lands here automatically.
    for (const result of Object.keys(FILL_RESULT_LABELS) as FillResult[]) {
      expect(fillResultLabel(result)).toBe(FILL_RESULT_LABELS[result]);
    }
  });
});
