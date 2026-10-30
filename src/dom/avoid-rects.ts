import type { Rect } from '../ui/position';
import { isHidden } from './geometry';
import { TEXT_TYPES } from './scan-fields';

// Same walk-scan policy as the extension (AGENTS.md): the scanned control
// types (TEXT_TYPES, incl. date since PBI-118) are the fields the button must
// not cover. checkbox/hidden/submit and other types are out of the scan set
// and out of the blockers.

// Visible input/select rects in document coordinates (PBI-161), collected
// document-wide: the banner must not cover any text field, including a
// neighbouring form's — a field outside the mounted container near the anchor
// is exactly where an overlap would otherwise slip through. Rects far from
// the anchor never overlap its candidates, so the wider scope costs nothing
// beyond the sweep itself. Cached at scan time and converted to viewport
// space at reposition time, so a scroll never needs a fresh sweep:
// reposition() runs every animation frame while scrolling, and a full-page
// getBoundingClientRect sweep per frame would fight the layout engine.
// Hidden fields are excluded (zero rects and visibility:hidden/opacity:0
// alike — a phantom blocker from an invisible honeypot field would push the
// button away from the whole page).
export function collectAvoidRects(doc: Document): Rect[] {
  const sx = doc.defaultView?.scrollX ?? 0;
  const sy = doc.defaultView?.scrollY ?? 0;
  const rects: Rect[] = [];
  for (const el of Array.from(doc.querySelectorAll('input, select'))) {
    const input = el as HTMLInputElement;
    if (el.tagName !== 'SELECT' && !TEXT_TYPES.has(input.type)) continue;
    if (input.disabled) continue;
    const box = el.getBoundingClientRect();
    // Zero rects first (display:none and not-yet-laid-out fields): isHidden
    // cannot reach its own zero-rect branch where checkVisibility is absent.
    if (box.width <= 0 || box.height <= 0) continue;
    if (isHidden(el as HTMLInputElement, box)) continue;
    rects.push({
      top: box.top + sy,
      left: box.left + sx,
      right: box.right + sx,
      bottom: box.bottom + sy,
    });
  }
  return rects;
}
