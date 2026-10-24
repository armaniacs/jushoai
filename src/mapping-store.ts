import type { MappingEntry } from './core/domain-mapping';
import { CATEGORIES } from './core/types';
import { capTail, readKv, upsertKv, writeKv, type KvSpec } from './kv-store';

export const MAPPINGS_KEY = 'jushoai:field-mappings';
// The correction layer caps at the most recent taught pairs: the store must
// not grow unboundedly as the user teaches more fields.
export const MAPPINGS_MAX = 500;

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

// PBI-138 adapter: supplies key, parse, and cap to kv-store. A missing,
// corrupted or hand-edited value reads as an empty list — a broken store must
// never keep the fill from working rule-only. Only the field signature →
// category pairs persist; no profile value and no correction value ever
// enters storage.
const MAPPINGS_STORE: KvSpec<MappingEntry[]> = {
  key: MAPPINGS_KEY,
  parse: parseMappings,
  cap: (entries) => capTail(entries, MAPPINGS_MAX),
};

export async function loadMappings(): Promise<MappingEntry[]> {
  return readKv(MAPPINGS_STORE);
}

// An upsert replaces this domain's pair for the same fieldKey; the cap trim
// and the load-merge-write window are owned by kv-store's upsertKv.
export async function upsertMapping(entry: MappingEntry): Promise<void> {
  await upsertKv(MAPPINGS_STORE, (all) => [
    ...all.filter((e) => !(e.domain === entry.domain && e.fieldKey === entry.fieldKey)),
    entry,
  ]);
}

export async function saveMappings(entries: readonly MappingEntry[]): Promise<void> {
  await writeKv(MAPPINGS_STORE, [...entries]);
}
