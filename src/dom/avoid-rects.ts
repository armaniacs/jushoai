import type { Rect } from '../ui/position';

// Same walk-scan policy as the extension (CLAUDE.md): text-like inputs and
// selects are the fields the button must not cover. checkbox/hidden/submit
// and other types are out of the scan set and out of the blockers.
const AVOID_TYPES = new Set(['text', 'email', 'tel', 'search']);

// Visible input/select rects in document coordinates (PBI-161). Cached at
// scan time and converted to viewport space at reposition time, so a scroll
// never needs a fresh sweep: reposition() runs every animation frame while
// scrolling, and a full-page getBoundingClientRect sweep per frame would
// fight the layout engine. Hidden fields (zero rects) are excluded — a
// blocker from them would push the button away from the whole page.
export function collectAvoidRects(container: Element, doc: Document): Rect[] {
  const sx = doc.defaultView?.scrollX ?? 0;
  const sy = doc.defaultView?.scrollY ?? 0;
  const rects: Rect[] = [];
  for (const el of Array.from(container.querySelectorAll('input, select'))) {
    const input = el as HTMLInputElement;
    if (el.tagName !== 'SELECT' && !AVOID_TYPES.has(input.type)) continue;
    if (input.disabled) continue;
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    rects.push({
      top: box.top + sy,
      left: box.left + sx,
      right: box.right + sx,
      bottom: box.bottom + sy,
    });
  }
  return rects;
}
