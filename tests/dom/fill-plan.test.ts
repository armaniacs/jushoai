import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PlanItem } from '../../src/core/planner';
import { fillPlan, targetsFromControls } from '../../src/dom/fill-plan';
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
) => fillPlan(plan, targetsFromControls(map, fill));

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
});
