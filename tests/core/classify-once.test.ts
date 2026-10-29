import { describe, expect, it } from 'vitest';
import type { Category } from '../../src/core/types';
import type { FieldClassifier } from '../../src/core/classifier';
import type { EgressPlan } from '../../src/core/egress-plan';
import { prepare } from '../../src/core/classify-once';
import { planEgress } from '../../src/core/egress-plan';
import { runClassifyPipeline } from '../../src/classify-pipeline/pipeline';
import { makeMeta } from '../helpers';

// PBI-179: one classify pass shared across the gate and the send path.
// prepare() classifies once; planEgress and the pipeline read its views
// instead of re-running classifyField on the same metas.
const MIXED = [
  makeMeta({ id: 'f-last', label: '氏名（姓）' }), // confident: never sent
  makeMeta({ id: 'f-taught', name: 'xyz' }), // non-confident, taught below
  makeMeta({ id: 'f-open', name: 'xyz' }), // non-confident, sent
];

describe('prepare: one pass, all partitions', () => {
  it('derives unconfident, taughtIds, pending and count from a single pass', () => {
    const b = prepare(MIXED, { taughtKeys: new Set(['xyz']) });
    // f-taught and f-open share the name, so both match the taught key.
    expect(b.unconfident.map((m) => m.id).sort()).toEqual(['f-open', 'f-taught']);
    expect([...b.taughtIds].sort()).toEqual(['f-open', 'f-taught']);
    expect(b.pending).toEqual([]);
    expect(b.nonConfidentCount).toBe(2);
    expect(b.ruled).toHaveLength(3);
  });

  it('keeps untaught non-confident fields pending', () => {
    const b = prepare(MIXED, { taughtKeys: new Set() });
    expect(b.pending.map((m) => m.id)).toEqual(['f-taught', 'f-open']);
    expect(b.taughtIds.size).toBe(0);
  });
});

describe('prepare/planEgress equivalence', () => {
  it('planEgress returns exactly the bundle views', () => {
    const taughtKeys = new Set(['xyz']);
    const b = prepare(MIXED, { taughtKeys });
    const plan = planEgress(MIXED, taughtKeys);
    expect(plan.pending).toEqual(b.pending);
    expect(plan.taughtIds).toEqual(b.taughtIds);
    expect(plan.nonConfidentCount).toBe(b.nonConfidentCount);
  });
});

describe('pipeline with and without a premade bundle', () => {
  it('resolves the same items rule-only', async () => {
    const b = prepare(MIXED, { taughtKeys: new Set() });
    const plain = await runClassifyPipeline(null, MIXED, {});
    const bundled = await runClassifyPipeline(null, MIXED, {
      premade: { ruled: b.ruled, unconfident: b.unconfident },
    });
    expect(bundled.items).toEqual(plain.items);
    expect(bundled.failureReason).toBe(plain.failureReason);
  });
});

// PBI-181: the canonical RunContext pass. The gate plan is a thin EgressPlan
// view of the bundle, and the pipeline reads the pass without matching metas
// by reference — a copied metas array resolves to the same verdicts.
describe('RunContext canonical pass (PBI-181)', () => {
  const stubClassifier = (map: Map<string, Category>): FieldClassifier => ({
    classify: async () => map,
    attempt: async () => ({ map, failureReason: null }),
  });

  it('exposes the gate plan as a thin view of the same bundle', () => {
    const taughtKeys = new Set(['xyz']);
    const bundle = prepare(MIXED, { taughtKeys });
    const plan: EgressPlan = bundle;
    const egress = planEgress(MIXED, taughtKeys);
    expect(plan.pending).toEqual(egress.pending);
    expect(plan.taughtIds).toEqual(egress.taughtIds);
    expect(plan.nonConfidentCount).toBe(egress.nonConfidentCount);
  });

  it('applies the pass to a copied metas array without an identity check', async () => {
    const bundle = prepare(MIXED, { taughtKeys: new Set() });
    const copied = MIXED.map((m) => ({ ...m }));
    const classifier = stubClassifier(new Map([['f-taught', 'email'], ['f-open', 'tel']]));
    const viaPass = await runClassifyPipeline(classifier, copied, {
      premade: { ruled: bundle.ruled, unconfident: bundle.unconfident },
    });
    const direct = await runClassifyPipeline(classifier, copied, {});
    expect(viaPass.items.map((i) => [i.meta.id, i.cls.category, i.cls.source])).toEqual(
      direct.items.map((i) => [i.meta.id, i.cls.category, i.cls.source]),
    );
    expect(viaPass.items.find((i) => i.meta.id === 'f-taught')?.cls).toMatchObject({
      category: 'email', source: 'llm',
    });
    expect(viaPass.items.find((i) => i.meta.id === 'f-last')?.cls).toMatchObject({
      category: 'lastName', source: 'rule',
    });
  });
});
