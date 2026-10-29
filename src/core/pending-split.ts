import { classifyField, isConfident } from './classify-rules';
import type { FieldMeta, RuledField } from './types';

// The one classify pass, shared: every entrance that needs verdicts for a
// meta list maps through here instead of inlining its own
// metas.map(classifyField). A single definition keeps the pass identical
// everywhere it is shared (splitPending below, classify-once bundles).
export function ruleAll(metas: readonly FieldMeta[]): RuledField[] {
  return metas.map((meta) => ({ meta, cls: classifyField(meta) }));
}

// The skip filter's single owner (PBI-145): a field id in skipIds never
// reaches the LLM, and an undefined set skips nothing (the gate's "no taught
// ids" state). Both the non-force pending side (splitPending below) and
// classifyAll's force path (analyze.ts) go through this one function, so a
// skip semantics change is fixed here once — the force path needs no lockstep
// fix to remember from a comment.
export function withoutSkipped(
  metas: readonly FieldMeta[],
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

// Partition over pre-classified verdicts: the same confident filter and skip
// filter as splitPending, but without re-running classifyField. Lets a
// classify-once bundle share one pass with the gate and the send list while
// this module stays the single owner of the split semantics.
export function splitRuled(
  ruled: readonly RuledField[],
  skipIds?: ReadonlySet<string>,
): PendingSplit {
  const unconfident = ruled.filter((r) => !isConfident(r.cls)).map((r) => r.meta);
  return { unconfident, pending: withoutSkipped(unconfident, skipIds) };
}

// Single owner of the pending split (PBI-154): classify → confident filter →
// skip filter, one pass over the metas. The egress gate (planEgress) reads
// both partitions; the LLM attempt (classifyAll) reads only .pending.
// skipIds carries the field ids whose metadata must not reach the LLM:
// taught ids (PBI-138), merged with the gate's unchecked ids by mergeLlmSkip.
// Callers that already hold a classify pass (classify-once bundles) go
// through splitRuled instead, so the pass below is the only classifyField
// call in this module.
export function splitPending(
  metas: FieldMeta[],
  skipIds?: ReadonlySet<string>,
): PendingSplit {
  return splitRuled(ruleAll(metas), skipIds);
}
