import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PlanItem } from '../../src/core/planner';
import { applyPlan } from '../../src/dom/apply-plan';
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

describe('applyPlan', () => {
  it('fills ok items and skips non-ok ones', () => {
    const fill = vi.fn();
    applyPlan([item('a', 'lastName'), { ...item('b', 'firstName'), status: 'filled' }], byId(), fill);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill.mock.calls[0]![0]).toBe(document.getElementById('a'));
  });

  it('skips a field the user typed into after planning', () => {
    (document.getElementById('a') as HTMLInputElement).value = 'typed';
    const fill = vi.fn();
    applyPlan([item('a', 'lastName')], byId(), fill);
    expect(fill).not.toHaveBeenCalled();
  });

  it('skips a select the user changed away from its first option', () => {
    (document.getElementById('s') as HTMLSelectElement).value = '27';
    const fill = vi.fn();
    applyPlan([item('s', 'prefecture', '13')], byId(), fill);
    expect(fill).not.toHaveBeenCalled();
  });

  it('skips detached elements', () => {
    const map = byId();
    document.getElementById('a')!.remove();
    const fill = vi.fn();
    applyPlan([item('a', 'lastName')], map, fill);
    expect(fill).not.toHaveBeenCalled();
  });

  it('fills zip fields after all other fields', () => {
    const order: string[] = [];
    applyPlan(
      [item('zip', 'zip'), item('z1', 'zip1'), item('a', 'lastName'), item('s', 'prefecture', '13'), item('b', 'city')],
      byId(),
      (el) => order.push(el.id),
    );
    expect(order).toEqual(['a', 's', 'b', 'zip', 'z1']);
  });
});

describe('applyPlan radio groups', () => {
  const radios = () => {
    document.body.innerHTML = '<input id="r0" name="g" type="radio" value="0"><input id="r1" name="g" type="radio" value="1">';
    const inputs = Array.from(document.querySelectorAll('input'));
    return new Map([['g', { el: inputs[0]!, radioInputs: inputs }]]);
  };
  it('fills the matching option input', () => {
    const fill = vi.fn();
    applyPlan([item('g', 'gender', '1')], radios(), fill);
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill.mock.calls[0]![0]).toBe(document.getElementById('r1'));
  });
  it('skips the group when one option is already checked', () => {
    const map = radios();
    (document.getElementById('r0') as HTMLInputElement).checked = true;
    const fill = vi.fn();
    applyPlan([item('g', 'gender', '1')], map, fill);
    expect(fill).not.toHaveBeenCalled();
  });
});
