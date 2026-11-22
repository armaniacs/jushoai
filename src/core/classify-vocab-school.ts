import { matchAs, ownLegend } from './dispatch-kit';
import type { MatcherEntry } from './dispatch-kit';
import { hasOwnDeptName } from './classify-vocab-office';

// The English institution labels (Institution/Institute) belong to the
// school-name field vocabulary. So that "Name of Institution ..." is not picked
// up as a person name (FULL_NAME's name word), it is decided first as the
// school pre-pass vocabulary (the reading order is unchanged: the school entry
// returns before the name sources, per the existing definition order;
// fixture-first).
const SCHOOL = /学校|school|univ|college|高校|大学|institution|institute/;
const DEPT = /学部|学科|専攻|department|major|faculty/;
// A grade box is a fill target only as a select or a text box: the decade radio
// shapes stay bundled-skipped, and a decade/age wording never reads as a grade.
// A vehicle trim (car grade) shares the romaji word but is never a school year.
const GRADE = /学年|がくねん|(^|[^a-z])grade([^a-z]|$)/;
const NOT_GRADE = /年代|年齢|ねんだい|(^|[^a-z])age([^a-z]|$)|(^|[^a-z])car([^a-z]|$)|車/;
const isGradeField = (ctx: { m: { tag: string }; ownText: string }): boolean =>
  (ctx.m.tag === 'select' || ctx.m.tag === 'input') && !NOT_GRADE.test(ctx.ownText);
// A juku box is never a school fill target: the visible text box reads as the
// juku target, while the combo behind it (the hidden selects and the state
// inputs the page script syncs) stays a confident unknown (out of the LLM send
// set and out of the plan, like the search-box shape) instead of taking a fill.
const JUKU = /塾|juku/;
const COMBO_JUKU = /juku(state|todofuken|shikuchoson|cd)/;
const isVisibleJuku = (ctx: { m: { tag: string }; ownText: string }): boolean =>
  ctx.m.tag === 'input' && !COMBO_JUKU.test(ctx.ownText);
// The school cascade (the prefecture/city filters narrowing the school list)
// shares the school heading but never takes the school value: the filters stay
// unknown instead of riding the school or the address-prefecture reading.
const CASCADE_FILTER = /todofuken|shikuchoson/;
const CASCADE_CTX = /学校|出身|小学校|shussin|school/;

// Entry order inside this array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order.
export const schoolEntries: readonly MatcherEntry[] = [
  {
    name: 'cascade-filter-own',
    match: (ctx) => (
      CASCADE_FILTER.test(ctx.ownText) && CASCADE_CTX.test(ctx.ownText) ? matchAs('unknown', 0.7) : null
    ),
  },
  {
    name: 'juku-own',
    match: (ctx) => (
      JUKU.test(ctx.ownText) && isVisibleJuku(ctx) ? matchAs('juku', 0.7) : null
    ),
  },
  {
    name: 'school-grade-own',
    match: (ctx) => (
      GRADE.test(ctx.ownText) && isGradeField(ctx) ? matchAs('schoolGrade', 0.7) : null
    ),
  },
  {
    name: 'juku-hidden-own',
    match: (ctx) => (
      JUKU.test(ctx.ownText) && !isVisibleJuku(ctx) ? matchAs('unknown', 0.7) : null
    ),
  },
  {
    name: 'juku-legend',
    match: (ctx) => (JUKU.test(ctx.legendText) ? matchAs('unknown', 0.65) : null),
  },
  // school / department: field itself (0.7) outranks a shared heading (0.65).
  // The school department entry yields when the field itself carries a
  // Japanese 部署名 word (the company-department signal outranks the English
  // token); bare 部署 keeps the school reading.
  ...ownLegend(SCHOOL, 'school'),
  ...ownLegend(DEPT, 'department', (ctx) => !hasOwnDeptName(ctx.ownText)),
];
