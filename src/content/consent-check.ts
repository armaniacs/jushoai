// Consent verification for the preview apply path. The preview host lives in
// the page light DOM, so page CSS or scripts can hide, move, or cover it after
// it opens. The apply click is the last trust point: verify the panel is still
// genuinely visible before injecting anything. Hit-testing and visibility
// queries are injectable so unit tests can use fakes (jsdom has no layout).
export interface ConsentPoint {
  x: number;
  y: number;
}

// Where the consent click is aimed: a viewport point, offscreen, or without a
// box at all (hidden).
export type ApplyPoint = ConsentPoint | { offscreen: true } | { empty: true };

export interface ConsentCheckDeps {
  getHost(): Element | null;
  isHostConnected(): boolean;
  getApplyPoint(): ApplyPoint;
  isHostVisible(): boolean;
  hitTest(x: number, y: number): Element | null;
}

export type ConsentVerdict = { ok: true } | { ok: false; reason: string };

// Whether the hit-test topmost node is our own UI. elementFromPoint retargets
// shadow content to the host in some browsers but returns the inner node in
// others; both mean ours is topmost. host.contains cannot pierce the shadow
// boundary, so compare through the hit node's root instead (root.host works
// even for closed roots). A page element covering the button is always a
// light-DOM node outside the host and stays rejected. Our own panel content
// cannot be a cover: pages cannot insert nodes into the closed shadow tree.
function isOwnTopmost(host: Element, hit: Element | null): boolean {
  if (hit === null) return false;
  if (host.contains(hit)) return true;
  const root = hit.getRootNode();
  return root instanceof ShadowRoot && root.host === host;
}

export function verifyApplyConsent(deps: ConsentCheckDeps): ConsentVerdict {
  const host = deps.getHost();
  if (host === null || !deps.isHostConnected()) {
    return { ok: false, reason: 'パネルがページから取り除かれたため入力を中止しました' };
  }
  const point = deps.getApplyPoint();
  if ('offscreen' in point) {
    return { ok: false, reason: 'パネルが画面の外にあるため入力を中止しました' };
  }
  if ('empty' in point) {
    return { ok: false, reason: 'パネルが表示されていない疑いがあるため入力を中止しました' };
  }
  if (!deps.isHostVisible()) {
    return { ok: false, reason: 'パネルが表示されていないため入力を中止しました' };
  }
  // The topmost node must be our own UI: the host itself, its light-DOM
  // children, or a node inside our shadow tree (see isOwnTopmost).
  const hit = deps.hitTest(point.x, point.y);
  if (!isOwnTopmost(host, hit)) {
    return { ok: false, reason: 'パネルが他の要素に覆われているため入力を中止しました' };
  }
  return { ok: true };
}

const CONSENT_HOST_SELECTOR = '[data-jushoai]';

export interface ConsentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// DOM queries behind the default deps. The boundary between testable logic and
// renderer facts: hostCenter / viewport checks / visibility fallback are pure
// over this env and unit-testable with fakes; rectOf / elementFromPoint need a
// real layout engine, so the browser env delegates to the live DOM while tests
// inject rects and hits.
export interface ConsentEnv {
  queryHost(): Element | null;
  viewport(): { width: number; height: number };
  rectOf(el: Element): ConsentRect;
  elementFromPoint(x: number, y: number): Element | null;
  computedStyle(el: Element): { display: string; visibility: string; opacity: string };
}

const browserConsentEnv: ConsentEnv = {
  queryHost: () => document.querySelector(CONSENT_HOST_SELECTOR),
  viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
  rectOf: (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  },
  elementFromPoint: (x, y) => document.elementFromPoint(x, y),
  computedStyle: (el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity };
  },
};

const inViewport = (env: ConsentEnv, x: number, y: number): boolean => {
  const v = env.viewport();
  return x >= 0 && y >= 0 && x < v.width && y < v.height;
};

// getButtonPoint reads the apply button through the preview handle (the button
// lives inside the closed shadow root). A null button box means the button is
// hidden, which blocks the apply; without a provider the host center is used.
export function defaultConsentCheckDeps(
  getButtonPoint?: () => ConsentPoint | null,
  env: ConsentEnv = browserConsentEnv,
  getPreviewHost?: () => Element | null,
): ConsentCheckDeps {
  // The document holds several JushoAI hosts; the gate must verify the panel
  // host, never the first match (which is usually the form button host). When a
  // provider is supplied its answer is authoritative: falling back to
  // queryHost() on null would verify the wrong element (usually the button
  // host) and let the gate pass on it, so a missing panel host blocks instead.
  const getHost = (): Element | null => (getPreviewHost ? getPreviewHost() : env.queryHost());
  const hostCenter = (): ApplyPoint => {
    const host = getHost();
    if (host === null) return { offscreen: true };
    const rect = env.rectOf(host);
    if (rect.width === 0 && rect.height === 0) return { empty: true };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (!inViewport(env, x, y)) return { offscreen: true };
    return { x, y };
  };
  return {
    getHost,
    isHostConnected: () => getHost()?.isConnected ?? false,
    getApplyPoint: () => {
      if (!getButtonPoint) return hostCenter();
      // A throwing provider must fail safe: block the apply instead of
      // leaving the click half-handled.
      let p: ConsentPoint | null;
      try {
        p = getButtonPoint();
      } catch {
        return { empty: true };
      }
      if (p === null) return { empty: true };
      if (!inViewport(env, p.x, p.y)) return { offscreen: true };
      return p;
    },
    isHostVisible: () => {
      const host = getHost();
      if (host === null) return false;
      if (typeof host.checkVisibility === 'function') {
        return host.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      }
      const style = env.computedStyle(host);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    },
    hitTest: (x, y) => env.elementFromPoint(x, y),
  };
}

// Runs apply only when consent verification passes; on failure reports the
// reason through abort and leaves the panel open for cancel or retry.
export function applyIfConsented(
  deps: ConsentCheckDeps,
  apply: () => void,
  abort: (reason: string) => void,
): boolean {
  const verdict = verifyApplyConsent(deps);
  if (!verdict.ok) {
    abort(verdict.reason);
    return false;
  }
  apply();
  return true;
}
