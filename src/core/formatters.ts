import type { KanaKind } from './types';

const FULL = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォッャュョー・';
const HALF = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｯｬｭｮｰ･';
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
  const p = placeholder.replace(/^例[)）:：]?/, '').trim();
  if (p.includes('　')) return '　';
  if (p.includes(' ')) return ' ';
  if (/^[぀-ヿ一-鿿]{2,}$/.test(p)) return '';
  return ' ';
}

export const joinName = (last: string, first: string, sep: string) => `${last}${sep}${first}`;

export function splitTel(d: string): string[] {
  if (/^0(120|800)/.test(d) && d.length === 10) return [d.slice(0, 4), d.slice(4, 7), d.slice(7)];
  if (d.length === 11) return [d.slice(0, 3), d.slice(3, 7), d.slice(7)];
  if (/^0[36]/.test(d)) return [d.slice(0, 2), d.slice(2, 6), d.slice(6)];
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)];
}

export const splitZip = (d: string): [string, string] => [d.slice(0, 3), d.slice(3)];

export function wantsHyphen(
  placeholder: string,
  maxLength: number | null,
  kind: 'tel' | 'zip',
): boolean {
  if (/[-‐－−]/.test(placeholder)) return true;
  if (maxLength !== null) return maxLength >= (kind === 'tel' ? 13 : 8);
  return false;
}
