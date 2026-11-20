import { ownLegend } from './dispatch-kit';
import type { MatcherEntry } from './dispatch-kit';
import { norm } from './literals';
import type { FieldMeta, SelectOption } from './types';

export const GENDER = /性別|せいべつ|ジェンダー|gender|(^|[^a-z])sex([^a-z]|$)/;
// A numeric age text box (年齢を数字で入力) must not qualify: only selects
// and radio groups whose options carry decade (代) readings are decade fields.
export const AGE = /年齢|年代|ねんだい|年齢層|age/;
export const hasDecadeOptions = (o: SelectOption[]) => o.some((s) => /代/.test(s.text));

// PBI-212: website field vocabulary (School Website etc.). A field that wants a
// URL reads apart from the school-name field, and no-fill is safer than a wrong
// school-name fill, so it is excluded from classification (the misreading
// candidate from the PBI-208 implementation record; the website vocabulary is
// decided before the school-name field). norm lowercases, so website is
// lowercase only; url is guarded by word boundaries (same shape as the cc
// pattern in NAME_EXCLUDE that avoids false picks like curl).
export const WEBSITE = /website|web.?site|(^|[^a-z])url([^a-z]|$)/;
// PBI-224: site search box exclusion names (exact-match list). Only fields with
// empty label and nearby and type text/search are targeted. Derived names
// (companyEmail etc.) never match. placeholder is not in the empty condition
// because search boxes carry it too (Search, Keyword input, etc.). The
// comparison goes through norm, so uppercase and fullwidth Q are also caught.
export const SEARCH_BOX_NAME: ReadonlySet<string> = new Set(['q', 'query', 'keyword', 'kw', 's']);
export const isSearchBox = (m: FieldMeta): boolean =>
  (m.type === 'text' || m.type === 'search')
  && m.label.trim() === '' && m.nearby.trim() === ''
  && SEARCH_BOX_NAME.has(norm(m.name.trim()));

// Entry order inside each array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order. gender and age are separate arrays
// because their entries are not contiguous in that order.
export const genderEntries: readonly MatcherEntry[] = [
  // gender: field itself (0.7) outranks a shared heading (0.65).
  ...ownLegend(GENDER, 'gender'),
];

export const ageEntries: readonly MatcherEntry[] = [
  // age: option fields with decade readings only.
  ...ownLegend(AGE, 'ageDecade', (ctx) => ctx.isOptionField && hasDecadeOptions(ctx.m.options)),
];
