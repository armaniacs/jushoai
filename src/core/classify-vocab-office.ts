import { matchAs, ownLegend } from './dispatch-kit';
import type { MatcherEntry } from './dispatch-kit';
import { BIRTH_CTX } from './classify-vocab-birth';
import { KANA_NOTE } from './classify-vocab-name';
import { norm } from './literals';
import type { FieldMeta } from './types';

// 学校 is claimed by the school pre-pass in the dispatch order, so it stays out of
// this list; the office vocabulary (会社/法人/企業/店舗/部署) stays excluded except
// for the two new categories (PBI-119): officeEligible passes
// 会社名/法人・団体名/部署 alone through company/companyDepartment.
export const EXCLUDE = /company|corp|organi[sz]ation|会社|法人|部署|役職|企業|店舗/;
// PBI-119: fields with company words pass EXCLUDE only via
// company/companyDepartment (the relaxation boundary). Kana context
// (会社名（フリガナ）) and birth context (会社の生年月日) risk wrong fills, so
// they stay outside the relaxation and keep the plain EXCLUDE behavior. Other
// office words (役職/店舗/法人種別) are not relaxed either. The officeField gate
// and the DISPATCH extra gates share this one condition. 応募/申込 団体名
// (応募団体名・申込団体名) is the applicant-side organization, not a company
// profile fill target, so it is excluded via the negative lookbehinds
// (COMPANY_OFFICE itself carries the same shape of exclusion as officeEligible).
export const COMPANY_OFFICE = /(?:会社|法人|企業)名|(?:(?<!応募)(?<!申込)団体名)|社名/;
// T2: standalone 部署名 also reads as the company department (MS Forms
// 3.所属部署名 shape). The compound joint stays out: a 部署名 glued to a
// company word (会社名・部署名) keeps the company reading, so the negative
// lookbehinds hold the joint even if DISPATCH order ever changes. Bare /部署/
// would also swallow such joints, hence the narrower alternation.
export const DEPT_OFFICE = /(?:(?<!会社名・)(?<!法人名・)(?<!団体名・)(?<!社名・)(?<!企業名・)部署名|部署(?!名))/;
// A 部署名 glued to a company word (会社名・部署名, 企業名・部署名, and non-・
// separator variants such as 会社名/部署名) keeps the company reading. The
// joint holds even if DISPATCH order ever changes, so the standalone 部署名
// signal never fires there.
// PBI-232: single owner of the company-word vocabulary. The joint guards
// (hasCompoundDeptJoint / hasCompoundJobJoint) read this regex instead of
// re-describing it, so the next vocabulary addition keeps every guard in sync
// instead of leaving one behind.
export const COMPANY_WORD = /会社|法人|企業|団体|店舗|事業所|営業所|社/;
export const hasCompoundDeptJoint = (own: string): boolean =>
  /部署名/.test(own) && COMPANY_WORD.test(own);
// PBI-232: single owner of the kana-note/birth-context exclusion shared by the
// office gate predicates below.
export const officeContextExcluded = (own: string): boolean =>
  KANA_NOTE.test(own) || BIRTH_CTX.test(own);
export const officeEligible = (own: string): boolean => {
  if (officeContextExcluded(own)) return false;
  if (COMPANY_OFFICE.test(own)) return true;
  return DEPT_OFFICE.test(own) && !hasCompoundDeptJoint(own);
};
// The standalone 部署名 signal for the company-department entry: same gate
// as officeEligible but without the company-word alternative, so a joint
// never reads as the department even if DISPATCH order ever changes.
export const deptOfficeEligible = (own: string): boolean =>
  !officeContextExcluded(own)
  && DEPT_OFFICE.test(own) && !hasCompoundDeptJoint(own);
// F1: a Japanese 部署名 word outranks the English school token (sysmex
// name=department + 所属部署名 label reads as the company department, not
// the school department). Bare 部署 keeps the school reading, so the guard
// is 部署名-only and the other name=department fixtures stay unchanged.
export const hasOwnDeptName = (own: string): boolean =>
  officeEligible(own) && /部署名/.test(own);
// T3: standalone 役職/役職名 reads as the job title (MS Forms 4.役職名
// shape). A joint with a company or department word (部署名・役職名,
// 部署・役職, 会社名・役職名) never reads as the title: the department entry
// (which precedes the title entry) keeps the 部署 joints, and the joint block
// keeps the company-word shapes out. Kana/birth companions stay excluded with
// the office entries. The title has no legend entry on purpose: the only
// legend-only 役職 shape (tokyu-tenant job) stays unknown.
export const JOB_OFFICE = /役職/;
// The company-word half reads COMPANY_WORD itself (single vocabulary owner), so
// the next company-word addition keeps this job-title joint guard in sync;
// 部署 is the department-word half kept alongside it.
export const hasCompoundJobJoint = (own: string): boolean =>
  /役職/.test(own) && (COMPANY_WORD.test(own) || /部署/.test(own));
export const jobOfficeEligible = (own: string): boolean =>
  !officeContextExcluded(own) && JOB_OFFICE.test(own) && !hasCompoundJobJoint(own);
