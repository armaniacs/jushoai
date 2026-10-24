// PBI-154: the pending split (classify → confident filter → skip filter) is
// owned by splitPending, and both the egress gate (planEgress) and the LLM
// attempt (classifyAll) go through it.
// - The split's three outcomes (confident, skipped, pending) in one place.
// - planEgress(...).pending and the set classifyAll attempts to send are the
//   same set for the same metas: the gate neither under-reports (a sent
//   field the gate hid) nor over-reports (a hidden field the gate showed).
// - withoutSkipped is the one skip filter: splitPending's pending side and
//   classifyAll's force path both go through it (PBI-145).
// - splitPending returns both partitions (unconfident, pending) from one
//   classify pass (PBI-145).
// Existing tests' call sites were updated to .pending only; the expectations
// are unchanged.
import { describe, expect, it, vi } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import { mergeLlmSkip, planEgress } from '../../src/core/egress-plan';
import { splitPending, withoutSkipped } from '../../src/core/pending-split';
import type { Category, FieldMeta } from '../../src/core/types';
import type { FieldClassifier } from '../../src/core/classifier';
import { makeMeta } from '../helpers';

const llm = (answers: Record<string, Category>) => {
  // Faithful to the real adapter contract: answers only for the fields the
  // caller asked about, never for fields outside the pending list.
  const classify = vi.fn(async (fields: FieldMeta[]) => {
    const ids = new Set(fields.map((f) => f.id));
    return new Map(Object.entries(answers).filter(([id]) => ids.has(id)));
  });
  const attempt = vi.fn(async (fields: FieldMeta[]) => ({ map: await classify(fields), failureReason: null }));
  return { classifier: { classify, attempt } as FieldClassifier, classify };
};

// One confident field, one taught field, one open field, one weak rule hit:
// the four ways a field can sit around the split.
const MIXED: FieldMeta[] = [
  makeMeta({ id: 'f-last', label: '氏名（姓）' }), // confident: never sent
  makeMeta({ id: 'f-taught', name: 'xyz' }), // non-confident, taught
  makeMeta({ id: 'f-open', label: '' }), // non-confident, open
  makeMeta({ id: 'f-tel', type: 'tel' }), // weak rule hit (0.5), open
];
const TAUGHT = new Set(['xyz']);

describe('splitPending', () => {
  it('keeps non-confident fields pending and drops confident ones', () => {
    expect(splitPending(MIXED).pending.map((m) => m.id)).toEqual(['f-taught', 'f-open', 'f-tel']);
  });

  it('drops skip ids from the pending side', () => {
    expect(splitPending(MIXED, new Set(['f-taught', 'f-open'])).pending.map((m) => m.id)).toEqual(['f-tel']);
  });

  it('treats an undefined skip set as nothing skipped', () => {
    const metas = [makeMeta({ id: 'f-open', label: '' })];
    expect(splitPending(metas).pending.map((m) => m.id)).toEqual(['f-open']);
  });

  it('keeps a weak rule tel hit (below the accept threshold) pending', () => {
    const metas = [makeMeta({ id: 'f-tel', type: 'tel', label: '連絡先' })];
    expect(splitPending(metas).pending.map((m) => m.id)).toEqual(['f-tel']);
  });

  it('keeps the metas order on both sides of the skip filter', () => {
    const metas = [makeMeta({ id: 'b', label: '' }), makeMeta({ id: 'a', label: '' })];
    expect(splitPending(metas, new Set(['a'])).pending.map((m) => m.id)).toEqual(['b']);
  });
});

describe('withoutSkipped (the one skip filter, PBI-145)', () => {
  it('is the filter splitPending applies to its pending side', () => {
    const split = splitPending(MIXED, new Set(['f-open']));
    expect(split.pending.map((m) => m.id))
      .toEqual(withoutSkipped(split.unconfident, new Set(['f-open'])).map((m) => m.id));
  });

  it('treats an undefined skip set as nothing skipped', () => {
    expect(withoutSkipped(MIXED).map((m) => m.id)).toEqual(MIXED.map((m) => m.id));
  });

  it("is the same filter classifyAll's force path applies", async () => {
    const llmSkip = new Set(['f-taught', 'f-open']);
    const { classifier, classify } = llm({});
    await classifyAll(MIXED, classifier, { force: true, llmSkip });
    const attempted = classify.mock.calls.flatMap((c) => c[0]!.map((m) => m.id));
    expect(attempted).toEqual(withoutSkipped(MIXED, llmSkip).map((m) => m.id));
    // force sends confident fields too (no split), the taught and the
    // user-excluded stay local.
    expect(attempted).toEqual(['f-last', 'f-tel']);
  });
});

describe('splitPending one-pass partitions (PBI-145)', () => {
  it('returns both unconfident and pending from one call', () => {
    const split = splitPending(MIXED, new Set(['f-open']));
    // unconfident: the gate list, before the skip filter (taught included).
    expect(split.unconfident.map((m) => m.id)).toEqual(['f-taught', 'f-open', 'f-tel']);
    // pending: the send list, after the skip filter.
    expect(split.pending.map((m) => m.id)).toEqual(['f-taught', 'f-tel']);
  });

  it('starts pending equal to unconfident when nothing is skipped', () => {
    const split = splitPending(MIXED);
    expect(split.unconfident.map((m) => m.id)).toEqual(['f-taught', 'f-open', 'f-tel']);
    expect(split.pending.map((m) => m.id)).toEqual(split.unconfident.map((m) => m.id));
  });
});

describe('planEgress / classifyAll pending parity (PBI-154)', () => {
  it('sends exactly the gate pending list when nothing is unchecked', async () => {
    const plan = planEgress(MIXED, TAUGHT);
    expect(plan.pending.map((m) => m.id)).toEqual(['f-open', 'f-tel']);
    // content.ts wiring: the taught ids ride llmSkip itself (PBI-138).
    const llmSkip = plan.taughtIds.size > 0 ? plan.taughtIds : undefined;
    const { classifier, classify } = llm({});
    await classifyAll(MIXED, classifier, { llmSkip });
    const attempted = classify.mock.calls.flatMap((c) => c[0]!.map((m) => m.id));
    // Same set, both directions: no under-report, no over-report.
    expect(attempted).toEqual(plan.pending.map((m) => m.id));
    // The taught field's metadata never reaches the LLM.
    expect(attempted).not.toContain('f-taught');
  });

  it('keeps the gate exclusions out of the attempt without shrinking the gate list', async () => {
    const plan = planEgress(MIXED, TAUGHT);
    const llmSkip = mergeLlmSkip(plan.taughtIds, ['f-open']);
    const { classifier, classify } = llm({});
    await classifyAll(MIXED, classifier, { llmSkip });
    const attempted = classify.mock.calls.flatMap((c) => c[0]!.map((m) => m.id));
    expect(attempted).toEqual(['f-tel']);
    // The gate's list is unchanged: the user unchecked a row the gate showed.
    expect(plan.pending.map((m) => m.id)).toEqual(['f-open', 'f-tel']);
  });
});
