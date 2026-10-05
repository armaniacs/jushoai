import type { Item } from './classify-rules';
import {
  matchEraOption, matchNumberOption, splitBirthday, toEraDate,
} from './eras';
import {
  detectNameSeparator, formatKana, joinName, splitTel, splitZip, wantsHyphen,
} from './formatters';
import { matchPrefectureOption } from './prefectures';
import type { Address, Category, Classification, FieldMeta, Profile } from './types';

export type PlanStatus = 'ok' | 'filled' | 'warn-maxlength' | 'warn-no-option';

export interface PlanItem {
  fieldId: string;
  category: Category;
  source: 'rule' | 'llm';
  value: string;
  display: string;
  status: PlanStatus;
}

export interface PlanContext {
  profile: Profile;
  address: Address | null;
}

function valueFor(
  cls: Classification,
  meta: FieldMeta,
  { profile: p, address: a }: PlanContext,
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
    case 'school': return p.school;
    case 'department': return p.department;
    case 'unknown': return '';
  }
}

// A select resting on its first option is treated as untouched: many forms default to 北海道.
export const isUntouchedSelect = (m: Pick<FieldMeta, 'value' | 'options'>) =>
  m.value === '' || m.options[0]?.value === m.value;

export function buildPlan(items: Item[], ctx: PlanContext): PlanItem[] {
  const present = new Set(items.map((i) => i.cls.category));
  const plan: PlanItem[] = [];

  for (const { meta, cls } of items) {
    if (meta.readOnly || meta.disabled || cls.category === 'unknown') continue;
    const raw = valueFor(cls, meta, ctx, present);
    if (!raw) continue;
    const base = { fieldId: meta.id, category: cls.category, source: cls.source };

    if (meta.tag === 'select') {
      if (
        cls.category === 'prefecture' || cls.category === 'birthMonth' ||
        cls.category === 'birthDay' || cls.category === 'birthEra'
      ) {
        if (!isUntouchedSelect(meta)) {
          plan.push({ ...base, value: '', display: raw, status: 'filled' });
          continue;
        }
        const option = cls.category === 'prefecture'
          ? matchPrefectureOption(meta.options, raw)
          : cls.category === 'birthEra'
            ? matchEraOption(meta.options, raw)
            : matchNumberOption(meta.options, Number(raw));
        plan.push(
          option
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
      plan.push({ ...base, value: '', display: raw, status: 'warn-maxlength' });
    } else {
      plan.push({ ...base, value: raw, display: raw, status: 'ok' });
    }
  }
  return plan;
}
