import type { Control } from './scan-fields';

// Single owner of visible / measurable / anchorable box facts. Callers
// (scanFields, pickAnchor, button reposition, preview apply point) learn
// nothing about checkVisibility vs rect vs isConnected; tests inject fake
// boxes through RectProvider instead of needing a layout engine.
export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface RectProvider {
  rectOf(el: Element): Box;
}

// Memoized per instance: one rect read per element for the whole pick. No
// write happens inside a pick, so a cached rect cannot go stale within it.
// Create a fresh cache per pick so entries never leak across scans.
export function createRectCache(read: (el: Element) => Box = (el) => el.getBoundingClientRect()): RectProvider {
  const rects = new Map<Element, Box>();
  return {
    rectOf: (el) => {
      let r = rects.get(el);
      if (!r) {
        r = read(el);
        rects.set(el, r);
      }
      return r;
    },
  };
}

// A box the UI can aim at: zero-area boxes (not yet laid out, or
// honeypot-collapsed) are never anchors or apply points.
export function isMeasurable(box: Box): boolean {
  return box.width > 0 || box.height > 0;
}

// Sort key for topmost-first ordering. Non-finite tops sort first (0);
// zero-area boxes sort last so they never win over a real visible field.
// Under jsdom every rect is zero, so the sort stays stable and document
// order wins there.
export function visualTop(box: Box): number {
  if (!Number.isFinite(box.top)) return 0;
  if (!isMeasurable(box)) return Number.POSITIVE_INFINITY;
  return box.top;
}

// jsdom has no checkVisibility and reports empty rects for everything, so the
// rect test is gated on the same capability check to stay inert there.
// The optional box lets a caller that already holds it (e.g. the memoized
// pickAnchor read) reuse it for the zero-area check instead of paying for a
// second layout read. Callers without a box omit it and keep the single
// internal read.
export function isHidden(el: Control, rect?: Box): boolean {
  if (el.closest('[hidden]')) return true;
  if (typeof el.checkVisibility !== 'function') return false;
  if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return true;
  const r = rect ?? el.getBoundingClientRect();
  return r.width === 0 && r.height === 0;
}
