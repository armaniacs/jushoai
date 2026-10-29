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

export interface SendSetOptions {
  // The field ids whose metadata must not reach the LLM (taught ids merged
  // with the gate's unchecked ids). An undefined set skips nothing.
  skip?: ReadonlySet<string>;
  // true: every field is a send candidate (confident included); false: only
  // the non-confident fields are candidates. Either way the skip filter
  // applies last.
  force?: boolean;
}

const isRuledList = (
  input: readonly (FieldMeta | RuledField)[],
): input is readonly RuledField[] => {
  const first = input[0];
  return first !== undefined && 'meta' in first && 'cls' in first;
};

// Single owner of the LLM send set (PBI-185): the one function that decides
// which fields reach the LLM. force = all fields minus skip, otherwise the
// non-confident fields minus skip. Accepts either raw metas (classifies
// once internally) or a pre-classified pass (no re-classification). The
// pipeline, the gate bundle and the eval definition all funnel through here
// or through the split filters below it — never a hand-rolled third branch.
export function sendSet(
  metas: readonly FieldMeta[],
  opts?: SendSetOptions,
): FieldMeta[];
export function sendSet(
  ruled: readonly RuledField[],
  opts?: SendSetOptions,
): FieldMeta[];
export function sendSet(
  input: readonly (FieldMeta | RuledField)[],
  opts: SendSetOptions = {},
): FieldMeta[] {
  const skip = opts.skip;
  if (opts.force === true) {
    const all = isRuledList(input) ? input.map((r) => r.meta) : [...(input as readonly FieldMeta[])];
    return withoutSkipped(all, skip);
  }
  if (isRuledList(input)) return splitRuled(input, skip).pending;
  // Overload homogeneity: a non-ruled list is FieldMeta[] here.
  return splitRuled(ruleAll(input as readonly FieldMeta[]), skip).pending;
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
