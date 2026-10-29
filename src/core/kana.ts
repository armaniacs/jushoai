import type { Category, FieldMeta, Item, KanaKind } from './types';
import { stripExample } from './formatters';
import type { FieldNormViews } from './literals';
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

// PBI-44: KanaNormはFieldNormViewsからの派生ビュー（第1段階の使い回し）。
// 同一rawの再normはなく、placeholder・nameIdLabel・nearbyは入口ビューと
// 同一文字列になる。wantsKana(m, pre)に渡すpreはここから作ること。
export function kanaNormFromViews(v: FieldNormViews): KanaNorm {
  return { placeholder: v.placeholder, nameIdLabel: v.nameIdLabel, nearby: v.legendText };
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

// Kana evidence module: per-source kana evidence for one field, judged in one
// place so the two wants readings below compose it instead of re-implementing
// it. Adding a source means adding one judgment here and naming it in each
// composition, never a second copy of the rule. Clause order is the
// precedence: the veto wins, then placeholder, own-text, legend, pattern.
//
//   full     = placeholderRejectsKana ? false
//            : placeholderAsksKana || ownTextAsksKana || legendAsksKana
//              || patternAsksKana
//   own-meta = placeholderAsksKana || ownTextAsksKana || patternAsksKana
//
// The veto and the legend source are named branches of the full reading only;
// the own-meta reading omits both on purpose:
// - no veto: wantsKanaOwnMeta feeds resolveKana's sibling guard, which must
//   still see every row that claims kana for itself even when its placeholder
//   is a plain name. A veto there would drop that row from the guard's
//   own-evidence set, the shared legend would stop reading as section
//   evidence, and the plain-name sibling row would flip to kana (s1/s2-style
//   forms).
// - no legend: a legend is shared with sibling rows, so it describes the
//   section, not the row itself; resolveKana's guard owns that asymmetry.

// Evidence views, the shared pre-fallback contract in one place. pre carries
// the classifyField entrance views (kanaNormFromViews) so the classify route
// normalizes nothing here; without it each consulted source norms its own raw
// string (resolveKana path). Callers pass these views, never raw strings: the
// judgments below keep the normalized-input contract of the vocabulary
// queries.
const placeholderView = (m: FieldMeta, pre?: KanaNorm): string =>
  stripExample(pre?.placeholder ?? norm(m.placeholder));
const ownTextView = (m: FieldMeta, pre?: KanaNorm): string =>
  pre?.nameIdLabel ?? norm([m.name, m.htmlId, m.label].join(' '));
const legendView = (m: FieldMeta, pre?: KanaNorm): string =>
  pre?.nearby ?? norm(m.nearby);

// placeholder: a kanji or latin placeholder means the field wants a plain name
// (the veto), a kana-only one asks for kana.
const placeholderRejectsKana = (ph: string): boolean =>
  ph !== '' && /[一-龠a-z]/.test(ph);
const placeholderAsksKana = (ph: string): boolean =>
  ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph);
// own-text: kana vocabulary in name/id/label (full token set).
const ownTextAsksKana = (normalized: string): boolean => matchFieldOwned(normalized);
// legend: kana vocabulary in the shared heading (shared tokens only).
const legendAsksKana = (normalized: string): boolean => matchLegend(normalized);
// pattern: a kana range in the pattern attribute (decoded and NFKC'd inside).
const patternAsksKana = (m: FieldMeta): boolean => hasKanaPattern(m);

// True when the field asks for kana rather than kanji: the full reading above.
// pre carries the classifyField entrance views so the same raw string is not
// normalized twice; without it each consulted source is normed here
// (resolveKana path).
export function wantsKana(m: FieldMeta, pre?: KanaNorm): boolean {
  const ph = placeholderView(m, pre);
  if (placeholderRejectsKana(ph)) return false;
  if (placeholderAsksKana(ph)) return true;
  if (ownTextAsksKana(ownTextView(m, pre))) return true;
  if (legendAsksKana(legendView(m, pre))) return true;
  return patternAsksKana(m);
}

// True when the field itself claims kana through placeholder, name/id/label, or
// pattern: the own-meta reading above — no veto, no legend.
export function wantsKanaOwnMeta(m: FieldMeta): boolean {
  const ph = placeholderView(m);
  return placeholderAsksKana(ph) || ownTextAsksKana(ownTextView(m)) || patternAsksKana(m);
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
// refinement groups the pairs. Every production entry reaches this seam through
// classifyRulePipeline (PBI-150): a caller that hand-composes classifyField +
// refineClassifications silently keeps kanji bases. A legend shared with a
// sibling that claims kana through its own attributes describes the section,
// not each row: heading evidence alone must not flip plain-name rows (e.g. a
// kanji 姓 row inside a お名前（フリガナ）fieldset).
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
  // PBI-160: terminal kana categories (companyNameKana) resolve their own
  // attribution in classifyField and never ride KANA_CATEGORY above, so the
  // conversion loop leaves their category untouched. They still need a
  // kanaKind, so the suffix rule applies here as the single owner (PBI-197):
  // the LLM merge branch's own category.endsWith('Kana') → detectKanaKind
  // spread is gone, and every entrance threading resolveKana
  // (classifyRulePipeline, classifyAll, mergeClassified) is backfilled by
  // this loop alone.
  for (const { item } of flags) {
    if (item.cls.category.endsWith('Kana') && item.cls.kanaKind === undefined) {
      item.cls.kanaKind = detectKanaKind(item.meta);
    }
  }
  return items;
}
