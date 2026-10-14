import { describe, it, expect, vi } from 'vitest';
import { createRectCache, isHidden, isMeasurable, visualTop, type Box } from '../../src/dom/geometry';

const box = (over: Partial<Box> = {}): Box => ({ top: 10, left: 20, width: 200, height: 24, ...over });

describe('isMeasurable', () => {
  it.each([
    [box(), true],
    [box({ width: 0, height: 24 }), true],
    [box({ width: 200, height: 0 }), true],
    [box({ width: 0, height: 0 }), false],
  ])('measurable(%j) is %s', (b, expected) => {
    expect(isMeasurable(b)).toBe(expected);
  });
});

describe('visualTop', () => {
  it('sorts zero-area boxes last and non-finite tops first', () => {
    expect(visualTop(box({ top: 50 }))).toBe(50);
    expect(visualTop(box({ width: 0, height: 0 }))).toBe(Number.POSITIVE_INFINITY);
    expect(visualTop(box({ top: Number.NaN }))).toBe(0);
    expect(visualTop(box({ top: Number.POSITIVE_INFINITY, width: 0, height: 0 }))).toBe(0);
  });
});

describe('createRectCache', () => {
  it('reads once per element within a pick', () => {
    const read = vi.fn((): Box => box());
    const cache = createRectCache(read);
    const a = document.createElement('div');
    const b = document.createElement('div');
    expect(cache.rectOf(a)).toBe(cache.rectOf(a));
    cache.rectOf(b);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('starts fresh per cache so entries never leak across scans', () => {
    const read = vi.fn((): Box => box());
    const el = document.createElement('div');
    createRectCache(read).rectOf(el);
    createRectCache(read).rectOf(el);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('reads live boxes by default', () => {
    const el = document.createElement('div');
    document.body.append(el);
    expect(createRectCache().rectOf(el)).toMatchObject({ width: 0, height: 0 });
    el.remove();
  });
});

describe('isHidden', () => {
  it('treats the hidden attribute as hidden without any rect read', () => {
    const el = document.createElement('input');
    el.setAttribute('hidden', '');
    expect(isHidden(el)).toBe(true);
  });

  it('stays inert under jsdom (no checkVisibility, empty rects)', () => {
    expect(isHidden(document.createElement('input'))).toBe(false);
  });

  it('takes the rect-reading path when checkVisibility exists', () => {
    const hidden = document.createElement('input');
    hidden.checkVisibility = () => false;
    expect(isHidden(hidden)).toBe(true);
    const zero = document.createElement('input');
    zero.checkVisibility = () => true;
    expect(isHidden(zero)).toBe(true);
    expect(isHidden(zero, box())).toBe(false);
  });
});
