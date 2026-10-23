export const ASSIGNMENTS_KEY = 'jushoai:site-profile-assignments';
// The assignment map caps at the most recent hosts (insertion order), matching
// the approval memory's cap.
export const ASSIGNMENTS_MAX = 100;

// PBI-141: the stored per-site profile assignments, keyed by host. A missing,
// corrupted or hand-edited value reads as an empty map — a broken store must
// never keep the preview from working. Only the host → profileId pair
// persists; no profile value ever enters storage.
export async function loadAssignments(): Promise<Record<string, string>> {
  const result = await chrome.storage.local.get(ASSIGNMENTS_KEY);
  return parseAssignments(result[ASSIGNMENTS_KEY]);
}

// The single write point: an upsert moves the host to the end (the most recent
// survives the cap) and trims the oldest beyond ASSIGNMENTS_MAX.
export async function upsertAssignment(domain: string, profileId: string): Promise<void> {
  if (!domain) return;
  const all = await loadAssignments();
  delete all[domain];
  all[domain] = profileId;
  await saveAssignments(all);
}

export async function saveAssignments(entries: Record<string, string>): Promise<void> {
  const keys = Object.keys(entries);
  const trimmed = keys.length > ASSIGNMENTS_MAX ? keys.slice(keys.length - ASSIGNMENTS_MAX) : keys;
  const out: Record<string, string> = {};
  for (const k of trimmed) out[k] = entries[k]!;
  await chrome.storage.local.set({ [ASSIGNMENTS_KEY]: out });
}

export function parseAssignments(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [domain, profileId] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof profileId !== 'string' || profileId === '') continue;
    out[domain] = profileId;
  }
  return out;
}
