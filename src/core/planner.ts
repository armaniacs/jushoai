import type { Item } from './types';
import { abbreviateBuilding } from './abbreviate';
import { zipAssistFor } from './zip-dict';
import { readingFor } from './name-readings';
import {
  splitBirthday, toDecade, toEraDate,
} from './eras';
import {
  detectNameSeparator, detectWidthKind, formatKana, joinName, splitTel, splitZip,
  toFullWidth, toHalfWidth, wantsHyphen,
} from './formatters';
import { matchOption } from './match-option';
import { isAllowedRadioCategory } from './radio-policy';
import type { Address, Category, Classification, FieldMeta, Profile } from './types';
import { carryoverFor } from './carryover';

export type PlanStatus = 'ok' | 'filled' | 'warn-maxlength' | 'warn-pattern' | 'warn-no-option' | 'warn-no-value';

export interface PlanItem {
  fieldId: string;
  category: Category;
  source: 'rule' | 'llm';
  value: string;
  display: string;
  status: PlanStatus;
  // PBI-122: an abbreviation candidate for an overflowing building-bearing
  // field. The preview offers it as an opt-in choice; only the user's explicit
  // approval promotes it into the fill value (applyAbbrevApprovals), so the
  // fill never truncates silently (NOT-TODO 12).
  abbrev?: string;
  // PBI-125: a dictionary assist candidate for a prefecture/city field whose
  // profile value is missing while the address zip resolves. Same opt-in
  // semantics as abbrev; the lookup is terminal-only and deterministic.
  assist?: string;
}

export interface PlanContext {
  profile: Profile;
  address: Address | null;
  today?: Date;
  // PBI-142: the earlier page's approved values, keyed by the field signature.
  // A field whose profile value is empty falls back to the carried value.
  carryover?: Record<string, string>;
}

// PBI-120: width-forcing patterns reshape the value's character width before
// the fill checks. The rewrite rides input fields only: select/radio values
// must match the page's own option list (the scan never fills their pattern),
// and a type=date value must stay ISO or it stops being a date. The 0xFEE0
// shift itself is length-preserving, but the trailing NFC in toFullWidth runs
// on the whole value and re-composes width-agnostic columns too (a hangul jamo
// cluster, a lone ﾞ → U+3099), so the converted value can change code-unit
// length; the maxlength warning in buildPlan therefore sees the converted
// value and is judged on it (never on the raw).
function enforceWidth(value: string, meta: FieldMeta): string {
  if (meta.tag !== 'input' || meta.type === 'date') return value;
  const kind = detectWidthKind(meta.pattern);
  if (kind === 'full') return toFullWidth(value);
  if (kind === 'half') return toHalfWidth(value);
  return value;
}

// PBI-210: the value-pattern-fit axis compiles the page's pattern attribute the
// way the browser does: an anchored full match (HTML spec's implicit
// ^(?:...)$) under the v flag. A naive new RegExp(pattern) would be a partial
// match and under-warn. The check runs only on patterns carrying regex
// structure (a class, escape, quantifier, group, alternation, anchor or dot):
// form-mailer.jp pages ship bare literals like pattern="1"/"5"/"6" as internal
// check-type codes on novalidate forms the browser never enforces, and a bare
// literal would turn every working fill on those pages into a warning. A
// pattern that fails to compile is ignored by the browser as well. Both cases
// fall open (no check) so an unusual pattern style never costs a page its
// fills (fail-closed は禁止). null means "no check".
const HAS_REGEX_STRUCTURE = /[\[\]{}()|+*?.^$\\]/;
// The v flag (ES2024) is the HTML-spec compile mode for the pattern attribute.
// Feature-detected once: an engine without it falls back to the anchored plain
// RegExp (vitest は常に非 Firefox で動くが Node の版に依存しないため).
const V_FLAG_OK = (() => {
  try { new RegExp('', 'v'); return true; } catch { return false; }
})();

