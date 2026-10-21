import type { KanaKind } from './types';
import { hasHyphen } from './dashes';

// Strips the 例: prefix that sample placeholders start with; shared with classify-rules.
export const stripExample = (s: string) => s.replace(/^例[)）:：]?/, '').trim();

const FULL = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォッャュョー・';
const HALF = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｯｬｭｮｰ･';
// HALF[i] ↔ FULL[i] の位置対応テーブル: 片方に1文字挿入すると全マッピングが
// 黙ってずれるため、ロード時に長さを assert する（toHalfKatakana/toFullWidth
// が最初に呼ばれるより前に必ず発火する）。
if (FULL.length !== HALF.length) {
  throw new Error(`HALF/FULL kana tables drifted: FULL=${FULL.length}, HALF=${HALF.length}`);
}
const FULL_TO_HALF = new Map([...FULL].map((c, i) => [c, HALF[i]]));

export function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// NFD splits voiced kana into base + combining mark, which maps onto half-width base + ﾞ/ﾟ.
export function toHalfKatakana(s: string): string {
  return [...s.normalize('NFD')]
    .map((c) => (c === '゙' ? 'ﾞ' : c === '゚' ? 'ﾟ' : (FULL_TO_HALF.get(c) ?? c)))
    .join('');
}

export function formatKana(katakana: string, kind: KanaKind): string {
  if (kind === 'hiragana') return toHiragana(katakana);
  if (kind === 'halfKatakana') return toHalfKatakana(katakana);
  return katakana;
}

export function detectNameSeparator(placeholder: string): string {
  const p = stripExample(placeholder);
  if (p.includes('　')) return '　';
  if (p.includes(' ')) return ' ';
  if (/^[぀-ヿ一-鿿]{2,}$/.test(p)) return '';
  return ' ';
}

export const joinName = (last: string, first: string, sep: string) => `${last}${sep}${first}`;

// Domestic 4-char prefixes (0 + 3-digit area). 10-digit numbers starting with these are
// 4-2-4; without this table a 3-3-4 fallback would split e.g. 小樽 0134-32-1234 incorrectly.
// Sourced from the MIC area code list as of 2026-03-01
// (https://www.soumu.go.jp/main_content/000141817.pdf).
// The list carries areas only, so overlapping prefixes (notably the 04 zone and the
// shorter parents of AREA5 codes) still need the separate city-code designation tables
// for an exact split and stay on the fallback path.
const AREA4 = new Set([
  '0123', '0124', '0125', '0126', '0133', '0134', '0135', '0136', '0137', '0138', '0139',
  '0142', '0143', '0144', '0145', '0146', '0152', '0153', '0154', '0155', '0156', '0157',
  '0158', '0162', '0163', '0164', '0165', '0166', '0167', '0172', '0173', '0174', '0175',
  '0176', '0178', '0179', '0182', '0183', '0184', '0185', '0186', '0187', '0191', '0192',
  '0193', '0194', '0195', '0197', '0198', '0220', '0223', '0224', '0225', '0226', '0228',
  '0229', '0233', '0234', '0235', '0237', '0238', '0240', '0241', '0242', '0243', '0244',
  '0246', '0247', '0248', '0250', '0254', '0255', '0256', '0257', '0258', '0259', '0260',
  '0261', '0263', '0264', '0265', '0266', '0267', '0268', '0269', '0270', '0274', '0276',
  '0277', '0278', '0279', '0280', '0282', '0283', '0284', '0285', '0287', '0288', '0289',
  '0291', '0293', '0294', '0295', '0296', '0297', '0299', '0422', '0428', '0436', '0438',
  '0439', '0460', '0463', '0465', '0466', '0467', '0470', '0475', '0476', '0478', '0479',
  '0480', '0493', '0494', '0495', '0531', '0532', '0533', '0536', '0537', '0538', '0539',
  '0544', '0545', '0547', '0548', '0550', '0551', '0553', '0554', '0555', '0556', '0557',
  '0558', '0561', '0562', '0563', '0564', '0565', '0566', '0567', '0568', '0569', '0572',
  '0573', '0574', '0575', '0576', '0577', '0578', '0581', '0584', '0585', '0586', '0587',
  '0594', '0595', '0596', '0597', '0598', '0599', '0721', '0725', '0735', '0736', '0737',
  '0738', '0739', '0740', '0742', '0743', '0744', '0745', '0746', '0747', '0748', '0749',
  '0761', '0763', '0765', '0766', '0767', '0768', '0770', '0771', '0772', '0773', '0774',
  '0776', '0778', '0779', '0790', '0791', '0794', '0795', '0796', '0797', '0798', '0799',
  '0820', '0823', '0824', '0826', '0827', '0829', '0833', '0834', '0835', '0836', '0837',
  '0838', '0845', '0846', '0847', '0848', '0852', '0853', '0854', '0855', '0856', '0857',
  '0858', '0859', '0863', '0865', '0866', '0867', '0868', '0869', '0875', '0877', '0879',
  '0880', '0883', '0884', '0885', '0887', '0889', '0892', '0893', '0894', '0895', '0896',
  '0897', '0898', '0920', '0930', '0940', '0942', '0943', '0944', '0946', '0947', '0948',
  '0949', '0950', '0952', '0954', '0955', '0956', '0957', '0959', '0964', '0965', '0966',
  '0967', '0968', '0969', '0972', '0973', '0974', '0977', '0978', '0979', '0980', '0982',
  '0983', '0984', '0985', '0986', '0987', '0993', '0994', '0995', '0996', '0997',
]);

