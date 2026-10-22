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
  digests: Record<string, number>;
}

// A 32-bit djb2 digest, kept positive.
export function digest(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return h | 0;
}

// The form's field-signature hash. A different field set is a different form
// and falls back to the full preview.
export function formSignature(metas: FieldMeta[]): string {
  return digest(metas.map((m) => fieldKeyFor(m) ?? `id:${m.id}`).join('|')).toString();
}

export interface DiffRow {
  fieldId?: string;
  status: string;
  display: string;
}

export function rowDigests(rows: DiffRow[]): Record<string, number> {
  const out: Record<string, number> = {};
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
