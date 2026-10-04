import { describe, it, expect } from 'vitest';
import { computeButtonPosition } from '../../src/ui/position';

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
