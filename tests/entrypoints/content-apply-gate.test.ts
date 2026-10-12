import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ConsentCheckDeps } from '../../src/entrypoints/content';

// Same stub-then-import seam as background.test.ts uses for defineBackground:
// the module only registers the content script factory, main() never runs.
vi.stubGlobal('defineContentScript', (opts: unknown) => opts);
const { applyIfConsented, verifyApplyConsent } = await import('../../src/entrypoints/content');

afterEach(() => { document.body.innerHTML = ''; });

const consenting = (): ConsentCheckDeps => {
  const host = document.createElement('div');
  document.body.append(host);
  return {
    getHost: () => host,
    isHostConnected: () => true,
    getApplyPoint: () => ({ x: 10, y: 10 }),
    isHostVisible: () => true,
    hitTest: () => host,
  };
};

describe('applyIfConsented', () => {
  it('runs apply and skips abort when verification passes', () => {
    const apply = vi.fn();
    const abort = vi.fn();
    expect(applyIfConsented(consenting(), apply, abort)).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(abort).not.toHaveBeenCalled();
  });

  it('never runs apply and reports the reason when verification fails', () => {
    const deps = consenting();
    const blocked = { ...deps, isHostVisible: () => false };
    const apply = vi.fn();
    const abort = vi.fn();
    expect(applyIfConsented(blocked, apply, abort)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(abort).toHaveBeenCalledOnce();
    const expected = verifyApplyConsent(blocked);
    expect(expected.ok).toBe(false);
    if (!expected.ok) expect(abort.mock.calls[0]?.[0]).toBe(expected.reason);
  });

  it('keeps field values untouched on abort: the injected apply closure never runs', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const apply = vi.fn(() => { input.value = '山田'; });
    const abort = vi.fn();
    const covered = { ...consenting(), hitTest: (_x: number, _y: number) => document.createElement('div') };
    applyIfConsented(covered, apply, abort);
    expect(input.value).toBe('');
    expect(abort).toHaveBeenCalledOnce();
  });
});
