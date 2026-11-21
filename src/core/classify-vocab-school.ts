import { ownLegend } from './dispatch-kit';
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

// Entry order inside this array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order.
export const schoolEntries: readonly MatcherEntry[] = [
  // school / department: field itself (0.7) outranks a shared heading (0.65).
  // The school department entry yields when the field itself carries a
  // Japanese 部署名 word (the company-department signal outranks the English
  // token); bare 部署 keeps the school reading.
  ...ownLegend(SCHOOL, 'school'),
  ...ownLegend(DEPT, 'department', (ctx) => !hasOwnDeptName(ctx.ownText)),
];