function valuePatternFor(pattern: string): RegExp | null {
  if (pattern === '' || !HAS_REGEX_STRUCTURE.test(pattern)) return null;
  const anchored = `^(?:${pattern})$`;
  for (const flags of V_FLAG_OK ? ['v'] : ['']) {
    try { return new RegExp(anchored, flags); } catch { /* fall open: the browser ignores it too */ }
  }
  return null;
}

// PBI-210: the single pattern-fit judgment, judged on the same value the
// maxlength warning sees (post width conversion, the value the preview shows).
// The pattern attribute governs text/search/url/tel/email/password inputs only
// (HTML spec); a type=date value must stay ISO or it stops being a date (the
// width axis's own rule above), and the browser never enforces a date input's
// pattern. A null compilation (no pattern, page-noise literal, unparseable)
// never violates, so the row keeps its conventional status.
const PATTERN_APPLIABLE = new Set(['text', 'search', 'url', 'tel', 'email', 'password']);

const valuePatternViolates = (value: string, meta: FieldMeta): boolean => {
  if (meta.tag !== 'input' || !PATTERN_APPLIABLE.has(meta.type)) return false;
  const re = valuePatternFor(meta.pattern);
  return re !== null && !re.test(value);
};

function valueFor(
  cls: Classification,
  meta: FieldMeta,
  { profile: p, address: a, today, carryover }: PlanContext,
  present: Set<Category>,
): string {
  const filled = valueForBase(cls, meta, { profile: p, address: a, today }, present);
  // PBI-142: the earlier page's approved value carries into this preview for
  // the same field signature. Input fields only; the profile value always wins.
  return filled || carryoverFor(meta, carryover);
}

function valueForBase(
  cls: Classification,
  meta: FieldMeta,
  { profile: p, address: a, today }: PlanContext,
  present: Set<Category>,
): string {
  const kind = cls.kanaKind ?? 'katakana';
  const sep = detectNameSeparator(meta.placeholder);
  const withBuilding = (base: string) =>
    present.has('building') || !a?.building ? base : `${base} ${a.building}`;
  const tel = (i: number) => (p.tel ? (splitTel(p.tel)[i] ?? '') : '');
  const zip = (i: number) => (a ? (splitZip(a.zip)[i] ?? '') : '');
  const bd = splitBirthday(p.birthday);

  switch (cls.category) {
    case 'lastName': return p.lastName;
    case 'firstName': return p.firstName;
    case 'fullName':
      return p.lastName && p.firstName ? joinName(p.lastName, p.firstName, sep) : '';
    case 'lastNameKana': return p.lastNameKana ? formatKana(p.lastNameKana, kind) : '';
    case 'firstNameKana': return p.firstNameKana ? formatKana(p.firstNameKana, kind) : '';
    case 'fullNameKana':
      return p.lastNameKana && p.firstNameKana
        ? joinName(formatKana(p.lastNameKana, kind), formatKana(p.firstNameKana, kind), sep)
        : '';
    case 'lastNameRomaji': return p.lastNameRomaji;
    case 'firstNameRomaji': return p.firstNameRomaji;
    // Western order (given name first); empty romaji never falls back to kanji
    // so half-width-only fields are left untouched instead of misfilled.
    case 'fullNameRomaji':
      return p.lastNameRomaji && p.firstNameRomaji ? `${p.firstNameRomaji} ${p.lastNameRomaji}` : '';
    case 'email': return p.email;
    case 'tel':
      if (!p.tel) return '';
      return wantsHyphen(meta.placeholder, meta.maxLength, 'tel') ? splitTel(p.tel).join('-') : p.tel;
    case 'tel1': return tel(0);
    case 'tel2': return tel(1);
    case 'tel3': return tel(2);
    case 'zip':
      if (!a) return '';
      return wantsHyphen(meta.placeholder, meta.maxLength, 'zip') ? splitZip(a.zip).join('-') : a.zip;
    case 'zip1': return zip(0);
    case 'zip2': return zip(1);
    case 'prefecture': return a?.prefecture ?? '';
    case 'city': return a?.city ?? '';
    case 'street': return a ? withBuilding(a.street) : '';
    case 'building': return a?.building ?? '';
    case 'addressNoPref': return a ? withBuilding(a.city + a.street) : '';
    case 'addressFull': return a ? withBuilding(a.prefecture + a.city + a.street) : '';
    case 'birthYear':
      if (!bd) return '';
      if (present.has('birthEra')) {
        const e = toEraDate(p.birthday);
        return e ? String(e.year) : '';
      }
      return bd.y;
    case 'birthMonth': return bd ? bd.m : '';
    case 'birthDay': return bd ? bd.d : '';
    case 'birthEra': return p.birthday ? (toEraDate(p.birthday)?.era ?? '') : '';
    // PBI-118: a single full-date field (text or type=date) takes the profile's
    // ISO birthday as-is. splitBirthday validates the strict ISO shape, so an
    // uninterpretable stored value (wareki, partial, different separator) stays
    // empty and the row reports warn-no-value instead of misfilling.
    case 'birthday': return bd ? p.birthday : '';
    case 'school': return p.school;
    case 'department': return p.department;
    // PBI-119: 会社名・会社の部署。空は従来どおりスキップ（warn-no-value）。
    case 'company': return p.companyName;
    case 'companyDepartment': return p.companyDepartment;
    // PBI-160: 会社名フリガナ。人名カナと同一の formatKana 変換。
    // 辞書 assist（ASSISTABLE）には加えない（人名辞書は会社名に向かない）。
    case 'companyNameKana': return p.companyNameKana ? formatKana(p.companyNameKana, kind) : '';
    case 'gender': return p.gender;
    case 'ageDecade': return toDecade(p.birthday, today) ?? '';
    case 'country': return a?.country ?? '';
    case 'address1': return a?.address1 ?? '';
    case 'address2': return a?.address2 ?? '';
    case 'address3': return a?.address3 ?? '';
    case 'address4': return a?.address4 ?? '';
    case 'postalCode': return a?.postalCode ?? '';
    case 'unknown': return '';
  }
}

