import { parseExcludedUrls } from './core/exclusions';
import { readKv, writeKv, type KvSpec } from './kv-store';

export const EXCLUDED_URLS_KEY = 'jushoai:excluded-urls';

// PBI-46 adapter: supplies key and parse to kv-store, which owns the load/save
// plumbing and the typed error mode. A missing, corrupted or hand-edited value
// reads as an empty list: a broken store must never keep the extension from
// starting. No cap here: the options page bounds additions via
// EXCLUDED_URLS_MAX.
const EXCLUSIONS_STORE: KvSpec<string[]> = {
  key: EXCLUDED_URLS_KEY,
  parse: parseExcludedUrls,
};

export async function loadExcludedUrls(): Promise<string[]> {
  return readKv(EXCLUSIONS_STORE);
}

export async function saveExcludedUrls(entries: readonly string[]): Promise<void> {
  await writeKv(EXCLUSIONS_STORE, [...entries]);
}
