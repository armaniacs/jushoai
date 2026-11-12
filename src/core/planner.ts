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

// PBI-218: the single value-row table (field-catalog.ts の流儀).
// One row per concrete category (unknown 除外): read が旧 valueForBase の
// switch 分岐本体、assist が旧 assistFor の switch への鍵（null は assist なし、
// 旧 ASSISTABLE 非所属と同値）、abbreviatable が旧 ABBREVIATABLE 集合。
// 新しい項目はこの表に1行足すだけで値解決・assist・abbrev が動く。
// 旧シンボルの残置基準: valueForBase・assistFor は共に本モジュール内専用で
// 他の importer がないため、表の読み出し関数として残す（旧 switch 本体は
// 各行の read/assist へ移動し重複は持たない）。ABBREVIATABLE・ASSISTABLE の
// 2集合は列に置換されたため削除する。等価確認は docs ではなく旧新対応表
// （本コメント直下の対応 + task-218-report.md）と make test/eval で行う。
export type AssistKind = 'zipPrefecture' | 'zipCity' | 'surname' | 'given' | 'fullName';

export interface RowReadArgs {
  profile: Profile;
  address: Address | null;
  today?: Date;
  meta: FieldMeta;
  cls: Classification;
  present: Set<Category>;
  kind: 'katakana' | 'hiragana' | 'halfKatakana';
  sep: string;
}

export interface ValueRow {
  category: Exclude<Category, 'unknown'>;
  read: (args: RowReadArgs) => string;
  assist: AssistKind | null;
  abbreviatable: boolean;
}

const telAt = (p: Profile, i: number) => (p.tel ? (splitTel(p.tel)[i] ?? '') : '');
const zipAt = (a: Address | null, i: number) => (a ? (splitZip(a.zip)[i] ?? '') : '');
const withBuilding = (base: string, a: Address | null, present: Set<Category>) =>
  present.has('building') || !a?.building ? base : `${base} ${a.building}`;

