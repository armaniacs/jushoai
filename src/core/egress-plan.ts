import { prepare } from './classify-once';
import type { FieldMeta, RunContext } from './types';

// The egress gate's send plan (PBI-124/PBI-145): the gate shows exactly what
// classifyAll will send. The taught field ids (PBI-138) ride llmSkip itself,
// so the gate's pending list and the actual send stay the same set — a taught
// field's metadata never reaches the LLM, and the gate never under-reports.
// The pending split itself is owned by splitPending (PBI-154): planEgress and
// classifyAll both go through it.

// PBI-181: the plan is a thin view of the canonical RunContext (alias, not a
// redefinition) — the gate display and the send set are identically-typed by
// construction.
export type EgressPlan = Pick<RunContext, 'pending' | 'taughtIds' | 'nonConfidentCount'>;

export function planEgress(
  metas: FieldMeta[],
  taughtKeys: ReadonlySet<string>,
): EgressPlan {
  // Delegates to the classify-once bundle (PBI-179): one classify pass whose
  // views are exactly this plan's fields, so the gate cannot drift from the
  // pass the send path reads.
  const bundle = prepare(metas, { taughtKeys });
  return {
    pending: bundle.pending,
    taughtIds: bundle.taughtIds,
    nonConfidentCount: bundle.nonConfidentCount,
  };
}

// The gate's unchecked ids merge with the taught ids into one llmSkip set:
// classifyAll filters its LLM attempt by this set, so both the taught fields
// and the user's exclusions stay local.
export function mergeLlmSkip(
  taughtIds: ReadonlySet<string>,
  uncheckedIds: readonly string[],
): ReadonlySet<string> | undefined {
  if (taughtIds.size === 0 && uncheckedIds.length === 0) return undefined;
  return new Set([...taughtIds, ...uncheckedIds]);
}

// Nothing will be sent to the LLM when the skip set covers every non-confident
// field (taught or user-excluded): the classifier attempt itself is skipped.
export function shouldDisableClassifier(
  skip: ReadonlySet<string> | undefined,
  nonConfidentCount: number,
): boolean {
  return skip !== undefined && nonConfidentCount > 0 && skip.size >= nonConfidentCount;
}
