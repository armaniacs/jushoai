import { describe, it, expect, beforeEach } from 'vitest';
import { planMounts } from '../../src/dom/mount-plan';

let c1: Element, a1: Element, a2: Element, c2: Element;
const form = (container: Element, anchor: Element) => ({ container, anchor: { el: anchor } });

beforeEach(() => {
  document.body.innerHTML = '<div id="c1"><input id="a1"><input id="a2"></div><div id="c2"></div>';
  c1 = document.getElementById('c1')!;
  c2 = document.getElementById('c2')!;
  a1 = document.getElementById('a1')!;
  a2 = document.getElementById('a2')!;
});

describe('planMounts', () => {
  it('keeps a button whose anchor is unchanged and connected', () => {
    const plan = planMounts(new Map([[c1, a1]]), [form(c1, a1)]);
    expect(plan.destroy).toEqual([]);
    expect(plan.mount).toEqual([]);
  });

  it('re-mounts when the anchor changed', () => {
    const f = form(c1, a2);
    const plan = planMounts(new Map([[c1, a1]]), [f]);
    expect(plan.destroy).toEqual([c1]);
    expect(plan.mount).toEqual([f]);
  });

  it('re-mounts when the stored anchor is disconnected', () => {
    a1.remove();
    const f = form(c1, a1);
    const plan = planMounts(new Map([[c1, a1]]), [f]);
    expect(plan.destroy).toEqual([c1]);
    expect(plan.mount).toEqual([f]);
  });

  it('destroys when the container vanished and mounts new containers', () => {
    const f = form(c2, a2);
    const plan = planMounts(new Map([[c1, a1]]), [f]);
    expect(plan.destroy).toEqual([c1]);
    expect(plan.mount).toEqual([f]);
  });
});