// A select resting on its first option is treated as untouched: many forms default to 北海道.
export const isUntouchedSelect = (m: Pick<FieldMeta, 'value' | 'options'>) =>
  m.value === '' || m.options[0]?.value === m.value;

// PBI-122: categories whose overflow can be rescued by shortening the building
// name. The composed fields shorten only their appended building tail; the
// street/city base is never rewritten, because corrupting it would break the
// address even when the length fits.
const ABBREVIATABLE: ReadonlySet<Category> = new Set<Category>([
  'building', 'street', 'addressNoPref', 'addressFull',
]);

// PBI-125: the categories the zip dictionary assists. PBI-133: the name
// reading dictionary assists the kana categories. Both lookups are
// terminal-only (no network, no LLM) and deterministic.
const ASSISTABLE: ReadonlySet<Category> = new Set<Category>([
  'prefecture', 'city', 'lastNameKana', 'firstNameKana', 'fullNameKana',
]);

// PBI-125 + PBI-133: the assist candidate for an empty assistable value, or
// null when nothing resolves. The kana candidates convert through the
// deterministic formatKana (kanaKind 変換は決定的コード); the full-name join
// follows the field's own placeholder style like the kanji fullName case.
function assistFor(category: Category, ctx: PlanContext, cls: Classification, meta: FieldMeta): string | null {
  const p = ctx.profile;
  const kind = cls.kanaKind ?? 'katakana';
  switch (category) {
    case 'prefecture':
    case 'city': {
      const zip = ctx.address?.zip ?? '';
      if (!zip) return null;
      const assist = zipAssistFor(zip);
      if (!assist) return null;
      return category === 'prefecture' ? assist.prefecture : assist.city;
    }
    case 'lastNameKana': {
      const r = readingFor(p.lastName, 'surname');
      return r ? formatKana(r, kind) : null;
    }
    case 'firstNameKana': {
      const r = readingFor(p.firstName, 'given');
      return r ? formatKana(r, kind) : null;
    }
    case 'fullNameKana': {
      const last = readingFor(p.lastName, 'surname');
      const first = readingFor(p.firstName, 'given');
      return last && first
        ? formatKana(joinName(last, first, detectNameSeparator(meta.placeholder)), kind)
        : null;
    }
    default:
      return null;
  }
}

