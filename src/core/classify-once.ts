import { fieldKeyFor } from './domain-mapping';
import { ruleAll, splitRuled, withoutSkipped } from './pending-split';
import type { FieldMeta, RuledField } from './types';

// One classify pass shared across entrances (PBI-179). The gate display, the
// send list and the merge used to each re-run classifyField on the same metas
// (planEgress's split, the pipeline's split, mergeClassified's ruled map),
// kept consistent only by comment discipline and parity tests. A bundle holds
// the single pass's staged artifacts; every entrance reads views of it.
// detect-forms keeps its own memoized per-scan verdicts: its lifecycle (every
// scan) differs from a run bundle's (one button press), so sharing a bundle
// there would trade a stale-bundle risk for elegance. The shared definition
// stays classifyField itself.

// The taught ids for one unconfident list (PBI-138): extracted so planEgress
// and prepare compute them from the same code instead of two inline copies.
export function taughtIdsFor(
  unconfident: readonly FieldMeta[],
  taughtKeys: ReadonlySet<string>,
): Set<string> {
  return new Set(
    unconfident
      .filter((m) => {
        const key = fieldKeyFor(m);
        return key !== null && taughtKeys.has(key);
      })
      .map((m) => m.id),
  );
}

export interface ClassifyOnceBundle {
  // The single classifyField pass over the metas.
  ruled: RuledField[];
  // Non-confident fields (the gate list), before the skip filter.
  unconfident: FieldMeta[];
  // The send list: unconfident minus the taught ids.
  pending: FieldMeta[];
  // The ids skipped because the user taught their category (PBI-138).
  taughtIds: ReadonlySet<string>;
  // The non-confident count, taught included: the "all skipped" disable check
  // compares against this, not against the shorter pending list.
  nonConfidentCount: number;
}

export function prepare(
  metas: readonly FieldMeta[],
  opts: { taughtKeys: ReadonlySet<string> },
): ClassifyOnceBundle {
  const ruled = ruleAll(metas);
  const { unconfident } = splitRuled(ruled);
  const taughtIds = taughtIdsFor(unconfident, opts.taughtKeys);
  return {
    ruled,
    unconfident,
    pending: withoutSkipped(unconfident, taughtIds),
    taughtIds,
    nonConfidentCount: unconfident.length,
  };
}