export const VALUE_ROWS: readonly ValueRow[] = [
  { category: 'lastName', read: ({ profile }) => profile.lastName, assist: null, abbreviatable: false },
  { category: 'firstName', read: ({ profile }) => profile.firstName, assist: null, abbreviatable: false },
  {
    category: 'fullName',
    read: ({ profile, sep }) =>
      profile.lastName && profile.firstName ? joinName(profile.lastName, profile.firstName, sep) : '',
    assist: null, abbreviatable: false,
  },
  {
    category: 'lastNameKana',
    read: ({ profile, kind }) => (profile.lastNameKana ? formatKana(profile.lastNameKana, kind) : ''),
    assist: 'surname', abbreviatable: false,
  },
  {
    category: 'firstNameKana',
    read: ({ profile, kind }) => (profile.firstNameKana ? formatKana(profile.firstNameKana, kind) : ''),
    assist: 'given', abbreviatable: false,
  },
  {
    category: 'fullNameKana',
    read: ({ profile, kind, sep }) =>
      profile.lastNameKana && profile.firstNameKana
        ? joinName(formatKana(profile.lastNameKana, kind), formatKana(profile.firstNameKana, kind), sep)
        : '',
    assist: 'fullName', abbreviatable: false,
  },
  { category: 'lastNameRomaji', read: ({ profile }) => profile.lastNameRomaji, assist: null, abbreviatable: false },
  { category: 'firstNameRomaji', read: ({ profile }) => profile.firstNameRomaji, assist: null, abbreviatable: false },
  // Western order (given name first); empty romaji never falls back to kanji
  // so half-width-only fields are left untouched instead of misfilled.
  {
    category: 'fullNameRomaji',
    read: ({ profile }) =>
      profile.lastNameRomaji && profile.firstNameRomaji ? `${profile.firstNameRomaji} ${profile.lastNameRomaji}` : '',
    assist: null, abbreviatable: false,
  },
  { category: 'gender', read: ({ profile }) => profile.gender, assist: null, abbreviatable: false },
  { category: 'ageDecade', read: ({ profile, today }) => toDecade(profile.birthday, today) ?? '', assist: null, abbreviatable: false },
  { category: 'country', read: ({ address }) => address?.country ?? '', assist: null, abbreviatable: false },
  { category: 'address1', read: ({ address }) => address?.address1 ?? '', assist: null, abbreviatable: false },
  { category: 'address2', read: ({ address }) => address?.address2 ?? '', assist: null, abbreviatable: false },
  { category: 'address3', read: ({ address }) => address?.address3 ?? '', assist: null, abbreviatable: false },
  { category: 'address4', read: ({ address }) => address?.address4 ?? '', assist: null, abbreviatable: false },
  { category: 'postalCode', read: ({ address }) => address?.postalCode ?? '', assist: null, abbreviatable: false },
  { category: 'email', read: ({ profile }) => profile.email, assist: null, abbreviatable: false },
  {
    category: 'tel',
    read: ({ profile, meta }) => {
      if (!profile.tel) return '';
      return wantsHyphen(meta.placeholder, meta.maxLength, 'tel') ? splitTel(profile.tel).join('-') : profile.tel;
    },
    assist: null, abbreviatable: false,
  },
  { category: 'tel1', read: ({ profile }) => telAt(profile, 0), assist: null, abbreviatable: false },
  { category: 'tel2', read: ({ profile }) => telAt(profile, 1), assist: null, abbreviatable: false },
  { category: 'tel3', read: ({ profile }) => telAt(profile, 2), assist: null, abbreviatable: false },
  {
    category: 'zip',
    read: ({ address, meta }) => {
      if (!address) return '';
      return wantsHyphen(meta.placeholder, meta.maxLength, 'zip') ? splitZip(address.zip).join('-') : address.zip;
    },
    assist: null, abbreviatable: false,
  },
  { category: 'zip1', read: ({ address }) => zipAt(address, 0), assist: null, abbreviatable: false },
  { category: 'zip2', read: ({ address }) => zipAt(address, 1), assist: null, abbreviatable: false },
  { category: 'prefecture', read: ({ address }) => address?.prefecture ?? '', assist: 'zipPrefecture', abbreviatable: false },
  { category: 'city', read: ({ address }) => address?.city ?? '', assist: 'zipCity', abbreviatable: false },
  {
    category: 'street',
    read: ({ address, present }) => (address ? withBuilding(address.street, address, present) : ''),
    assist: null, abbreviatable: true,
  },
  { category: 'building', read: ({ address }) => address?.building ?? '', assist: null, abbreviatable: true },
  {
    category: 'addressNoPref',
    read: ({ address, present }) => (address ? withBuilding(address.city + address.street, address, present) : ''),
    assist: null, abbreviatable: true,
  },
  {
    category: 'addressFull',
    read: ({ address, present }) =>
      (address ? withBuilding(address.prefecture + address.city + address.street, address, present) : ''),
    assist: null, abbreviatable: true,
  },
  {
    category: 'birthYear',
    read: ({ profile, present }) => {
      const bd = splitBirthday(profile.birthday);
      if (!bd) return '';
      if (present.has('birthEra')) {
        const e = toEraDate(profile.birthday);
        return e ? String(e.year) : '';
      }
      return bd.y;
    },
    assist: null, abbreviatable: false,
  },
  {
    category: 'birthMonth',
    read: ({ profile }) => { const bd = splitBirthday(profile.birthday); return bd ? bd.m : ''; },
    assist: null, abbreviatable: false,
  },
  {
    category: 'birthDay',
    read: ({ profile }) => { const bd = splitBirthday(profile.birthday); return bd ? bd.d : ''; },
    assist: null, abbreviatable: false,
  },
  {
    category: 'birthEra',
    read: ({ profile }) => (profile.birthday ? (toEraDate(profile.birthday)?.era ?? '') : ''),
    assist: null, abbreviatable: false,
  },
  // PBI-118: a single full-date field (text or type=date) takes the profile's
  // ISO birthday as-is. splitBirthday validates the strict ISO shape, so an
  // uninterpretable stored value (wareki, partial, different separator) stays
  // empty and the row reports warn-no-value instead of misfilling.
  {
    category: 'birthday',
    read: ({ profile }) => (splitBirthday(profile.birthday) ? profile.birthday : ''),
    assist: null, abbreviatable: false,
  },
  { category: 'school', read: ({ profile }) => profile.school, assist: null, abbreviatable: false },
  { category: 'department', read: ({ profile }) => profile.department, assist: null, abbreviatable: false },
  // PBI-119: 会社名・会社の部署。空は従来どおりスキップ（warn-no-value）。
  { category: 'company', read: ({ profile }) => profile.companyName, assist: null, abbreviatable: false },
  { category: 'companyDepartment', read: ({ profile }) => profile.companyDepartment, assist: null, abbreviatable: false },
  // T3: 役職名。空は従来どおりスキップ（warn-no-value）。
  { category: 'jobTitle', read: ({ profile }) => profile.jobTitle, assist: null, abbreviatable: false },
  // PBI-160: 会社名フリガナ。人名カナと同一の formatKana 変換。
  // 辞書 assist（旧 ASSISTABLE）には加えない（人名辞書は会社名に向かない）。
  {
    category: 'companyNameKana',
    read: ({ profile, kind }) => (profile.companyNameKana ? formatKana(profile.companyNameKana, kind) : ''),
    assist: null, abbreviatable: false,
  },
];

