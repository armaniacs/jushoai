export interface Rect { top: number; left: number; right: number; bottom: number }
export interface PositionInput {
  anchor: Rect;
  size: { width: number; height: number };
  viewport: { width: number };
  scroll: { x: number; y: number };
  // Blocker rects in the same coordinate space as the anchor (viewport space
  // for the fixed host). The button must not cover any of them (PBI-161).
  avoid?: Rect[];
}

const GAP = 8;
const MARGIN = 8;

export function computeButtonPosition(i: PositionInput): { top: number; left: number } {
  const { anchor: a, size: s, viewport: v, scroll: sc } = i;
  const nums = [a.top, a.left, a.right, a.bottom, s.width, s.height, v.width, sc.x, sc.y];
  if (!nums.every(Number.isFinite)) return { top: 0, left: MARGIN };

  if (a.right + GAP + s.width <= v.width - MARGIN) {
    return {
      left: a.right + GAP + sc.x,
      top: Math.max(0, a.top + (a.bottom - a.top - s.height) / 2 + sc.y),
    };
  }

  const maxLeft = v.width - s.width - MARGIN;
  const left = maxLeft < MARGIN ? MARGIN : Math.min(Math.max(a.left, MARGIN), maxLeft);
  const above = a.top - s.height - GAP + sc.y;
  // Clamping to 0 would cover the anchor, so go below it instead.
  return { top: above >= 0 ? above : a.bottom + GAP + sc.y, left: left + sc.x };
}

function isFiniteRect(r: Rect): boolean {
  return [r.top, r.left, r.right, r.bottom].every(Number.isFinite);
}

// Expanded-rect intersection: a candidate must not touch a blocker's box
// (GAP on every side), so the button never sits flush against an input.
function overlapsAny(candidate: Rect, avoid: Rect[]): boolean {
  return avoid.some(
    (b) =>
      candidate.left < b.right + GAP &&
      candidate.right > b.left - GAP &&
      candidate.top < b.bottom + GAP &&
      candidate.bottom > b.top - GAP,
  );
}

function rectAt(top: number, left: number, s: { width: number; height: number }): Rect {
  return { top, left, right: left + s.width, bottom: top + s.height };
}

// Placement with collision avoidance (PBI-161). Candidates keep the existing
// preference order (right of the anchor, then above, then below) — the right
// side is where the reported overlap happened, so it is a checked candidate,
// not a trusted default. The first candidate that overlaps none of the
// `avoid` rects wins. When every candidate collides (dense layouts, narrow
// viewports), `clear` is false and the caller keeps the last good position;
// the translucent banner (PBI-162) mitigates the residual overlap.
export function computePlacement(i: PositionInput): { top: number; left: number; clear: boolean } {
  const best = computeButtonPosition(i);
  const avoid = (i.avoid ?? []).filter(isFiniteRect);
  if (avoid.length === 0) return { ...best, clear: true };
  const { anchor: a, size: s, viewport: v, scroll: sc } = i;
  const maxLeft = v.width - s.width - MARGIN;
  const fallbackLeft = maxLeft < MARGIN ? MARGIN : Math.min(Math.max(a.left, MARGIN), maxLeft);
  const candidates: Rect[] = [];
  if (a.right + GAP + s.width <= v.width - MARGIN) {
    candidates.push(rectAt(Math.max(0, a.top + (a.bottom - a.top - s.height) / 2 + sc.y), a.right + GAP + sc.x, s));
  }
  const above = a.top - s.height - GAP + sc.y;
  if (above >= 0) candidates.push(rectAt(above, fallbackLeft + sc.x, s));
  candidates.push(rectAt(a.bottom + GAP + sc.y, fallbackLeft + sc.x, s));
  for (const candidate of candidates) {
    if (!overlapsAny(candidate, avoid)) return { top: candidate.top, left: candidate.left, clear: true };
  }
  return { ...best, clear: false };
}
