import { matchDecadeOption, matchEraOption, matchNumberOption } from './eras';
import { matchGenderOption } from './genders';
import { matchPrefectureOption } from './prefectures';
import type { Category, SelectOption } from './types';

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
    default: return null;
  }
}
