import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearClassifyCache, detectForms } from '../../src/dom/detect-forms';
import * as rules from '../../src/core/classify-rules';

beforeEach(() => {
  document.body.innerHTML = '';
  clearClassifyCache();
});

const FORM = `
  <form id="f">
    <input name="last_name"><input name="first_name"><input name="email" type="email">
  </form>`;

describe('detectForms classify memoization (PBI-21)', () => {
  it('returns identical mounts on rescan without re-running the matchers', () => {
    document.body.innerHTML = FORM;
    const spy = vi.spyOn(rules, 'classifyField');
    const first = detectForms(document);
    const callsAfterFirst = spy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(first).toHaveLength(1);

    const second = detectForms(document);
    expect(second).toHaveLength(1);
    expect(second[0]!.container.id).toBe('f');
    expect(second[0]!.anchor.el).toBe(first[0]!.anchor.el);
    // No new classifyField work: every meta hashed to a cached verdict.
    expect(spy.mock.calls.length).toBe(callsAfterFirst);
    spy.mockRestore();
  });

  it('reclassifies only the field whose meta changed', () => {
    document.body.innerHTML = FORM;
    const spy = vi.spyOn(rules, 'classifyField');
    detectForms(document);
    expect(spy.mock.calls.length).toBeGreaterThan(0);
    const baseline = spy.mock.calls.length;

    // Unrelated DOM churn elsewhere must not invalidate cached verdicts.
    document.body.insertAdjacentHTML('beforeend', '<div><p>ad banner</p></div>');
    detectForms(document);
    expect(spy.mock.calls.length).toBe(baseline);

    // Renaming one input re-runs classification and keeps the same mount.
    document.querySelector('input[name="last_name"]')!.setAttribute('name', 'sei');
    const forms = detectForms(document);
    expect(spy.mock.calls.length).toBeGreaterThan(baseline);
    expect(forms).toHaveLength(1);
    expect(forms[0]!.container.id).toBe('f');
    spy.mockRestore();
  });

  it('typing (value-only change) does not re-run classification', () => {
    document.body.innerHTML = FORM;
    const spy = vi.spyOn(rules, 'classifyField');
    detectForms(document);
    const baseline = spy.mock.calls.length;
    (document.querySelector('input[name="last_name"]') as HTMLInputElement).value = '山田';
    detectForms(document);
    expect(spy.mock.calls.length).toBe(baseline);
    spy.mockRestore();
  });
});
