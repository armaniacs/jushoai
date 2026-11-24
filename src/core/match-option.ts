import { matchDecadeOption, matchEraOption, matchNumberOption } from './eras';
import { matchGenderOption } from './genders';
import { clean } from './literals';
import { matchPrefectureOption } from './prefectures';
import type { Category, SelectOption } from './types';

// School names, grades, and juku names carry no canonical code table, so only
// an exact option resolves (text first, then value). Near-miss notations stay
// warn-no-option rather than filling a wrong target.
function matchExactOption(options: SelectOption[], raw: string): SelectOption | null {
  const t = clean(raw);
  if (!t) return null;
  return options.find((o) => clean(o.text) === t) ?? options.find((o) => clean(o.value) === t) ?? null;
}

// Single owner of "resolve a stored value to a select/radio option". Callers
// (buildPlan today) learn one interface instead of one matcher per domain;
// the domain tables and rules below stay as internal seams, not separate
// public contracts, so a new category adds one case here rather than a new
// branch at every call site.
export function matchOption(category: Category, options: SelectOption[], raw: string): SelectOption | null {
  switch (category) {
    case 'prefecture': return matchPrefectureOption(options, raw);
    case 'birthEra': return matchEraOption(options, raw);
    case 'gender': return matchGenderOption(options, raw);
    case 'ageDecade': return matchDecadeOption(options, raw);
    case 'birthMonth':
    case 'birthDay': return matchNumberOption(options, Number(raw));
    case 'school':
    case 'schoolGrade':
    case 'juku': return matchExactOption(options, raw);
    default: return null;
  }
}
