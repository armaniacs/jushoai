import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ConsentCheckDeps } from '../../src/entrypoints/content';

// The content script module only calls the stubbed factory at import time;
// main() never runs, so no DOM side effects leak into the test.
vi.stubGlobal('defineContentScript', (opts: unknown) => opts);
const { verifyApplyConsent } = await import('../../src/entrypoints/content');

afterEach(() => { document.body.innerHTML = ''; });

const setup = (over: Partial<ConsentCheckDeps> = {}) => {
  const host = document.createElement('div');
  document.body.append(host);
  const cover = document.createElement('div');
  document.body.append(cover);
  const deps: ConsentCheckDeps = {
    getHost: () => host,
    isHostConnected: () => true,
    getApplyPoint: () => ({ x: 10, y: 10 }),
    isHostVisible: () => true,
    hitTest: () => host,
    ...over,
  };
  return { host, cover, deps };
};

describe('verifyApplyConsent', () => {
  it('passes when the host is connected, visible, and topmost at the apply point', () => {
    expect(verifyApplyConsent(setup().deps)).toEqual({ ok: true });
  });

  it('fails when the host was removed from the page', () => {
    const { deps } = setup({ getHost: () => null, isHostConnected: () => false });
    const verdict = verifyApplyConsent(deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/取り除か/);
    else throw new Error('unreachable');
  });

  it('fails when the host is disconnected even if the reference is kept', () => {
    const verdict = verifyApplyConsent(setup({ isHostConnected: () => false }).deps);
    expect(verdict.ok).toBe(false);
  });

  it('fails when the panel is hidden', () => {
    const verdict = verifyApplyConsent(setup({ isHostVisible: () => false }).deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/表示/);
    else throw new Error('unreachable');
  });

  it('fails when another element covers the apply point', () => {
    const { cover, deps } = setup();
    const verdict = verifyApplyConsent({ ...deps, hitTest: () => cover });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/覆われ/);
    else throw new Error('unreachable');
  });

  it('fails when nothing is hit at the apply point', () => {
    const verdict = verifyApplyConsent(setup({ hitTest: () => null }).deps);
    expect(verdict.ok).toBe(false);
  });

  it('fails when the panel was moved off-screen and no apply point exists', () => {
    const verdict = verifyApplyConsent(setup({ getApplyPoint: () => null }).deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/画面の外/);
    else throw new Error('unreachable');
  });

  it('fails with the off-screen reason for an offscreen apply point', () => {
    const verdict = verifyApplyConsent(setup({ getApplyPoint: () => ({ offscreen: true }) }).deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/画面の外/);
    else throw new Error('unreachable');
  });

  it('fails with the hidden-suspicion reason for a point without a box', () => {
    const verdict = verifyApplyConsent(setup({ getApplyPoint: () => ({ empty: true }) }).deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/表示されていない疑い/);
    else throw new Error('unreachable');
  });

  it('aims at the button point, so a cover over the button blocks the apply', () => {
    const { cover, deps } = setup({ getApplyPoint: () => ({ x: 44, y: 12 }) });
    const verdict = verifyApplyConsent({ ...deps, hitTest: (x, y) => (x === 44 && y === 12 ? cover : null) });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/覆われ/);
    else throw new Error('unreachable');
  });
});
