import { fieldKeyFor } from './domain-mapping';
import { ruleAll, splitRuled, withoutSkipped } from './pending-split';
import type { FieldMeta, RunContext } from './types';

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

// PBI-181: the bundle IS the canonical RunContext (alias, not a redefinition),
// and the pipeline pass is its Pick view. Every entrance names the same shape.
export type ClassifyOnceBundle = RunContext;

// The pass the send path reads (PBI-179/181): the pipeline's premade and the
// merge's ruled projection are this view, so they cannot drift from the bundle.
export type PremadePass = Pick<RunContext, 'ruled' | 'unconfident'>;

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
