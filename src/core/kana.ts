import type { Category, FieldMeta, KanaKind } from './types';
import { stripExample } from './formatters';
import { norm } from './literals';
import type { Item } from './classify-rules';

// Kana vocabulary: the single source of truth for kana signals. classify-rules.ts
// imports this for its fallback branch; the final kana attribution lives in
// resolveKana below, the only external seam of this module.
export const KANA = /kana|furigana|yomi|フリガナ|ふりがな|フリカナ|カナ|ひらがな|読み|セイ|メイ|せい|めい/;

// Decodes the literal \uXXXX escapes an HTML pattern attribute holds as text; only
// the regex engine interprets them, so kana-range checks on the raw string see none.
const decodePattern = (p: string) =>
  p.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

// True when the field asks for kana rather than kanji: a kana-only placeholder,
// kana vocabulary in name/id/label/legend, or a kana-only pattern. A kanji or
// latin placeholder means the field wants a plain name, whatever the heading says.
export function wantsKana(m: FieldMeta): boolean {
  const ph = stripExample(norm(m.placeholder));
  if (ph !== '' && /[一-龠a-z]/.test(ph)) return false;
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (KANA.test(norm([m.name, m.htmlId, m.label, m.nearby].join(' ')))) return true;
  const pat = decodePattern(m.pattern);
  return /[ぁ-ゖァ-ヶ]/.test(pat) || /[ｦ-ﾟ]/.test(pat);
}

// True when the field itself claims kana through placeholder, name/id/label, or pattern —
// evidence that belongs to this field, unlike a legend shared with sibling rows.
export function wantsKanaOwnMeta(m: FieldMeta): boolean {
  const ph = stripExample(norm(m.placeholder));
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (KANA.test(norm([m.name, m.htmlId, m.label].join(' ')))) return true;
  const pat = decodePattern(m.pattern);
  return /[ぁ-ゖァ-ヶ]/.test(pat) || /[ｦ-ﾟ]/.test(pat);
}

export function detectKanaKind(m: FieldMeta): KanaKind {
  const ph = stripExample(m.placeholder);
  if (/^[ｦ-ﾟ\s]+$/.test(ph)) return 'halfKatakana';
  if (/^[ぁ-ゖー\s　]+$/.test(ph)) return 'hiragana';
  if (/^[ァ-ヶー\s　]+$/.test(ph)) return 'katakana';
  const pat = decodePattern(m.pattern);
  if (/[ｦ-ﾟ]/.test(pat)) return 'halfKatakana';
  if (/ぁ|ぃ|ん/.test(pat)) return 'hiragana';
  if (/ァ|ア|ン/.test(pat)) return 'katakana';
  const text = [m.label, m.nearby, m.placeholder].join(' ');
  if (/半角カナ|半角カタカナ|ﾊﾝｶｸ/.test(text)) return 'halfKatakana';
  if (/カタカナ/.test(text)) return 'katakana';
  if (/ひらがな|ふりがな/.test(text)) return 'hiragana';
  return 'katakana';
}

const KANA_CATEGORY: Partial<Record<Category, Category>> = {
  lastName: 'lastNameKana',
  firstName: 'firstNameKana',
  fullName: 'fullNameKana',
};

// The single kana attribution seam. classifyField answers kana-blind (plain name
// bases only); this module converts bases to kana after rules and the LLM, before
// refinement groups the pairs. A legend shared with a sibling that claims kana
// through its own attributes describes the section, not each row: heading evidence
// alone must not flip plain-name rows (e.g. a kanji 姓 row inside a
// お名前（フリガナ）fieldset).
export function resolveKana(items: Item[]): Item[] {
  // The kana decision cannot ride any single classification route: autocomplete reports
  // family-name for both the kanji and the furigana pair, so it is applied once here,
  // after rules and the LLM, before refinement groups the pairs.
  const kanaByOwnMeta = new Set(
    items.filter((i) => wantsKanaOwnMeta(i.meta)).map((i) => i.meta.nearby),
  );
  for (const item of items) {
    const target = KANA_CATEGORY[item.cls.category];
    if (!target || !wantsKana(item.meta)) continue;
    if (!wantsKanaOwnMeta(item.meta) && kanaByOwnMeta.has(item.meta.nearby)) continue;
    item.cls.category = target;
    item.cls.kanaKind = detectKanaKind(item.meta);
  }
  return items;
}