// Fits the shortened building into the budget; null when no rule fired, when
// the shortening is empty (a whitespace-only building shortens to '' — a
// candidate that would silently drop the tail or flip a row to an empty value),
// or when the shortened form still overflows, so the row keeps its plain
// warn-maxlength.
function fitting(building: string, shortened: string, budget: number): string | null {
  if (budget < 1 || shortened === '' || shortened === building || shortened.length > budget) {
    return null;
  }
  return shortened;
}

// PBI-122: the abbreviation candidate for an overflow row, or null when none
// applies. Runs after the width conversion (enforceWidth) so the candidate is
// measured against the same value the preview shows; the abbreviation itself
// is a truncation-rule pass, never a width rewrite (the order contract lives in
// the profiles-design 追補 2026-10-21 section).
function abbreviationFor(
  category: Category,
  raw: string,
  maxLength: number | null,
  meta: FieldMeta,
  ctx: PlanContext,
  present: Set<Category>,
): string | null {
  if (maxLength === null || !ABBREVIATABLE.has(category)) return null;
  const a = ctx.address;
  if (category === 'building') return fitting(raw, abbreviateBuilding(raw), maxLength);
  // A composition shortens only when the building was actually appended; a
  // dedicated building field (or no building) keeps the street intact.
  // レビュー指摘: raw は幅変換済みなのに対し a.building は未変換の profile 値で
  // は endsWith が必ず失敗し、full/half 強制下でビル名に変換対象文字があると
  // 候補が無音に消える。tail にも同じ enforceWidth を掛けてから endsWith/slice
  // する（最終注入値がページの幅要求に整合し、候補生成が噛み合う）。
  if (!a?.building) return null;
  const building = enforceWidth(a.building, meta);
  if (present.has('building') || !raw.endsWith(` ${building}`)) return null;
  const base = raw.slice(0, raw.length - building.length);
  const shortened = fitting(building, abbreviateBuilding(building), maxLength - base.length);
  return shortened === null ? null : `${base}${shortened}`;
}

// PBI-122 + レビュー指摘: the single abbrev judgment, shared by the plan
// builder, the approval seam, and the preview rows: a candidate is present only
// when a non-empty string rode the row. fitting returns null for an empty
// shortening (a whitespace-only building name), so planner rows never carry '',
// but the truthy check keeps an empty candidate from flipping a row even if a
// future producer regresses (the old three judgments — !== null, truthy,
// !== undefined — drifted on exactly that case).
export const hasAbbrev = (abbrev: string | null | undefined): abbrev is string => !!abbrev;

// PBI-122: the single approval seam. Only the preview's explicit approval (the
// checkbox set handed to apply) promotes a candidate into the fill value; rows
// without a candidate never flip, and an unapproved id keeps warn-maxlength
// with an empty value, so nothing injects silently. The candidate presence
// check is the shared hasAbbrev judgment. PBI-125: the dictionary assist rides
// the same seam — one candidate per row (abbrev wins when both producers ever
// collide on the same row).
export function applyAbbrevApprovals(plan: PlanItem[], approved: ReadonlySet<string>): PlanItem[] {
  if (approved.size === 0) return plan;
  return plan.map((p) => {
    const candidate = hasAbbrev(p.abbrev) ? p.abbrev : (hasAbbrev(p.assist) ? p.assist : null);
    return candidate !== null && approved.has(p.fieldId) ? { ...p, value: candidate, status: 'ok' } : p;
  });
}

