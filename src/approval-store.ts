import type { ApprovalRecord } from './core/site-approval';

export const APPROVALS_KEY = 'jushoai:site-approvals';
// The approval memory caps at the most recent hosts (insertion order): the
// store must not grow unboundedly with every site the user fills.
export const APPROVALS_MAX = 100;

// PBI-128: the stored per-site approval records, keyed by host. A missing,
// corrupted or hand-edited value reads as an empty map — a broken store must
// never keep the full preview from working. Only digests persist; no raw
// profile value, no raw label ever enters storage.
export async function loadApprovals(): Promise<Record<string, ApprovalRecord>> {
  const result = await chrome.storage.local.get(APPROVALS_KEY);
  return parseApprovals(result[APPROVALS_KEY]);
}

// The single write point: an upsert moves the record to the end (the most
// recent host survives the cap) and trims the oldest beyond APPROVALS_MAX.
// One load-merge-save in one place keeps the merge testable.
//
// Known limit (PBI-148): the load-merge-save window is not serialized across
// tabs. chrome.storage has no transactions, so two concurrent applies on the
// same host are last-writer-wins — one record can be lost. Acceptable for a
// single-user local extension; a competing writer would merge on
// `storage.onChanged` instead.
export async function upsertApproval(record: ApprovalRecord): Promise<void> {
  const all = await loadApprovals();
  delete all[record.domain];
  all[record.domain] = record;
  await saveApprovals(all);
}

export async function saveApprovals(entries: Record<string, ApprovalRecord>): Promise<void> {
  const keys = Object.keys(entries);
  const trimmed = keys.length > APPROVALS_MAX ? keys.slice(keys.length - APPROVALS_MAX) : keys;
  const out: Record<string, ApprovalRecord> = {};
  for (const k of trimmed) out[k] = entries[k]!;
  await chrome.storage.local.set({ [APPROVALS_KEY]: out });
}

export function parseApprovals(raw: unknown): Record<string, ApprovalRecord> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, ApprovalRecord> = {};
  for (const [domain, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const v = value as Record<string, unknown>;
    if (typeof v.signature !== 'string') continue;
    if (typeof v.profileId !== 'string' || typeof v.addressId !== 'string') continue;
    if (typeof v.digests !== 'object' || v.digests === null) continue;
    const digests: Record<string, string> = {};
    for (const [fieldId, d] of Object.entries(v.digests as Record<string, unknown>)) {
      if (typeof d !== 'string' || d === '') continue;
      digests[fieldId] = d;
    }
    out[domain] = {
      domain,
      signature: v.signature,
      profileId: v.profileId,
      addressId: v.addressId,
      digests,
    };
  }
  return out;
}
