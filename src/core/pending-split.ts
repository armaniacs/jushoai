import { classifyField, isConfident } from './classify-rules';
import type { FieldMeta } from './types';

// The skip filter's single owner (PBI-145): a field id in skipIds never
// reaches the LLM, and an undefined set skips nothing (the gate's "no taught
// ids" state). Both the non-force pending side (splitPending below) and
// classifyAll's force path (analyze.ts) go through this one function, so a
// skip semantics change is fixed here once — the force path needs no lockstep
// fix to remember from a comment.
export function withoutSkipped(
  metas: FieldMeta[],
  skipIds?: ReadonlySet<string>,
): FieldMeta[] {
  return metas.filter((m) => !skipIds?.has(m.id));
}

export interface PendingSplit {
  // The non-confident fields (the gate list), before the skip filter.
  unconfident: FieldMeta[];
  // The non-confident fields the skip set does not exclude (the send list).
  pending: FieldMeta[];
}

// Single owner of the pending split (PBI-154): classify → confident filter →
// skip filter, one pass over the metas. The egress gate (planEgress) reads
// both partitions; the LLM attempt (classifyAll) reads only .pending.
// skipIds carries the field ids whose metadata must not reach the LLM:
// taught ids (PBI-138), merged with the gate's unchecked ids by mergeLlmSkip.
// classifyField is also called by classifyAll's ruled map (analyze.ts) on the
// same metas; that cross-call-path duplication stays — removing it would need
// a classify-once seam across entrances. The duplication this one-pass split
// removes is planEgress's former two splitPending calls (PBI-145).
export function splitPending(
  metas: FieldMeta[],
  skipIds?: ReadonlySet<string>,
): PendingSplit {
  const unconfident = metas.filter((m) => !isConfident(classifyField(m)));
  return { unconfident, pending: withoutSkipped(unconfident, skipIds) };
}
