// Wizard carryover (PBI-142): the values approved and injected on an earlier
// page of the same tab carry into the next page's preview for the same field
// signature. The carry lives in the content script's memory only — a tab close
// destroys it, nothing persists and nothing is sent. Input fields only: a
// select or radio must match the page's own option list, so a carried value
// never rides them.

import type { FieldMeta } from './types';
import { fieldKeyFor } from './domain-mapping';

export interface CarryEntry {
  key: string;
  value: string;
}

export type Carryover = Record<string, string>;

// The carried value for a field, or '' when the signature is unknown or the
// field is not a text-like input.
export function carryoverFor(meta: FieldMeta, carry: Carryover | undefined): string {
  if (!carry || meta.tag !== 'input') return '';
  const key = fieldKeyFor(meta);
  if (!key) return '';
  return carry[key] ?? '';
}

// The filled entries of an apply, keyed by the field signature. A signature
// learned twice keeps the latest value.
export function mergeCarryover(carry: Carryover, entries: readonly CarryEntry[]): Carryover {
  const next: Carryover = { ...carry };
  for (const e of entries) {
    if (!e.key || !e.value) continue;
    next[e.key] = e.value;
  }
  return next;
}
