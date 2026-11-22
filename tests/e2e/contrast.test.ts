import { describe, expect, it } from 'vitest';
import { WHITE, blendOver, contrastRatio, parseCssColor, relativeLuminance } from './contrast';

// Pins the WCAG math the dark-session scenarios assert with, against the
// values documented for the dark palette (panel bg #212530, luminance 0.019;
// panel-fg #e8eaf0 at 12.7:1) and for the dark banner (rgba(28, 45, 100, 0.9)
// blending to rgb(51, 66, 116) over a white page at 9.7:1, 13.9:1 over black).

const round1 = (x: number): number => Math.round(x * 10) / 10;

describe('contrastRatio (WCAG relative luminance)', () => {
  it('gives 1.0 for identical colors', () => {
    expect(contrastRatio({ r: 33, g: 37, b: 48 }, { r: 33, g: 37, b: 48 })).toBeCloseTo(1.0, 5);
  });

  it('gives 21 for black and white, in either argument order', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5);
  });

  it('reproduces the documented dark-panel pair (#212530 bg, #e8eaf0 text)', () => {
    const bg = parseCssColor('#212530');
    const fg = parseCssColor('#e8eaf0');
    expect(bg).not.toBeNull();
    expect(fg).not.toBeNull();
    expect(relativeLuminance(bg!)).toBeCloseTo(0.0186, 3);
    expect(round1(contrastRatio(bg!, fg!))).toBe(12.7);
  });

  it('separates an AA-passing pair from an AA-failing one at the 4.5 boundary', () => {
    const pass = contrastRatio(parseCssColor('#767676')!, WHITE);
    const fail = contrastRatio(parseCssColor('#777777')!, WHITE);
    expect(pass).toBeGreaterThanOrEqual(4.5);
    expect(fail).toBeLessThan(4.5);
  });
});

describe('blendOver (alpha compositing)', () => {
  it('composites the dark banner rgba over white to the documented blend', () => {
    const banner = parseCssColor('rgba(28, 45, 100, 0.9)')!;
    expect(blendOver(banner, WHITE)).toEqual({ r: 51, g: 66, b: 116 });
    expect(round1(contrastRatio(blendOver(banner, WHITE), WHITE))).toBe(9.7);
    // The other documented extreme: the same banner over a black page.
    expect(round1(contrastRatio(blendOver(banner, { r: 0, g: 0, b: 0 }), WHITE))).toBe(13.9);
  });

  it('keeps an opaque source unchanged', () => {
    expect(blendOver({ r: 10, g: 20, b: 30, a: 1 }, WHITE)).toEqual({ r: 10, g: 20, b: 30 });
  });
});

describe('parseCssColor', () => {
  it('reads the computed forms the browsers emit plus hex literals', () => {
    expect(parseCssColor('rgb(33, 37, 48)')).toEqual({ r: 33, g: 37, b: 48, a: 1 });
    expect(parseCssColor('rgba(28, 45, 100, 0.9)')).toEqual({ r: 28, g: 45, b: 100, a: 0.9 });
    expect(parseCssColor('rgb(33 37 48)')).toEqual({ r: 33, g: 37, b: 48, a: 1 });
    expect(parseCssColor('rgba(28 45 100 / 0.9)')).toEqual({ r: 28, g: 45, b: 100, a: 0.9 });
    expect(parseCssColor('#212530')).toEqual({ r: 33, g: 37, b: 48, a: 1 });
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('returns null on unreadable forms so a scenario read fails loudly', () => {
    expect(parseCssColor('transparent')).toBeNull();
    expect(parseCssColor('rgb(none, 0, 0)')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});
