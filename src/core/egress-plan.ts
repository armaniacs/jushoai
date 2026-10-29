import { prepare } from './classify-once';
import type { FieldMeta } from './types';

// The egress gate's send plan (PBI-124/PBI-145): the gate shows exactly what
// classifyAll will send. The taught field ids (PBI-138) ride llmSkip itself,
// so the gate's pending list and the actual send stay the same set — a taught
// field's metadata never reaches the LLM, and the gate never under-reports.
// The pending split itself is owned by splitPending (PBI-154): planEgress and
// classifyAll both go through it.

export interface EgressPlan {
  // What the gate shows = what classifyAll will send.
  pending: FieldMeta[];
  // The ids skipped because the user taught their category (PBI-138).
  taughtIds: ReadonlySet<string>;
  // The non-confident count, taught included: the "all skipped" disable check
  // compares against this, not against the gate's shorter pending list.
  nonConfidentCount: number;
}

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
