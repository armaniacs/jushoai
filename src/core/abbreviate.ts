// PBI-122: deterministic building-name abbreviations, fixed by a rule table —
// never an LLM (CLAUDE.md: LLM classifies, core shapes values). Applied when a
// building-bearing field overflows its maxlength; the planner offers the
// shortened form as a preview choice and injects it only through the user's
// explicit approval (NOT-TODO 12: no unapproved truncation or omission).
//
// Two rules, both pure shortenings:
// 1. Only the full-width space goes: it is decorative in a building name, while
//    the half-width space carries the word gap of an English name
//    ('GREEN HEIGHTS 2' must survive intact — the old all-space strip crushed
//    it to 'GREENHEIGHTS2'). detectNameSeparator's separator work stays a
//    name-field concern; this rule never runs on name values.
// 2. A residence/building suffix shortens the TAIL, once: the table below is
//    ordered longest-first and the replacement applies only when the compacted
//    name ends with the suffix (s.slice + replacement, applied at most once —
//    no global replace). The old global replace corrupted compound names
//    mid-string ('コーポハイツ' → '邸邸', '第2コーポハイツ101号室' →
//    '第2邸邸101号室'); now 'コーポハイツ' → 'コーポ邸' and a name ending in
//    号室 keeps its shape. 邸 is the shortest generic residence suffix;
//    ビルディング shortens to ビル. Every replacement must strictly shorten —
//    a longer one (e.g. ビル→BLDG) can never rescue a fit, so nothing
//    lengthening is in the table.
const SUFFIX_SHORTENINGS = [
  ['ビルディング', 'ビル'],
  ['レジデンス', '邸'],
  ['マンション', '邸'],
  ['コーポラス', '邸'],
  ['アパート', '邸'],
  ['コーポ', '邸'],
  ['ハイツ', '邸'],
] as const;

// Longest-first scan, one replacement at the tail: entries are matched with
// endsWith (literal, no regex), so a token containing regex syntax cannot
// change the scan's shape.
export function abbreviateBuilding(s: string): string {
  const compact = s.replace(/　/g, '');
  for (const [suffix, replacement] of SUFFIX_SHORTENINGS) {
    if (compact.endsWith(suffix)) {
      return `${compact.slice(0, compact.length - suffix.length)}${replacement}`;
    }
  }
  return compact;
}