const ROW_BY_CATEGORY: ReadonlyMap<Category, ValueRow> = new Map(VALUE_ROWS.map((r) => [r.category, r]));

function valueForBase(
  cls: Classification,
  meta: FieldMeta,
  { profile: p, address: a, today }: PlanContext,
  present: Set<Category>,
): string {
  const row = ROW_BY_CATEGORY.get(cls.category);
  if (!row) return '';
  return row.read({
    profile: p, address: a, today, meta, cls, present,
    kind: cls.kanaKind ?? 'katakana',
    sep: detectNameSeparator(meta.placeholder),
  });
}

// A select resting on its first option is treated as untouched: many forms default to 北海道.
export const isUntouchedSelect = (m: Pick<FieldMeta, 'value' | 'options'>) =>
  m.value === '' || m.options[0]?.value === m.value;

// PBI-125: the categories the zip dictionary assists. PBI-133: the name
// reading dictionary assists the kana categories. Both lookups are
// terminal-only (no network, no LLM) and deterministic.
// PBI-218: 旧 ASSISTABLE 集合は VALUE_ROWS の assist 列に置換され削除。
// 旧所属（prefecture/city/lastNameKana/firstNameKana/fullNameKana）は各行の
// assist が非 null であることと同値（tests/core/planner.test.ts の表固定で保証）。

// PBI-125 + PBI-133: the assist candidate for an empty assistable value, or
// null when nothing resolves. The kana candidates convert through the
// deterministic formatKana (kanaKind 変換は決定的コード); the full-name join
// follows the field's own placeholder style like the kanji fullName case.
// PBI-218: 旧 switch は行の assist 列の読み出しに置換。旧 case と新 assist 鍵の
// 対応: prefecture→zipPrefecture、city→zipCity、lastNameKana→surname、
// firstNameKana→given、fullNameKana→fullName。default（null 返し）は assist:null の行と同値。
function assistFor(category: Category, ctx: PlanContext, cls: Classification, meta: FieldMeta): string | null {
  const p = ctx.profile;
  const kind = cls.kanaKind ?? 'katakana';
  switch (ROW_BY_CATEGORY.get(category)?.assist ?? null) {
    case 'zipPrefecture':
    case 'zipCity': {
      const zip = ctx.address?.zip ?? '';
      if (!zip) return null;
      const assist = zipAssistFor(zip);
      if (!assist) return null;
      return ROW_BY_CATEGORY.get(category)?.assist === 'zipPrefecture' ? assist.prefecture : assist.city;
    }
    case 'surname': {
      const r = readingFor(p.lastName, 'surname');
      return r ? formatKana(r, kind) : null;
    }
    case 'given': {
      const r = readingFor(p.firstName, 'given');
      return r ? formatKana(r, kind) : null;
    }
    case 'fullName': {
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
  if (maxLength === null || ROW_BY_CATEGORY.get(category)?.abbreviatable !== true) return null;
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
      // PBI-218: 表の assist 列の読み出し。assist:null の行は assistFor が null
      // を返すため旧 ASSISTABLE 集合の事前判定と同値（表固定テストで保証）。
      const candidate = assistFor(cls.category, ctx, cls, meta);
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
      // isAllowedRadioCategory (shared with the analyze LLM post-filter,
      // src/classify-pipeline/pipeline.ts:66-68); the remaining categories
      // (prefecture/birthMonth/birthDay/birthEra) are select-only extras.
      // PBI-218 (2026-11-10, YAGNI 判断で2箇所所有を残置し行に畳まない):
      // radio 許可は分類パイプラインと共有する方針で、select 追加分とは
      // 「変わる理由」が異なる（radio 側は入力様式の方針変更、select 側は
      // 選択肢を持つ欄の追加）。同じ理由で変わる場合だけ一本化する。
      // 再訪条件: radio 許可集合と select 可否が同一の要求で同時に変わるとき。
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
