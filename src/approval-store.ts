import type { ApprovalRecord } from './core/site-approval';
import { capKeys, readKv, upsertKv, writeKv, type KvSpec } from './kv-store';

export const APPROVALS_KEY = 'jushoai:site-approvals';
// The approval memory caps at the most recent hosts (insertion order): the
// store must not grow unboundedly with every site the user fills.
export const APPROVALS_MAX = 100;

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

// PBI-128 adapter: supplies key, parse, and cap to the one store module
// (kv-store), which owns load/save/upsert and the typed error mode. A missing,
// corrupted or hand-edited value reads as an empty map — a broken store must
// never keep the full preview from working. Only digests persist; no raw
// profile value, no raw label ever enters storage.
// Exported (PBI-159) so the flow-unit loader can batch this spec with the
// other learning stores behind one get call.
export const APPROVALS_STORE: KvSpec<Record<string, ApprovalRecord>> = {
  key: APPROVALS_KEY,
  parse: parseApprovals,
  cap: (entries) => capKeys(entries, APPROVALS_MAX),
};

export async function loadApprovals(): Promise<Record<string, ApprovalRecord>> {
  return readKv(APPROVALS_STORE);
}

// An upsert moves the record to the end (the most recent host survives the
// cap); the load-merge-write window and its concurrency limit are owned by
// kv-store's upsertKv.
export async function upsertApproval(record: ApprovalRecord): Promise<void> {
  await upsertKv(APPROVALS_STORE, (all) => {
    const next = { ...all };
    delete next[record.domain];
    next[record.domain] = record;
    return next;
  });
}

export async function saveApprovals(entries: Record<string, ApprovalRecord>): Promise<void> {
  await writeKv(APPROVALS_STORE, entries);
}