// Domestic 5-char prefixes (0 + 4-digit area, e.g. 小笠原 04998). 10-digit numbers
// starting with these are 5-1-4. Same source as AREA4. Checked before AREA4.
const AREA5 = new Set([
  '01267', '01372', '01374', '01377', '01392', '01397', '01398', '01456', '01457', '01466',
  '01547', '01558', '01564', '01586', '01587', '01632', '01634', '01635', '01648', '01654',
  '01655', '01656', '01658', '04992', '04994', '04996', '04998', '05769', '05979', '07468',
  '08387', '08388', '08396', '08477', '08512', '08514', '09802', '09912', '09913', '09969',
]);

export function splitTel(d: string): string[] {
  if (/^0(120|800)/.test(d) && d.length === 10) return [d.slice(0, 4), d.slice(4, 7), d.slice(7)];
  if (d.length === 11) return [d.slice(0, 3), d.slice(3, 7), d.slice(7)];
  if (/^0[36]/.test(d)) return [d.slice(0, 2), d.slice(2, 6), d.slice(6)];
  if (d.length === 10 && AREA5.has(d.slice(0, 5))) return [d.slice(0, 5), d.slice(5, 6), d.slice(6)];
  if (d.length === 10 && AREA4.has(d.slice(0, 4))) return [d.slice(0, 4), d.slice(4, 6), d.slice(6)];
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)];
}

export const splitZip = (d: string): [string, string] => [d.slice(0, 3), d.slice(3)];

export function wantsHyphen(
  placeholder: string,
  maxLength: number | null,
  kind: 'tel' | 'zip',
): boolean {
  // PBI-121: the hyphen family lives in dashes.ts, shared with literals.norm.
  // The old /[-‐－−]/ missed the typographic kinds (– U+2013, — U+2014,
  // ― U+2015), so a placeholder spelled with them produced a digits-only
  // value; every family kind now fires the same hyphenated format.
  if (hasHyphen(placeholder)) return true;
  if (maxLength !== null) return maxLength >= (kind === 'tel' ? 13 : 8);
  return false;
}

// PBI-120: width-forcing pages. The pattern attribute is the only width claim
// source — an example placeholder is not an enforced constraint, and the
// example prefixes the matchers already strip would over-fire once normalized.
// The claim drives a whole-value rewrite of the existing categories, never a
// new category (a half-width-only or full-width-only pattern shapes the value
// the same category already produces).
// Decodes the literal \uXXXX escapes an HTML pattern attribute holds as text.
// Local to this module because kana.ts imports formatters; a shared home here
// is the cycle-free side of that import.
const decodePatternEscapes = (p: string) =>
  p.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

