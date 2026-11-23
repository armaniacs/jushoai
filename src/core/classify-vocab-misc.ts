import { ownLegend } from './dispatch-kit';
import type { MatcherEntry } from './dispatch-kit';
import { buildFieldNormViews, norm } from './literals';
import type { FieldMeta, SelectOption } from './types';

const GENDER = /性別|せいべつ|ジェンダー|gender|(^|[^a-z])sex([^a-z]|$)/;
// A numeric age text box (年齢を数字で入力) must not qualify: only selects
// and radio groups whose options carry decade (代) readings are decade fields.
const AGE = /年齢|年代|ねんだい|年齢層|age/;
const hasDecadeOptions = (o: SelectOption[]) => o.some((s) => /代/.test(s.text));

// Website field vocabulary (School Website etc.). A field that wants a
// URL reads apart from the school-name field, and no-fill is safer than a wrong
// school-name fill, so it is excluded from classification (the website
// vocabulary is decided before the school-name field). norm lowercases, so website is
// lowercase only; url is guarded by word boundaries (same shape as the cc
// pattern in NAME_EXCLUDE that avoids false picks like curl).
export const WEBSITE = /website|web.?site|(^|[^a-z])url([^a-z]|$)/;
// Site search box exclusion names (exact-match list). Only fields with
// empty label and nearby and type text/search are targeted. Derived names
// (companyEmail etc.) never match. placeholder is not in the empty condition
// because search boxes carry it too (Search, Keyword input, etc.). The
// comparison goes through norm, so uppercase and fullwidth Q are also caught.
const SEARCH_BOX_NAME: ReadonlySet<string> = new Set(['q', 'query', 'keyword', 'kw', 's']);
export const isSearchBox = (m: FieldMeta): boolean =>
  (m.type === 'text' || m.type === 'search')
  && m.label.trim() === '' && m.nearby.trim() === ''
  && SEARCH_BOX_NAME.has(norm(m.name.trim()));

// A combobox search-assist window (the visible filter box of a juku combo)
// only narrows the displayed options and never holds the submitted value,
// so the juku reading must not take a fill here. The page declares the
// window through its own placeholder carrying both the juku word and 検索
// (塾を検索（入力検索可）); the juku word keeps fields with a mere
// search-flavored placeholder (会社名 + 住所 …で検索) on their own reading.
// label/nearby take no empty condition, unlike isSearchBox: the window
// carries its row heading in nearby.
const JUKU_SEARCH_PLACEHOLDER = /塾.*検索|検索.*塾/;
export const isJukuSearchWindow = (m: FieldMeta): boolean =>
  m.tag === 'input'
  && (m.type === 'text' || m.type === 'search')
  && JUKU_SEARCH_PLACEHOLDER.test(buildFieldNormViews(m).placeholder);

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
