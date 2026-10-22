import type { MappingEntry } from './core/domain-mapping';
import { CATEGORIES } from './core/types';

export const MAPPINGS_KEY = 'jushoai:field-mappings';

// PBI-138: the stored correction layer. A missing, corrupted or hand-edited
// value reads as an empty list — a broken store must never keep the fill from
// working rule-only. Only the field signature → category pairs persist; no
// profile value and no correction value ever enters storage.
export async function loadMappings(): Promise<MappingEntry[]> {
  const result = await chrome.storage.local.get(MAPPINGS_KEY);
  return parseMappings(result[MAPPINGS_KEY]);
}

export async function saveMappings(entries: readonly MappingEntry[]): Promise<void> {
  await chrome.storage.local.set({ [MAPPINGS_KEY]: [...entries] });
}

export function parseMappings(raw: unknown): MappingEntry[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>(CATEGORIES);
  const out: MappingEntry[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { domain, fieldKey, category } = item as Record<string, unknown>;
    if (typeof domain !== 'string' || domain === '') continue;
    if (typeof fieldKey !== 'string' || fieldKey === '') continue;
    if (typeof category !== 'string' || !valid.has(category) || category === 'unknown') continue;
    out.push({ domain, fieldKey, category: category as MappingEntry['category'] });
  }
  return out;
}
