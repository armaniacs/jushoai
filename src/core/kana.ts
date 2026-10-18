import type { Category, FieldMeta, Item, KanaKind } from './types';
import { stripExample } from './formatters';
import { norm } from './literals';

// Token table, the single source of kana vocabulary. Shared tokens fire on
// field-owned strings and on legends; short readings fire on field-owned
// strings only: they collide with notice boilerplate in shared legends
// (最後までお読みください・作成してください). Adding a token means choosing
// its legend flag here, not editing a second literal elsewhere.
const KANA_SHARED = ['kana', 'furigana', 'yomi', 'フリガナ', 'ふりがな', 'フリカナ', 'カナ', 'ひらがな'] as const;
const KANA_FIELD_ONLY = ['読み', 'セイ', 'メイ', 'せい', 'めい'] as const;
// Tokens are matched literally: escape before joining so a future token
// containing regex syntax cannot change the pattern's shape.
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KANA = new RegExp([...KANA_SHARED, ...KANA_FIELD_ONLY].map(escapeRegExp).join('|'));
const KANA_HEADING = new RegExp(KANA_SHARED.map(escapeRegExp).join('|'));

// Pre-normalized views for one field, built once per field before the
// classifyField sources loop so the same raw string is never
// normalize('NFKC')d twice for a field.
// matchFieldOwned / matchLegend keep their normalized-input contract: callers
// pass these views, never raw strings. The pattern attribute stays raw-owned:
// hasKanaPattern normalizes its own decoded view (a distinct source), and
// half-width checks must read the pre-normalization text.
export interface KanaNorm {
  /** norm(m.placeholder). */
  placeholder: string;
  /** norm([m.name, m.htmlId, m.label].join(' ')). */
  nameIdLabel: string;
  /** norm(m.nearby), shared with the classifyField legend view. */
  nearby: string;
}

// Vocabulary queries over already-normalized text (callers pass the norm
// view): field-owned matches for name/id/label, legend matches for nearby.
export function matchFieldOwned(normalized: string): boolean {
  return KANA.test(normalized);
}

export function matchLegend(normalized: string): boolean {
  return KANA_HEADING.test(normalized);
}

// Decodes the literal \uXXXX escapes an HTML pattern attribute holds as text; only
// the regex engine interprets them, so kana-range checks on the raw string see none.
const decodePattern = (p: string) =>
  p.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

// Pattern-attribute kana checks, shared by wantsKana / wantsKanaOwnMeta /
// detectKanaKind so the three never drift. Full-width ranges match on the
// NFKC-normalized view (covers decomposed kana such as か+U+3099, which
// composes to が); half-width katakana matches on the raw decoded view
// because NFKC full-widths ｦ-ﾟ and a normalized-only check would miss it.
const decodedPattern = (m: FieldMeta): string => decodePattern(m.pattern);

const hasKanaPattern = (m: FieldMeta): boolean => {
  const pat = decodedPattern(m);
  return /[ぁ-ゖァ-ヶ]/.test(norm(pat)) || /[ｦ-ﾟ]/.test(pat);
};

const hasHalfKanaPattern = (m: FieldMeta): boolean => /[ｦ-ﾟ]/.test(decodedPattern(m));

const hasHiraganaPattern = (m: FieldMeta): boolean => /[ぁ-ゖ]/.test(norm(decodedPattern(m)));

const hasKatakanaPattern = (m: FieldMeta): boolean => /[ァ-ヶ]/.test(norm(decodedPattern(m)));

// True when the field asks for kana rather than kanji: a kana-only placeholder,
// kana vocabulary in name/id/label/legend, or a kana-only pattern. A kanji or
// latin placeholder means the field wants a plain name, whatever the heading says.
// pre carries the classifyField entrance views so the same raw string is not
// normalized twice; without it each source is normed here (resolveKana path).
export function wantsKana(m: FieldMeta, pre?: KanaNorm): boolean {
  const ph = stripExample(pre?.placeholder ?? norm(m.placeholder));
  if (ph !== '' && /[一-龠a-z]/.test(ph)) return false;
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (matchFieldOwned(pre?.nameIdLabel ?? norm([m.name, m.htmlId, m.label].join(' ')))) return true;
  if (matchLegend(pre?.nearby ?? norm(m.nearby))) return true;
  return hasKanaPattern(m);
}

// True when the field itself claims kana through placeholder, name/id/label, or pattern —
// evidence that belongs to this field, unlike a legend shared with sibling rows.
export function wantsKanaOwnMeta(m: FieldMeta): boolean {
  const ph = stripExample(norm(m.placeholder));
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (matchFieldOwned(norm([m.name, m.htmlId, m.label].join(' ')))) return true;
  return hasKanaPattern(m);
}

export function detectKanaKind(m: FieldMeta): KanaKind {
  // Half-width katakana is full-widthed by NFKC, so this branch must read the
  // raw placeholder before normalization; everything below shares the norm view.
  const rawPh = stripExample(m.placeholder);
  if (rawPh !== '' && /^[ｦ-ﾟ\s]+$/.test(rawPh)) return 'halfKatakana';
  const ph = stripExample(norm(m.placeholder));
  if (/^[ぁ-ゖー\s　]+$/.test(ph)) return 'hiragana';
  if (/^[ァ-ヶー\s　]+$/.test(ph)) return 'katakana';
  if (hasHalfKanaPattern(m)) return 'halfKatakana';
  if (hasHiraganaPattern(m)) return 'hiragana';
  if (hasKatakanaPattern(m)) return 'katakana';
  const text = norm([m.label, m.nearby, m.placeholder].join(' '));
  // ﾊﾝｶｸ normalizes to ハンカク, so the half-width spelling is checked raw.
  if (/半角カナ|半角カタカナ|ハンカク/.test(text) || /ﾊﾝｶｸ/.test(rawPh)) return 'halfKatakana';
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
// Resolves kana attribution and returns the same array: callers thread the
// return value through (const resolved = resolveKana(items)) instead of
// relying on the in-place update alone, so the data flow reads explicitly.
export function resolveKana(items: Item[]): Item[] {
  // The kana decision cannot ride any single classification route: autocomplete reports
  // family-name for both the kanji and the furigana pair, so it is applied once here,
  // after rules and the LLM, before refinement groups the pairs.
  // Each field's kana predicates run at most once per call: own-kana evidence is
  // precomputed for the sibling guard below, and wantsKana only for kana-eligible rows.
  const flags = items.map((item) => ({
    item,
    own: wantsKanaOwnMeta(item.meta),
    target: KANA_CATEGORY[item.cls.category],
  }));
  const kanaByOwnMeta = new Set(
    flags.filter((f) => f.own).map((f) => f.item.meta.nearby),
  );
  for (const f of flags) {
    if (!f.target || !wantsKana(f.item.meta)) continue;
    // An empty legend is shared by every legend-less field: it must not act
    // as a section signal that suppresses kana attribution elsewhere.
    if (!f.own && f.item.meta.nearby !== '' && kanaByOwnMeta.has(f.item.meta.nearby)) continue;
    f.item.cls.category = f.target;
    f.item.cls.kanaKind = detectKanaKind(f.item.meta);
  }
  return items;
}
