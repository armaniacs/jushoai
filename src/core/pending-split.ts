import { classifyField, isConfident } from './classify-rules';
import type { FieldMeta } from './types';

// Single owner of the pending split (PBI-154): classify → confident filter →
// skip filter. The egress gate (planEgress) and the LLM attempt (classifyAll)
// both compute their pending set here, so a changed threshold or a new split
// condition lands once and both sides follow — no lockstep fix (PBI-145) to
// remember from a comment. The gate-list-equals-send equality itself is
// pinned by the parity test (tests/core/pending-split.test.ts).
// skipIds carries the field ids whose metadata must not reach the LLM:
// taught ids (PBI-138), merged with the gate's unchecked ids by mergeLlmSkip.
// An undefined set skips nothing (the gate's "no taught ids" state).
export function splitPending(
  metas: FieldMeta[],
  skipIds?: ReadonlySet<string>,
): FieldMeta[] {
  return metas
    .filter((m) => !isConfident(classifyField(m)))
    .filter((m) => !skipIds?.has(m.id));
}
