import type { ApprovalRecord } from './core/site-approval';

export const APPROVALS_KEY = 'jushoai:site-approvals';

// PBI-128: the stored per-site approval records, keyed by host. A missing,
// corrupted or hand-edited value reads as an empty map — a broken store must
// never keep the full preview from working. Only digests persist; no raw
// profile value, no raw label ever enters storage.
export async function loadApprovals(): Promise<Record<string, ApprovalRecord>> {
  const result = await chrome.storage.local.get(APPROVALS_KEY);
  return parseApprovals(result[APPROVALS_KEY]);
}

export async function saveApprovals(entries: Record<string, ApprovalRecord>): Promise<void> {
  await chrome.storage.local.set({ [APPROVALS_KEY]: { ...entries } });
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
    const digests: Record<string, number> = {};
    for (const [fieldId, d] of Object.entries(v.digests as Record<string, unknown>)) {
      if (typeof d !== 'number' || !Number.isFinite(d)) continue;
      digests[fieldId] = d | 0;
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