// Quantifier bounds are counts, not required characters: [ぁ-ん]{2,10} asks for
// 2-10 hiragana, not for the digits 2 and 10. Stripped before the claim scan so
// a length constraint never reads as a half-width claim.
const stripQuantifiers = (p: string) => p.replace(/\{\d*(,\d*)?\}/g, '');

// Character-class interiors are the only place a pattern spells required
// characters: the 'p' of \p{Katakana}, the 'u' of \u{1F600}, and the POSIX name
// alpha are ASCII words, not half-width evidence, so the literal scan runs
// inside [...] only. An escaped '\[' never opens a class, and a [:...:] POSIX
// token is consumed as one unit so the outer bracket still finds the real ']'.
const classInteriors = (p: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '\\') { i++; continue; }
    if (p[i] !== '[') continue;
    let inner = '';
    let j = i + 1;
    let closed = false;
    while (j < p.length) {
      if (p[j] === '\\' && j + 1 < p.length) { inner += p.slice(j, j + 2); j += 2; continue; }
      if (p[j] === '[' && p[j + 1] === ':') {
        const end = p.indexOf(':]', j + 2);
        const token = end === -1 ? p.slice(j) : p.slice(j, end + 2);
        inner += token;
        j += token.length;
        continue;
      }
      if (p[j] === ']') { closed = true; break; }
      inner += p[j]!;
      j++;
    }
    if (closed) out.push(inner);
    i = j;
  }
  return out;
};

// Half evidence is the ASCII word block plus the whole half-width kana block
// (｡ U+FF61 - ﾟ U+FF9F, the HALF table's range — the old ｦ U+FF66 start missed
// ｡｢｣､･); full evidence is the full-width ASCII block (０-９Ａ-Ｚａ-ｚ！-～) and
// the kana range, as before.
const HALF_RANGES: readonly (readonly [number, number])[] = [
  [0x30, 0x39], [0x41, 0x5a], [0x61, 0x7a], [0xff61, 0xff9f],
];
const FULL_RANGES: readonly (readonly [number, number])[] = [
  [0xff01, 0xff5e], [0x3040, 0x30ff],
];
const overlaps = (ranges: readonly (readonly [number, number])[], lo: number, hi: number): boolean =>
  ranges.some(([a, b]) => lo <= b && hi >= a);
const inRanges = (ranges: readonly (readonly [number, number])[], code: number): boolean =>
  ranges.some(([a, b]) => code >= a && code <= b);

const classEvidence = (inner: string): { half: boolean; full: boolean } => {
  // (a) A negated class states a prohibition, not a requirement: the requested
  // direction stays unknown ('[^０-９]' forbids full-width digits), so this
  // class claims nothing.
  if (inner.startsWith('^')) return { half: false, full: false };
  // (b) Property names, POSIX class names, and ES6 escapes are ASCII words:
  // stripped so none of their letters read as half-width literals.
  const scanned = inner
    .replace(/\\[pP]\{[^}]*\}/g, '')
    .replace(/\\u\{[0-9a-fA-F]+\}/g, '');
  let half = false;
  let full = false;
  for (let i = 0; i < scanned.length; i++) {
    const c = scanned[i]!;
    if (c === '[' && scanned[i + 1] === ':') {
      const end = scanned.indexOf(':]', i + 2);
      i = end === -1 ? scanned.length : end + 1;
      continue;
    }
    if (c === '\\') {
      const next = scanned[i + 1];
      // (c) \d and \w spell digit/word characters; the negated shorthands
      // (\D/\W) and \s spell exclusions, so none of those claims a direction.
      if (next === 'd' || next === 'w') half = true;
      i++;
      continue;
    }
    if (scanned[i + 1] === '-' && scanned[i + 2] !== undefined && scanned[i + 2] !== ']') {
      // (d) A range claims its whole covered span, judged from the endpoints
      // (' -~' covers the ASCII printable block → half evidence).
      const lo = c.charCodeAt(0);
      const hi = scanned[i + 2]!.charCodeAt(0);
      if (lo <= hi) {
        half ||= overlaps(HALF_RANGES, lo, hi);
        full ||= overlaps(FULL_RANGES, lo, hi);
      }
      i += 2;
      continue;
    }
    if (c === '-') continue; // a literal dash (class edge), no width claim
    const code = c.charCodeAt(0);
    half ||= inRanges(HALF_RANGES, code);
    full ||= inRanges(FULL_RANGES, code);
  }
  return { half, full };
};