export function buildPlan(items: Item[], ctx: PlanContext): PlanItem[] {
  const present = new Set(items.map((i) => i.cls.category));
  const plan: PlanItem[] = [];

  for (const { meta, cls } of items) {
    if (meta.readOnly || meta.disabled || cls.category === 'unknown') continue;
    const base = { fieldId: meta.id, category: cls.category, source: cls.source };
    const raw = enforceWidth(valueFor(cls, meta, ctx, present), meta);
    // A missing profile value keeps its row with the reason attached instead
    // of vanishing: vanishing is indistinguishable from a classification
    // failure (unknown skips noiselessly above), so the preview could never
    // explain the cause. PBI-125: a zip dictionary assist rides the row for a
    // prefecture/city field while the address zip resolves — the preview
    // offers it as an opt-in choice and only the user's approval promotes it
    // into the fill value. Without a candidate the row keeps its plain
    // warn-no-value shape (候補不一致・辞書なし時は従来通り警告で止まる).
    if (!raw) {
      const candidate = ASSISTABLE.has(cls.category) ? assistFor(cls.category, ctx, cls, meta) : null;
      plan.push({
        ...base,
        value: '',
        display: candidate ? `候補: ${candidate}` : '',
        status: 'warn-no-value',
        ...(hasAbbrev(candidate) ? { assist: candidate } : {}),
      });
      continue;
    }

    // A radio group resting with nothing checked is untouched; unlike a select it
    // has no placeholder first option, so only an empty value counts as untouched.
    const isUntouchedOption = meta.tag === 'select' ? isUntouchedSelect(meta) : meta.value === '';
    if (meta.tag === 'select' || meta.tag === 'radio') {
      // PBI-41: the gender/ageDecade half of this branch is owned by
      // isAllowedRadioCategory (shared with the analyze LLM post-filter);
      // the remaining categories are select-only extras.
      if (
        cls.category === 'prefecture' || cls.category === 'birthMonth' ||
        cls.category === 'birthDay' || cls.category === 'birthEra' ||
        isAllowedRadioCategory(cls.category)
      ) {
        if (!isUntouchedOption) {
          plan.push({ ...base, value: '', display: raw, status: 'filled' });
          continue;
        }
        const option = matchOption(cls.category, meta.options, raw);
        plan.push(
          option && !(meta.tag === 'radio' && option.disabled)
            ? { ...base, value: option.value, display: option.text, status: 'ok' }
            : { ...base, value: '', display: raw, status: 'warn-no-option' },
        );
        continue;
      }
      continue;
    }

    if (meta.value.trim() !== '') {
      plan.push({ ...base, value: '', display: raw, status: 'filled' });
    } else if (meta.maxLength !== null && raw.length > meta.maxLength) {
      // PBI-122: a fitting abbreviation candidate rides the row; the preview
      // offers it and only the user's approval promotes it into the fill value
      // (applyAbbrevApprovals). Without a candidate the row keeps its plain
      // warn-maxlength shape: truncation without approval stays out of scope.
      // The candidate presence check is the shared hasAbbrev judgment.
      const abbreviated = abbreviationFor(cls.category, raw, meta.maxLength, meta, ctx, present);
      plan.push({
        ...base,
        value: '',
        display: abbreviated ? `${raw} → ${abbreviated}` : raw,
        status: 'warn-maxlength',
        ...(hasAbbrev(abbreviated) ? { abbrev: abbreviated } : {}),
      });
    } else if (valuePatternViolates(raw, meta)) {
      // PBI-210: a value the page's own pattern rejects (anchored full match)
      // becomes a warn row with an empty value — the same shape and position
      // as the maxlength axis. The preview shows the reason and the value
      // never injects, even on approval; no formatting is attempted (整形は
      // 別軸), so a pattern-violating value cannot silently break the send.
      plan.push({ ...base, value: '', display: raw, status: 'warn-pattern' });
    } else {
      plan.push({ ...base, value: raw, display: raw, status: 'ok' });
    }
  }
  return plan;
}