// PBI-119 + review feedback: the legend-side gate. The old legend gate
// (officeEligible) required an office-word match on the field itself, so shared
// heading cases like ご記入ください + a shared 会社名 heading were unreachable
// (when the own words match, the own entry already returns 0.7). This gate does
// not require a match on the field's own wording; it only applies the
// kana/birth context exclusions. Fields whose own words do match still never
// flow to the legend side (keeps the own matcher's 0.7 returning first in
// DispatchCtx definition order, and !COMPANY_OFFICE/!DEPT_OFFICE blocks the
// crossover case where a department field + a shared 会社名 heading would be
// adopted as company-legend 0.65).
// WHY compound labels (会社名・部署名) are not decomposed: a field like
// 会社名・部署名 is interpretable as either, and not filling is safer than a
// wrong fill, so the officeField EXCLUDE drop keeps the previous behavior.
export const officeLegendEligible = (own: string): boolean =>
  !officeContextExcluded(own)
  && !COMPANY_OFFICE.test(own) && !DEPT_OFFICE.test(own);
// PBI-160: the 会社名フリガナ conjunction (company/legal-person vocabulary AND
// a kana note). It strictly follows the company entry's COMPANY_OFFICE
// (including the 応募/申込 団体名 exclusion); the kana side is a note set of the
// same shape as KANA_NOTE (フリガナ does not contain カナ as a substring, so it
// is listed explicitly). norm folds fullwidth parentheses into ASCII, so the
// regex does not depend on parentheses surviving and reads only word
// co-occurrence (both 会社名（フリガナ） and 会社名(フリガナ) match).
export const COMPANY_KANA =
  /(?=.*(?:(?:会社|法人)名|(?:(?<!応募)(?<!申込)団体名)|社名))(?=.*(?:フリガナ|カナ|かな|kana))/;
// PBI-160: the 会社名フリガナ relaxation boundary. The own side opens on the
// field itself, the legend side when the shared heading carries the conjunction
// (a company_kana field under a 会社名（フリガナ） th heading has no Japanese
// words of its own and arrives via the legend). Birth context is excluded on
// both sides. A name-only field (company_kana, no label) carries neither
// conjunction, so it stays unknown (not filling beats a wrong fill).
export const officeKanaEligible = (own: string, legend: string): boolean =>
  !BIRTH_CTX.test(`${own} ${legend}`) && (COMPANY_KANA.test(own) || COMPANY_KANA.test(legend));
// PBI-225: allow list for exact name matches (compared on a key folding
// separators and letter case). Derived names (companyEmail etc.), company_kana,
// numbered and prefixed names land on different keys.
export const COMPANY_NAME_KEY: ReadonlySet<string> = new Set(['company', 'companyname']);
export const companyNameKey = (s: string): string => norm(s.trim()).replace(/[\s_-]+/g, '');
export const isCompanyByName = (m: FieldMeta): boolean =>
  m.tag === 'input' && m.type === 'text'
  && m.label.trim() === '' && m.nearby.trim() === ''
  && COMPANY_NAME_KEY.has(companyNameKey(m.name));

// Entry order inside this array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order.
export const officeEntries: readonly MatcherEntry[] = [
  // PBI-119: 会社名・会社部署 follow the same standalone-field pattern as
  // school/department (the field's own 0.7 beats a shared heading's 0.65). The
  // own-side relaxation boundary lives in one place, officeEligible; the
  // legend-side in officeLegendEligible (no own office-word requirement, and
  // fields with own words never flow to the legend side).
  // PBI-160: 会社名フリガナ is a terminal category (returned directly by
  // classifyField, bypassing resolveKana's attribution conversion). The own
  // side opens on the field's own conjunction, the legend side on the shared
  // heading's conjunction. The legend side never takes fields carrying own
  // company words (kanji company-name fields; the same crossover block as
  // officeLegendEligible). Birth context is excluded on both sides.
  ...ownLegend(
    COMPANY_KANA,
    'companyNameKana',
    (ctx) => !BIRTH_CTX.test(ctx.ownText),
    (ctx) =>
      !BIRTH_CTX.test(`${ctx.ownText} ${ctx.legendText}`)
      && !COMPANY_OFFICE.test(ctx.ownText) && !DEPT_OFFICE.test(ctx.ownText),
  ),
  ...ownLegend(
    COMPANY_OFFICE,
    'company',
    (ctx) => officeEligible(ctx.ownText),
    (ctx) => officeLegendEligible(ctx.ownText),
  ),
  ...ownLegend(
    DEPT_OFFICE,
    'companyDepartment',
    (ctx) => deptOfficeEligible(ctx.ownText),
    (ctx) => officeLegendEligible(ctx.ownText),
  ),
  // T3: the job title is an own-text-only entry (no legend pair): a standalone
  // 役職/役職名 reads 0.7, while the legend-only 役職 shape (tokyu-tenant job)
  // stays unknown. Department and company joints never reach this entry: the
  // department entry precedes it and the joint blocks on both sides hold.
  {
    name: 'job-title-own',
    match: (ctx) => (
      JOB_OFFICE.test(ctx.ownText) && jobOfficeEligible(ctx.ownText) ? matchAs('jobTitle', 0.7) : null
    ),
  },
];
