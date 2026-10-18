import type { Category } from './types';

// PBI-41: radio groups are only fillable as gender/ageDecade. This predicate
// is the single owner of that policy: the analyze LLM post-filter and the
// planner select/radio branch both reference it, so a policy change touches
// only this module and the two callers cannot silently diverge.
export function isAllowedRadioCategory(category: Category): boolean {
  return category === 'gender' || category === 'ageDecade';
}
