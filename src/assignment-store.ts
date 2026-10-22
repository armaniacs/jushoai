export const ASSIGNMENTS_KEY = 'jushoai:site-profile-assignments';

// PBI-141: the stored per-site profile assignments, keyed by host. A missing,
// corrupted or hand-edited value reads as an empty map — a broken store must
// never keep the preview from working. Only the host → profileId pair
// persists; no profile value ever enters storage.
export async function loadAssignments(): Promise<Record<string, string>> {
  const result = await chrome.storage.local.get(ASSIGNMENTS_KEY);
  return parseAssignments(result[ASSIGNMENTS_KEY]);
}

export async function saveAssignments(entries: Record<string, string>): Promise<void> {
  await chrome.storage.local.set({ [ASSIGNMENTS_KEY]: { ...entries } });
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
