export interface Rect { top: number; left: number; right: number; bottom: number }
export interface PositionInput {
  anchor: Rect;
  size: { width: number; height: number };
  viewport: { width: number };
  scroll: { x: number; y: number };
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
      top: a.top + (a.bottom - a.top - s.height) / 2 + sc.y,
    };
  }

  const maxLeft = v.width - s.width - MARGIN;
  const left = maxLeft < MARGIN ? MARGIN : Math.min(Math.max(a.left, MARGIN), maxLeft);
  return { top: Math.max(0, a.top - s.height - GAP + sc.y), left: left + sc.x };
}
