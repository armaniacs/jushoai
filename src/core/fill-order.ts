import type { Category } from './types';

// Categories injected last by fillPlan, shared as the single definition.
// Many Japanese forms rewrite prefecture/city/street asynchronously from the
// zip field's change event, so zip fields go last to avoid being overwritten
// by that lookup. This module must stay pure: no DOM, no LLM, no chrome API.
export const FILL_LAST_CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  'zip',
  'zip1',
  'zip2',
]);
