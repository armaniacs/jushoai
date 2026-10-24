import { capKeys, readKv, upsertKv, writeKv, type KvSpec } from './kv-store';

export const ASSIGNMENTS_KEY = 'jushoai:site-profile-assignments';
// The assignment map caps at the most recent hosts (insertion order), matching
// the approval memory's cap.
export const ASSIGNMENTS_MAX = 100;

export function parseAssignments(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [domain, profileId] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof profileId !== 'string' || profileId === '') continue;
    out[domain] = profileId;
  }
  return out;
}

// PBI-141 adapter: supplies key, parse, and cap to kv-store. A missing,
// corrupted or hand-edited value reads as an empty map — a broken store must
// never keep the preview from working. Only the host → profileId pair
// persists; no profile value ever enters storage.
// Exported (PBI-159) so the flow-unit loader can batch this spec with the
// other learning stores behind one get call.
export const ASSIGNMENTS_STORE: KvSpec<Record<string, string>> = {
  key: ASSIGNMENTS_KEY,
  parse: parseAssignments,
  cap: (entries) => capKeys(entries, ASSIGNMENTS_MAX),
};

export async function loadAssignments(): Promise<Record<string, string>> {
  return readKv(ASSIGNMENTS_STORE);
}

// An upsert moves the host to the end (the most recent survives the cap); the
// load-merge-write window and its concurrency limit are owned by kv-store's
// upsertKv.
export async function upsertAssignment(domain: string, profileId: string): Promise<void> {
  if (!domain) return;
  await upsertKv(ASSIGNMENTS_STORE, (all) => {
    const next = { ...all };
    delete next[domain];
    next[domain] = profileId;
    return next;
  });
}

export async function saveAssignments(entries: Record<string, string>): Promise<void> {
  await writeKv(ASSIGNMENTS_STORE, entries);
}
