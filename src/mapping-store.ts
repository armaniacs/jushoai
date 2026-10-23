import type { MappingEntry } from './core/domain-mapping';
import { CATEGORIES } from './core/types';

export const MAPPINGS_KEY = 'jushoai:field-mappings';
// The correction layer caps at the most recent taught pairs: the store must
// not grow unboundedly as the user teaches more fields.
export const MAPPINGS_MAX = 500;

// PBI-138: the stored correction layer. A missing, corrupted or hand-edited
// value reads as an empty list — a broken store must never keep the fill from
// working rule-only. Only the field signature → category pairs persist; no
// profile value and no correction value ever enters storage.
export async function loadMappings(): Promise<MappingEntry[]> {
  const result = await chrome.storage.local.get(MAPPINGS_KEY);
  return parseMappings(result[MAPPINGS_KEY]);
}

// The single write point: an upsert replaces this domain's pair for the same
// fieldKey and trims beyond MAPPINGS_MAX. One load-merge-save in one place
// keeps the merge testable.
//
// Known limit (PBI-148): the load-merge-save window is not serialized across
// tabs. chrome.storage has no transactions, so two concurrent applies on the
// same host are last-writer-wins — one pair can be lost. Acceptable for a
// single-user local extension; a competing writer would merge on
// `storage.onChanged` instead.
export async function upsertMapping(entry: MappingEntry): Promise<void> {
  const all = await loadMappings();
  const next = [
    ...all.filter((e) => !(e.domain === entry.domain && e.fieldKey === entry.fieldKey)),
    entry,
  ];
  await saveMappings(next.slice(next.length - MAPPINGS_MAX));
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
