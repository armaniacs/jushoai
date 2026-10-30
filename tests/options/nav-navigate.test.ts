// PBI-196: nav owns page transitions, so consumers register through
// onNavigate and setActivePage notifies exactly once — main.ts keeps no
// order-dependent click/hashchange listeners. nav.ts is importable under
// jsdom: every chrome access sits in a try/catch and the DOM lookups return
// early when the elements are missing.
import { describe, it, expect } from 'vitest';
import {
  onNavigate, setActivePage, getActivePage, applyActivePage,
} from '../../src/entrypoints/options/nav';

describe('nav onNavigate (PBI-196)', () => {
  it('runs the registered callback once per setActivePage call', () => {
    let calls = 0;
    onNavigate(() => { calls += 1; });
    setActivePage('ai');
    expect(calls).toBe(1);
    expect(getActivePage()).toBe('ai');
    setActivePage('profiles');
    expect(calls).toBe(2);
    expect(getActivePage()).toBe('profiles');
  });

  it('does not fire on applyActivePage (the render path stays separate)', () => {
    let calls = 0;
    onNavigate(() => { calls += 1; });
    // render() calls applyActivePage directly and syncs the guide itself, so
    // the callback firing here would double-sync on every re-render.
    applyActivePage();
    expect(calls).toBe(0);
  });
});
