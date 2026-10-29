// PBI-185: sendSet が唯一の送信集合所有者であることの parity テスト。
// - force×skip の組み合わせ: 通常=unconfident-skip、force=全件-skip。
// - overload parity: metas 入力と ruled 入力で同一集合。
// - pipeline parity: runClassifyPipeline の実送信が sendSet と一致。
// - refine-drop parity: sendSet は pre-refine のため refine で落ちる欄も含み、
//   eval の llmFallbacks も同じ pre-skip/pre-refine/非force 定義である。
import { describe, expect, it, vi } from 'vitest';
import { runClassifyPipeline } from '../../src/classify-pipeline/pipeline';
import { classifyRulePipelineWithTrace, refineWithDrops } from '../../src/core/classify-rules';
import { resolveKana } from '../../src/core/kana';
import { evalMetricsFor } from '../../src/eval/metrics';
import { ruleAll, sendSet, splitPending } from '../../src/core/pending-split';
import type { Category, FieldMeta } from '../../src/core/types';
import type { FieldClassifier } from '../../src/core/classifier';
import { makeMeta } from '../helpers';

// confident 1件 + 非confident 3件（弱tel含む）の混合。
const confidentMeta = (id: string): FieldMeta => makeMeta({ id, label: '氏名（姓）' });
const openMeta = (id: string): FieldMeta => makeMeta({ id, name: `xyz-${id}` });
const MIXED: FieldMeta[] = [
  confidentMeta('c'),
  openMeta('p1'),
  openMeta('p2'),
  makeMeta({ id: 't-weak', type: 'tel', label: '連絡先' }),
];

// refine で落ちる oversized tel 群: type=tel の label 空は 0.5 で非confident。
// 同一 label+nearby が4件あると exactSize(3) を超えて dropped になる。
const oversizedTel = (): FieldMeta[] =>
  Array.from({ length: 4 }, (_, i) => makeMeta({ id: `tel-${i}`, type: 'tel', label: '', nearby: 'h' }));

const attemptedIds = async (
  metas: FieldMeta[],
  opts: { force?: boolean; llmSkip?: ReadonlySet<string> },
): Promise<string[]> => {
  const attempt = vi.fn(async (fields: FieldMeta[]) => ({
    map: new Map(fields.map((m): [string, Category] => [m.id, 'email'])),
    failureReason: null,
  }));
  const classifier = {
    classify: async () => { throw new Error('must not be called through the run'); },
    attempt,
  } as FieldClassifier;
  await runClassifyPipeline(classifier, metas, opts);
  return attempt.mock.calls.flatMap((c) => (c[0] as FieldMeta[]).map((m) => m.id));
};

describe('sendSet: force x skip (PBI-185)', () => {
  it('通常は unconfident-skip、force は全件-skip', () => {
    expect(sendSet(MIXED).map((m) => m.id)).toEqual(['p1', 'p2', 't-weak']);
    expect(sendSet(MIXED, { force: true }).map((m) => m.id)).toEqual(['c', 'p1', 'p2', 't-weak']);
  });

  it('skip は両経路で除外する', () => {
    const skip = new Set(['p1']);
    expect(sendSet(MIXED, { skip }).map((m) => m.id)).toEqual(['p2', 't-weak']);
    expect(sendSet(MIXED, { skip, force: true }).map((m) => m.id)).toEqual(['c', 'p2', 't-weak']);
  });

  it('全件 skip で空集合になる（両経路）', () => {
    const skip = new Set(['c', 'p1', 'p2', 't-weak']);
    expect(sendSet(MIXED, { skip, force: true })).toEqual([]);
    expect(sendSet(MIXED, { skip })).toEqual([]);
  });

  it('metas 入力と ruled 入力で同一集合になる', () => {
    const ruled = ruleAll(MIXED);
    const skip = new Set(['p1']);
    for (const force of [false, true]) {
      expect(sendSet(ruled, { skip, force }).map((m) => m.id))
        .toEqual(sendSet(MIXED, { skip, force }).map((m) => m.id));
    }
  });

  it('通常は splitPending().pending と一致する', () => {
    const skip = new Set(['p2']);
    expect(sendSet(MIXED, { skip }).map((m) => m.id))
      .toEqual(splitPending(MIXED, skip).pending.map((m) => m.id));
    expect(sendSet(ruleAll(MIXED), { skip }).map((m) => m.id))
      .toEqual(splitPending(MIXED, skip).pending.map((m) => m.id));
  });
});

describe('sendSet: pipeline parity (PBI-185)', () => {
  it('force x skip の全組み合わせで実送信と一致する', async () => {
    const skips: ReadonlySet<string>[] = [new Set<string>(), new Set(['p1']), new Set(['c', 'p1', 'p2', 't-weak'])];
    for (const force of [false, true]) {
      for (const skip of skips) {
        const llmSkip = skip.size > 0 ? skip : undefined;
        const attempted = await attemptedIds(MIXED, { force, llmSkip });
        expect(attempted, `force=${force} skip=[${[...skip]}]`).toEqual(
          sendSet(MIXED, { skip, force }).map((m) => m.id),
        );
      }
    }
  });
});

describe('sendSet: refine-drop parity (PBI-185)', () => {
  it('refine で落ちる欄も pre-refine の送信集合には含まれる', () => {
    const metas = oversizedTel();
    // pre-refine の入力を一段ずつ組み立てる（WithTrace の items は refine 済み
    // のため二重適用になる）。
    const preRefine = resolveKana(
      ruleAll(metas).map((r) => ({
        meta: r.meta,
        cls: r.cls ?? { category: 'unknown' as const, confidence: 0, source: 'rule' as const },
      })),
    );
    const { dropped } = refineWithDrops(preRefine);
    expect(dropped.length).toBeGreaterThan(0);
    // 送信集合は refine 前なので dropped 欄を含む。
    expect(sendSet(metas).map((m) => m.id).sort()).toEqual(metas.map((m) => m.id).sort());
  });

  it('eval llmFallbacks は pre-skip/pre-refine/非force の定義で sendSet(通常, skipなし) と一致する', () => {
    const metas = [...MIXED, ...oversizedTel()];
    const trace = classifyRulePipelineWithTrace(metas);
    const metrics = evalMetricsFor(metas);
    // 定義: refine前の非confident件数（skip適用前・非force）。
    expect(metrics.llmFallbacks).toBe(trace.initialUnconfident.length);
    expect(metrics.llmFallbacks).toBe(sendSet(metas).length);
  });
});