// 'full' when a character class spells full-width forms (全角数字のみ [０-９],
// 全角英数 [Ａ-Ｚａ-ｚ], any kana range), 'half' when a class spells half-width
// ones ([0-9a-zA-Z], [ｦ-ﾟ], [ -~]) or the pattern uses \d/\w, null when it
// claims nothing or both ([0-9０-９] accepts either width, so no rewrite is
// justified). Only class interiors carry literal evidence; regex syntax cannot
// pose as required characters.
export function detectWidthKind(pattern: string): 'full' | 'half' | null {
  if (pattern === '') return null;
  const required = stripQuantifiers(decodePatternEscapes(pattern));
  // \d/\w keep their whole-pattern claim (a bare ^\d{3}-\d{4}$ is a half-width
  // digit requirement); the literal scan is class-interiors only.
  let half = /\\[dw]/.test(pattern);
  let full = false;
  for (const inner of classInteriors(required)) {
    const e = classEvidence(inner);
    half ||= e.half;
    full ||= e.full;
  }
  if (half && full) return null;
  return full ? 'full' : half ? 'half' : null;
}

// Half→full is the new direction (the reverse existed as toHalfKatakana and the
// matchers' NFKC). ASCII printable (U+0021-U+007E) shifts by 0xFEE0; half-width
// kana maps through the inverted kana table, and NFC re-composes the voiced
// marks toHalfKatakana NFD-split (ｶ+ﾞ → ガ). The space stays out of the shift:
// rewriting it would silently reshape the user's name separator, which
// detectNameSeparator owns. Contract with clean: clean (NFKC+trim) owns option
// and profile canonicalization and is never applied here — a value arriving in
// valueFor is already profile-shaped, and NFKC here would undo the shift.
// Length: the 0xFEE0 shift is length-preserving, but the trailing NFC runs on
// the whole value and re-composes width-agnostic columns too (a hangul jamo
// cluster, a lone ﾞ → U+3099), so the conversion CAN change the code-unit
// length; the maxlength judgment in buildPlan therefore runs on the converted
// value, never on the raw (planner).
const HALF_TO_FULL = new Map([...HALF].map((c, i) => [c, FULL[i]!]));
// ﾞ/ﾟ sit outside the FULL/HALF tables (toHalfKatakana NFD-splits voiced kana
// instead); mapped to the combining marks so NFC can compose them.
HALF_TO_FULL.set('ﾞ', '゙');
HALF_TO_FULL.set('ﾟ', '゚');

export function toFullWidth(s: string): string {
  return [...s]
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 0x21 && code <= 0x7e) return String.fromCharCode(code + 0xfee0);
      return HALF_TO_FULL.get(c) ?? c;
    })
    .join('')
    .normalize('NFC');
}

// Full→half covers the full-width ASCII block only (0xFEE0 back-shift). Kana
// stays: half-width kana output is toHalfKatakana's contract via kanaKind, so a
// width-forcing pattern never rewrites kana twice. A stored full-width
// zip/tel then passes a half-width-only page pattern without a profile edit.
export function toHalfWidth(s: string): string {
  return [...s]
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 0xff01 && code <= 0xff5e ? String.fromCharCode(code - 0xfee0) : c;
    })
    .join('');
}
