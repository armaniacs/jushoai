// PBI-121: the single home of the hyphen-family unification, shared by the
// zip/tel formatting (formatters) and the classification normalization
// (literals.norm), so the two never drift on which dash kinds count as the
// hyphen family. NFKC folds only U+FF0D, so the typographic hyphens below
// survived both the format decision and the rule matchers: a placeholder like
// 100–0001 (en dash) produced a digits-only value, and the same word spelled
// with a different dash kind (e-mail / e–mail) classified differently.
// Token-table pattern (kana.ts): a const table, escapeRegExp before joining,
// and one predicate per purpose.
const HYPHEN = '-';

// Every kind a zip/tel placeholder may spell the hyphen with: ASCII '-' plus
// ‐ U+2010, – U+2013, — U+2014, ― U+2015, － U+FF0D, − U+2212.
// WHY U+2212 stays in the formatting family: it already fired the hyphenated
// format before this table existed (formatters carried it in /[-‐－−]/), so
// dropping it would regress pages relying on a minus-shaped placeholder — and
// the predicate only decides whether to hyphenate, it never rewrites a minus
// inside a value.
const HYPHEN_KINDS = ['-', '‐', '–', '—', '―', '－', '−'] as const;

// The kinds the classification fold leaves alone, named so the asymmetry with
// the 7-kind format family above reads from a constant instead of an array
// diff: ASCII '-' folds to itself (no-op), － U+FF0D is NFKC's own fold
// (literals.norm runs NFKC before unifyDashes), and − U+2212 is a minus, not a
// separator. WHY U+2212 stays out of the fold: a minus means arithmetic, not
// separation, and folding it would rewrite numeric semantics in any
// value-facing reuse of the table (values are never dash-folded — clean owns
// values and does not fold). U+30FC (ー) and the wave dashes (〜 U+301C,
// ～ U+FF5E) are not hyphen kinds either: the long-vowel mark is kana
// vocabulary (the profile validation accepts U+30FC only), and a wave dash is
// a range mark — the fixture pins both outside the family.
const NO_FOLD_KINDS = ['-', '－', '−'] as const;

// 分類 fold（4種）は整形 family（HYPHEN_KINDS 7種）からの減算で導出する: どの
// 種別が fold 対象外かは NO_FOLD_KINDS が一箇所で持つ。
const FOLD_KINDS = HYPHEN_KINDS.filter(
  (kind): kind is (typeof HYPHEN_KINDS)[number] =>
    !(NO_FOLD_KINDS as readonly string[]).includes(kind),
);

// Tokens are matched literally: escape before joining so a future kind
// containing regex syntax cannot change the pattern's shape (kana.ts:13-15).
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const HYPHEN_FAMILY = new RegExp(HYPHEN_KINDS.map(escapeRegExp).join('|'));
const FOLD_PATTERN = new RegExp(FOLD_KINDS.map(escapeRegExp).join('|'), 'g');

// Formatting predicate: the string spells a hyphenated zip/tel format. Shared
// by wantsHyphen so the format decision never drifts from the fold below.
export const hasHyphen = (s: string): boolean => HYPHEN_FAMILY.test(s);

// Classification fold: the typographic hyphens join ASCII '-' in matched
// text. literals.norm applies it after NFKC; values are never folded.
export function unifyDashes(s: string): string {
  return s.replace(FOLD_PATTERN, HYPHEN);
}
