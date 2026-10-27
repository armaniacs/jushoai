import { describe, it, expect } from 'vitest';
import { computeButtonPosition, computePlacement } from '../../src/ui/position';

const size = { width: 200, height: 30 };
const anchor = { top: 100, left: 50, right: 250, bottom: 124 };

describe('computeButtonPosition', () => {
  it('places the button right of the anchor, vertically centred, in document coordinates', () => {
    expect(
      computeButtonPosition({ anchor, size, viewport: { width: 1000 }, scroll: { x: 5, y: 300 } }),
    ).toEqual({ left: 250 + 8 + 5, top: 100 + (24 - 30) / 2 + 300 });
  });

  it('uses the right side when it fits exactly', () => {
    const r = computeButtonPosition({ anchor, size, viewport: { width: 250 + 8 + 200 + 8 }, scroll: { x: 0, y: 0 } });
    expect(r.left).toBe(258);
  });

  it('falls back above the anchor when the right side does not fit', () => {
    expect(
      computeButtonPosition({ anchor, size, viewport: { width: 400 }, scroll: { x: 0, y: 50 } }),
    ).toEqual({ left: 50, top: 100 - 30 - 8 + 50 });
  });

  it('clamps horizontally in the fallback', () => {
    const right = computeButtonPosition({
      anchor: { top: 100, left: 380, right: 395, bottom: 120 }, size, viewport: { width: 400 }, scroll: { x: 0, y: 0 },
    });
    expect(right.left).toBe(400 - 200 - 8);
    const left = computeButtonPosition({
      anchor: { top: 100, left: -30, right: 380, bottom: 120 }, size, viewport: { width: 400 }, scroll: { x: 0, y: 0 },
    });
    expect(left.left).toBe(8);
  });

  it('moves below the anchor instead of a negative top', () => {
    const r = computeButtonPosition({
      anchor: { top: 10, left: 50, right: 390, bottom: 30 }, size, viewport: { width: 400 }, scroll: { x: 0, y: 0 },
    });
    expect(r.top).toBe(30 + 8);
  });

  it('clamps the right placement top to zero', () => {
    const r = computeButtonPosition({
      anchor: { top: 0, left: 50, right: 250, bottom: 10 }, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 },
    });
    expect(r).toEqual({ left: 258, top: 0 });
  });

  it('places below the anchor when above would overlap it', () => {
    const r = computeButtonPosition({
      anchor: { top: 20, left: 50, right: 390, bottom: 44 }, size, viewport: { width: 400 }, scroll: { x: 0, y: 0 },
    });
    expect(r.top).toBe(44 + 8);
  });

  it('uses the margin when the button is wider than the viewport', () => {
    const r = computeButtonPosition({
      anchor: { top: 100, left: 50, right: 150, bottom: 120 }, size: { width: 500, height: 30 },
      viewport: { width: 300 }, scroll: { x: 0, y: 0 },
    });
    expect(r.left).toBe(8);
  });

  it('falls back to a safe position for non-finite input', () => {
    expect(
      computeButtonPosition({ anchor: { ...anchor, top: NaN }, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 } }),
    ).toEqual({ top: 0, left: 8 });
    expect(
      computeButtonPosition({ anchor, size, viewport: { width: Infinity }, scroll: { x: 0, y: 0 } }),
    ).toEqual({ top: 0, left: 8 });
  });
});

describe('computePlacement (PBI-161)', () => {
  it('returns the existing position with clear when nothing to avoid', () => {
    expect(computePlacement({ anchor, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 } })).toEqual({
      left: 258,
      top: 97,
      clear: true,
    });
  });

  it('moves off the adjacent column when the right side would cover it', () => {
    // The reported bug: a two-column name row puts the next input to the
    // right of the anchor, and the old right-side placement covered it.
    const avoid = [{ top: 100, left: 260, right: 470, bottom: 124 }];
    expect(computePlacement({ anchor, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 }, avoid })).toEqual({
      left: 50,
      top: 100 - 30 - 8,
      clear: true,
    });
  });

  it('keeps the right side when the candidate clears every field', () => {
    const avoid = [{ top: 300, left: 300, right: 500, bottom: 340 }];
    expect(computePlacement({ anchor, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 }, avoid })).toEqual({
      left: 258,
      top: 97,
      clear: true,
    });
  });

  it('picks above when only the right candidate collides', () => {
    const avoid = [{ top: 100, left: 252, right: 478, bottom: 140 }];
    expect(computePlacement({ anchor, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 }, avoid })).toEqual({
      left: 50,
      top: 62,
      clear: true,
    });
  });

  it('reports unclear when every candidate collides', () => {
    const avoid = [
      { top: 90, left: 0, right: 1000, bottom: 135 },
      { top: 0, left: 0, right: 1000, bottom: 92 },
    ];
    const input = { anchor, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 }, avoid };
    expect(computePlacement(input)).toEqual({ ...computeButtonPosition(input), clear: false });
  });

  it('applies scroll to the candidates like the existing placement does', () => {
    // The avoid rects live in the anchor's space (viewport for the fixed
    // host), so the neighbouring field shifts with the scroll too.
    const avoid = [{ top: 400, left: 265, right: 475, bottom: 424 }];
    expect(computePlacement({ anchor, size, viewport: { width: 1000 }, scroll: { x: 5, y: 300 }, avoid })).toEqual({
      left: 55,
      top: 100 - 30 - 8 + 300,
      clear: true,
    });
  });

  it('drops non-finite blockers instead of treating them as covering everything', () => {
    const avoid = [{ top: NaN, left: 0, right: 100, bottom: 100 }];
    expect(computePlacement({ anchor, size, viewport: { width: 1000 }, scroll: { x: 0, y: 0 }, avoid }).clear).toBe(
      true,
    );
  });
});
