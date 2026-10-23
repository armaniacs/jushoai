// Site approval memory (PBI-128): the per-site approval record for a repeated
// fill. The record stores only a digest per row (a djb2 hash of the field id,
// the status and the display) — no raw profile value, no raw label. The diff
// drives the shortened preview: rows whose digest matches the approved record
// collapse to a muted line, rows that differ stay highlighted.

import type { FieldMeta } from './types';
import { fieldKeyFor, hostOf } from './domain-mapping';

export interface ApprovalRecord {
  domain: string;
  signature: string;
  profileId: string;
  addressId: string;
  digests: Record<string, string>;
}

// Two independent 32-bit hashes (djb2 and FNV-1a) joined into one 64-bit
// digest string. The digest is the only stored evidence of what was approved,
// so a single-hash collision would hide a changed row from the shortened
// preview; two independent hashes make that practically impossible.
export function digest(input: string): string {
  let djb2 = 5381;
  let fnv = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    djb2 = ((djb2 * 33) ^ c) >>> 0;
    fnv = ((fnv ^ c) * 0x01000193) >>> 0;
  }
  return `${djb2.toString(36)}${fnv.toString(36)}`;
}

// The form's field-signature hash. A different field set is a different form
// and falls back to the full preview.
export function formSignature(metas: FieldMeta[]): string {
  return digest(metas.map((m) => fieldKeyFor(m) ?? `id:${m.id}`).join('|'));
}

export interface DiffRow {
  fieldId?: string;
  status: string;
  display: string;
}

export function rowDigests(rows: DiffRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    // A row without a field id (a synthetic line) has no shape to remember.
    if (typeof r.fieldId !== 'string') continue;
    out[r.fieldId] = digest(`${r.fieldId}|${r.status}|${r.display}`);
  }
  return out;
}

export function recordFor(
  href: string,
  metas: FieldMeta[],
  rows: DiffRow[],
  profileId: string,
  addressId: string,
): ApprovalRecord {
  return {
    domain: hostOf(href),
    signature: formSignature(metas),
    profileId,
    addressId,
    digests: rowDigests(rows),
  };
}

// A record matches when the site, the form shape and the selection are the
// same: only then does the shortened preview apply.
export function matches(
  record: ApprovalRecord | null,
  href: string,
  metas: FieldMeta[],
  profileId: string,
  addressId: string,
): boolean {
  return (
    record !== null &&
    record.domain === hostOf(href) &&
    record.signature === formSignature(metas) &&
    record.profileId === profileId &&
    record.addressId === addressId
  );
}

// The rows the shortened preview keeps: every row whose digest differs from
// the approved record. An unchanged field collapses away. Rows without a
// field id (a synthetic line) never collapse.
export function changedRows<T extends DiffRow>(rows: T[], record: ApprovalRecord): T[] {
  const digests = rowDigests(rows);
  return rows.filter((r) => typeof r.fieldId !== 'string' || record.digests[r.fieldId] !== digests[r.fieldId]);
}
