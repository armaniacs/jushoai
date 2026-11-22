// WCAG 2.x relative luminance and contrast ratio over computed CSS colors.
// Pure and browser-independent: the unit test (contrast.test.ts) runs under
// the default vitest config, and the dark-session e2e scenarios import the
// same functions, so the e2e assert exercises exactly the pinned math.

export interface Rgb { r: number; g: number; b: number }
export interface Rgba extends Rgb { a: number }

// Opaque white canvas: the fixture pages set no background, and it is the
// worst-case backdrop for white text (the blend the banner tokens were
// chosen against).
export const WHITE: Rgb = { r: 255, g: 255, b: 255 };

// Parses the computed color forms both browsers emit ('rgb(r, g, b)',
// 'rgba(r, g, b, a)', also in the space-separated modern syntax) plus
// '#rgb'/'#rrggbb' for fixture literals. Returns null on anything else so a
// scenario read of an unexpected form fails loudly instead of comparing NaN.
export function parseCssColor(value: string): Rgba | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const d = hex[1]!.length === 3 ? hex[1]!.split('').map((c) => c + c).join('') : hex[1]!;
    return {
      r: parseInt(d.slice(0, 2), 16),
      g: parseInt(d.slice(2, 4), 16),
      b: parseInt(d.slice(4, 6), 16),
      a: 1,
    };
  }
  const fn = /^rgba?\(([^)]*)\)$/i.exec(value.trim());
  if (!fn) return null;
  const tokens = fn[1]!.trim().split(/[\s,/]+/).filter(Boolean);
  if (tokens.length < 3 || tokens.length > 4) return null;
  const nums = tokens.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return null;
  return { r: nums[0]!, g: nums[1]!, b: nums[2]!, a: nums.length === 4 ? nums[3]! : 1 };
}

// Alpha compositing of a (possibly translucent) source over an opaque
// backdrop, per channel: out = src*a + backdrop*(1-a), rounded to the 8-bit
// grid the browser paints.
export function blendOver(source: Rgba, backdrop: Rgb): Rgb {
  const mix = (s: number, b: number): number => Math.round(s * source.a + b * (1 - source.a));
  return { r: mix(source.r, backdrop.r), g: mix(source.g, backdrop.g), b: mix(source.b, backdrop.b) };
}

// WCAG 2.x relative luminance: sRGB channels are linearized
// (c <= 0.04045: c/12.92, else ((c+0.055)/1.055)^2.4) and combined with the
// 0.2126/0.7152/0.0722 weights.
export function relativeLuminance(color: Rgb): number {
  const linear = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

// WCAG contrast ratio: lighter over darker luminance, both offset by 0.05.
// 1.0 for identical colors, 21 for black on white; direction-free by design.
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
