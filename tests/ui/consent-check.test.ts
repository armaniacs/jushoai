import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ConsentCheckDeps, ConsentEnv } from '../../src/content/consent-check';

// The content script module only calls the stubbed factory at import time;
// main() never runs, so no DOM side effects leak into the test.
vi.stubGlobal('defineContentScript', (opts: unknown) => opts);
const { verifyApplyConsent, defaultConsentCheckDeps } = await import('../../src/content/consent-check');

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

  it('passes when hit testing returns an inner shadow node without retargeting', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('button');
    root.append(inner);
    const deps: ConsentCheckDeps = {
      getHost: () => host,
      isHostConnected: () => true,
      getApplyPoint: () => ({ x: 10, y: 10 }),
      isHostVisible: () => true,
      hitTest: () => inner,
    };
    expect(verifyApplyConsent(deps)).toEqual({ ok: true });
  });

  it('fails when the hit node belongs to another shadow tree', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const other = document.createElement('div');
    document.body.append(other);
    const otherRoot = other.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    otherRoot.append(inner);
    const deps: ConsentCheckDeps = {
      getHost: () => host,
      isHostConnected: () => true,
      getApplyPoint: () => ({ x: 10, y: 10 }),
      isHostVisible: () => true,
      hitTest: () => inner,
    };
    const verdict = verifyApplyConsent(deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/覆われ/);
    else throw new Error('unreachable');
  });

  it('fails when nothing is hit at the apply point', () => {
    const verdict = verifyApplyConsent(setup({ hitTest: () => null }).deps);
    expect(verdict.ok).toBe(false);
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

  it('fails safe when the button point provider throws', () => {
    const host = document.createElement('div');
    host.setAttribute('data-jushoai', '');
    document.body.append(host);
    const deps = defaultConsentCheckDeps(() => { throw new Error('x'); });
    const verdict = verifyApplyConsent(deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/表示されていない疑い/);
    else throw new Error('unreachable');
  });
});

describe('defaultConsentCheckDeps with an injected env', () => {
  const stubHost = () => {
    const el = {
      isConnected: true,
      contains: (o: unknown) => o === el,
      getRootNode: () => document,
    } as unknown as Element;
    return el;
  };
  const fakeEnv = (host: Element, over: Partial<ConsentEnv> = {}): ConsentEnv => ({
    queryHost: () => host,
    viewport: () => ({ width: 800, height: 600 }),
    rectOf: () => ({ left: 100, top: 100, width: 360, height: 200 }),
    elementFromPoint: () => host,
    computedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    ...over,
  });

  it('aims at the host center through the real path', () => {
    const deps = defaultConsentCheckDeps(undefined, fakeEnv(stubHost()));
    expect(deps.getApplyPoint()).toEqual({ x: 280, y: 200 });
    expect(verifyApplyConsent(deps)).toEqual({ ok: true });
  });

  it('reports empty for a zero rect and offscreen outside the viewport', () => {
    const host = stubHost();
    expect(defaultConsentCheckDeps(undefined, fakeEnv(host, {
      rectOf: () => ({ left: 0, top: 0, width: 0, height: 0 }),
    })).getApplyPoint()).toEqual({ empty: true });
    expect(defaultConsentCheckDeps(undefined, fakeEnv(host, {
      rectOf: () => ({ left: 900, top: 100, width: 360, height: 200 }),
    })).getApplyPoint()).toEqual({ offscreen: true });
  });

  it('reads the numeric opacity through the visibility fallback', () => {
    const host = stubHost();
    const visible = defaultConsentCheckDeps(undefined, fakeEnv(host, {
      computedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '0.00' }),
    }));
    expect(visible.isHostVisible()).toBe(false);
    const shown = defaultConsentCheckDeps(undefined, fakeEnv(host));
    expect(shown.isHostVisible()).toBe(true);
  });

  it('fails when a cover is hit through the injected env', () => {
    const host = stubHost();
    const cover = stubHost();
    const deps = defaultConsentCheckDeps(undefined, fakeEnv(host, { elementFromPoint: () => cover }));
    const verdict = verifyApplyConsent(deps);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/覆われ/);
    else throw new Error('unreachable');
  });

  it('verifies the panel host, not the first host in the document', () => {
    const formHost = stubHost();
    const panelHost = stubHost();
    const env = fakeEnv(formHost, {
      queryHost: () => formHost,
      elementFromPoint: () => panelHost,
    });
    // Without the panel host the hit looks like a cover on the wrong host.
    expect(verifyApplyConsent(defaultConsentCheckDeps(undefined, env)).ok).toBe(false);
    // With the panel host the same hit passes: panelHost.contains(panelHost).
    const fixed = defaultConsentCheckDeps(undefined, {
      ...env,
      queryHost: () => panelHost,
      elementFromPoint: () => panelHost,
    }, () => panelHost);
    expect(verifyApplyConsent(fixed)).toEqual({ ok: true });
  });

  it('blocks when the panel host provider yields null instead of validating another host', () => {
    const formHost = stubHost();
    // The provider is authoritative: a null panel host must not fall back to
    // the document's first [data-jushoai], which is the form button host and
    // would let the gate pass on the wrong element.
    const env = fakeEnv(formHost, { elementFromPoint: () => formHost });
    const deps = defaultConsentCheckDeps(undefined, env, () => null);
    expect(deps.isHostConnected()).toBe(false);
    expect(verifyApplyConsent(deps).ok).toBe(false);
  });
});
