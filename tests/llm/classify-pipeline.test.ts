import { describe, expect, it, vi } from 'vitest';
import type { Category, FieldMeta } from '../../src/core/types';
import type { FieldClassifier, ClassifySchedule } from '../../src/core/classifier';
import {
  mergeClassified, runClassifyPipeline, withLegacyThrowFallback,
} from '../../src/classify-pipeline/pipeline';
import { planChunks, scheduleFor } from '../../src/classify-pipeline/chunks';
import { makeMeta } from '../helpers';

// PBI-174: run(metas, {force, llmSkip, signal}) の条件組み合わせテスト。
// 受け入れ基準「force・skip・途中失敗・全skip の表駆動テスト」をここで担う。
// 振る舞いの正準は固定: radio ゲート・resolveKana→refine 順序・失敗語彙の
// 外部振る舞いを変えない。

// すべて非 confident (unknown 扱い) の pending 欄。confident 欄は
// label: '氏名（姓）' (lastName 0.9) で作る。
const pendingMeta = (id: string): FieldMeta => makeMeta({ id, name: `xyz-${id}` });
const confidentMeta = (id: string): FieldMeta => makeMeta({ id, label: '氏名（姓）' });

const okAttempt = (byId: Record<string, Category> = {}) =>
  vi.fn(async (fields: FieldMeta[], _schedule?: ClassifySchedule, _opts?: { signal?: AbortSignal }) => ({
    map: new Map(fields.map((m): [string, Category] => [m.id, byId[m.id] ?? 'email'])),
    failureReason: null,
  }));

const classifierWith = (attempt: FieldClassifier['attempt']): FieldClassifier => ({
  classify: async () => { throw new Error('must not be called through the run'); },
  attempt,
});

describe('planChunks / scheduleFor (chunk plan ownership)', () => {
  it('keeps fields in order and reports no truncation at or below the cap', () => {
    const plan = planChunks([pendingMeta('a'), pendingMeta('b')]);
    expect(plan.kept.map((m) => m.id)).toEqual(['a', 'b']);
    expect(plan.chunks).toHaveLength(1);
    expect(plan.truncatedCount).toBe(0);
  });

  it('splits into 20-field chunks in send order', () => {
    const fields = Array.from({ length: 45 }, (_, i) => pendingMeta(`f${i}`));
    const plan = planChunks(fields);
    expect(plan.chunks.map((c) => c.length)).toEqual([20, 20, 5]);
    expect(plan.truncatedCount).toBe(0);
  });

  it('caps at the total and reports the dropped count', () => {
    const fields = Array.from({ length: 61 }, (_, i) => pendingMeta(`f${i}`));
    const plan = planChunks(fields);
    expect(plan.kept).toHaveLength(60);
    expect(plan.chunks.map((c) => c.length)).toEqual([20, 20, 20]);
    expect(plan.truncatedCount).toBe(1);
  });

  it('emits a schedule only for split runs', () => {
    expect(scheduleFor(1, 1)).toBeUndefined();
    expect(scheduleFor(2, 3)).toEqual({ index: 2, count: 3 });
  });
});

describe('runClassifyPipeline: entry routing (force / skip / rule-only)', () => {
  it('asks only about unresolved fields without force', async () => {
    const attempt = okAttempt({ p: 'building' });
    const classifier = classifierWith(attempt);
    const result = await runClassifyPipeline(classifier, [confidentMeta('c'), pendingMeta('p')], {});
    expect(attempt).toHaveBeenCalledOnce();
    expect(attempt.mock.calls[0]![0].map((m: FieldMeta) => m.id)).toEqual(['p']);
    expect(result.failureReason).toBeNull();
    expect(result.items.map((i) => [i.meta.id, i.cls.category, i.cls.source])).toEqual([
      ['c', 'lastName', 'rule'], ['p', 'building', 'llm'],
    ]);
  });

  it('sends confident fields too under force', async () => {
    const attempt = okAttempt({ c: 'firstName' });
    const result = await runClassifyPipeline(classifierWith(attempt),
      [confidentMeta('c'), pendingMeta('p')], { force: true });
    expect(attempt.mock.calls[0]![0].map((m: FieldMeta) => m.id).sort()).toEqual(['c', 'p']);
    expect(result.items.find((i) => i.meta.id === 'c')?.cls).toMatchObject({ category: 'firstName', source: 'llm' });
  });

  it('keeps skipped fields out of the attempt on both paths', async () => {
    for (const force of [false, true]) {
      const attempt = okAttempt();
      const classifier = classifierWith(attempt);
      const result = await runClassifyPipeline(classifier,
        [confidentMeta('c'), pendingMeta('p')], { force, llmSkip: new Set(['c', 'p']) });
      expect(attempt, `force=${force}`).not.toHaveBeenCalled();
      expect(result.failureReason, `force=${force}`).toBeNull();
      expect(result.items.every((i) => i.cls.source === 'rule'), `force=${force}`).toBe(true);
    }
  });

  it('stays rule-only with a null classifier and reports no reason', async () => {
    const result = await runClassifyPipeline(null, [confidentMeta('c'), pendingMeta('p')], {});
    expect(result.failureReason).toBeNull();
    expect(result.items).toHaveLength(2);
    expect(result.items.every((i) => i.cls.source === 'rule')).toBe(true);
  });

  it('stays rule-only when nothing is pending without touching the classifier', async () => {
    const attempt = okAttempt();
    const result = await runClassifyPipeline(classifierWith(attempt), [confidentMeta('c')], {});
    expect(attempt).not.toHaveBeenCalled();
    expect(result.failureReason).toBeNull();
  });
});

describe('runClassifyPipeline: partial failure (BDD scenario 1)', () => {
  const manyPending = (n: number) => Array.from({ length: n }, (_, i) => pendingMeta(`f${i}`));

  it('returns the successful chunks with the failing reason when a later chunk fails', async () => {
    const attempt = vi.fn(async (fields: FieldMeta[]) => {
      if (fields[0]!.id === 'f0') {
        return { map: new Map(fields.map((m): [string, Category] => [m.id, 'email'])), failureReason: null };
      }
      return { map: new Map(), failureReason: 'auth' };
    });
    const result = await runClassifyPipeline(classifierWith(attempt), manyPending(25), {});
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result.failureReason).toBe('auth');
    expect(result.items.filter((i) => i.cls.source === 'llm')).toHaveLength(20);
  });

  it('keeps the first failure when every chunk fails', async () => {
    const attempt = vi.fn(async () => ({ map: new Map(), failureReason: 'network' }));
    const result = await runClassifyPipeline(classifierWith(attempt), manyPending(25), {});
    expect(result.failureReason).toBe('network');
    expect(result.items.every((i) => i.cls.source === 'rule')).toBe(true);
  });

  it('reports truncated when the cap drops fields and every chunk succeeded', async () => {
    const attempt = okAttempt();
    const result = await runClassifyPipeline(classifierWith(attempt), manyPending(61), {});
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(result.failureReason).toBe('truncated');
    expect(result.items.filter((i) => i.cls.source === 'llm')).toHaveLength(60);
  });

  it('keeps a chunk failure ahead of the truncation notice', async () => {
    const attempt = vi.fn(async () => ({ map: new Map(), failureReason: 'auth' }));
    const result = await runClassifyPipeline(classifierWith(attempt), manyPending(61), {});
    expect(result.failureReason).toBe('auth');
  });

  it('folds an out-of-vocabulary chunk reason to bad-response', async () => {
    const attempt = vi.fn(async () => ({ map: new Map(), failureReason: 'future-reason' }));
    const result = await runClassifyPipeline(classifierWith(attempt), [pendingMeta('p')], {});
    expect(result.failureReason).toBe('bad-response');
  });

  it('degrades to rule-only with a null reason when the attempt throws (legacy backstop)', async () => {
    const throwing: FieldClassifier = {
      classify: async () => { throw new Error('down'); },
      attempt: async () => { throw new Error('down'); },
    };
    const result = await runClassifyPipeline(throwing, [pendingMeta('p')], {});
    expect(result.failureReason).toBeNull();
    expect(result.items).toHaveLength(1);
  });

  it('stops before sending when already aborted and reports network', async () => {
    const attempt = okAttempt();
    const c = new AbortController();
    c.abort();
    const result = await runClassifyPipeline(classifierWith(attempt), manyPending(25), { signal: c.signal });
    expect(attempt).not.toHaveBeenCalled();
    expect(result.failureReason).toBe('network');
  });
});

describe('runClassifyPipeline: chunk schedule handoff', () => {
  it('passes no schedule for a single chunk and positions for split runs', async () => {
    const attempt = okAttempt();
    const classifier = classifierWith(attempt);
    await runClassifyPipeline(classifier, [pendingMeta('p')], {});
    expect(attempt.mock.calls[0]![1]).toBeUndefined();
    attempt.mockClear();
    await runClassifyPipeline(classifier, Array.from({ length: 25 }, (_, i) => pendingMeta(`f${i}`)), {});
    expect(attempt.mock.calls.map((c) => c[1])).toEqual([{ index: 1, count: 2 }, { index: 2, count: 2 }]);
  });

  it('refines a tel trio across the 20-field chunk boundary', async () => {
    const telAt = (id: string) => makeMeta({ id, type: 'tel', label: '電話番号', nearby: '連絡先' });
    const noise = (n: number) => Array.from({ length: n }, (_, i) => pendingMeta(`x${i}`));
    const attempt = vi.fn(async (fields: FieldMeta[]) => ({
      map: new Map(fields.filter((m) => m.id.startsWith('t')).map((m): [string, Category] => [m.id, 'tel'])),
      failureReason: null,
    }));
    const result = await runClassifyPipeline(classifierWith(attempt),
      [...noise(19), telAt('t1'), telAt('t2'), telAt('t3'), ...noise(3)], {});
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result.items.filter((i) => i.meta.id.startsWith('t')).map((i) => i.cls.category))
      .toEqual(['tel1', 'tel2', 'tel3']);
  });
});

describe('mergeClassified: merge-only contract (order unchanged)', () => {
  it('adopts LLM answers and drops non-gender radio misclassifications', async () => {
    const items = mergeClassified(
      [makeMeta({ id: 'pay', tag: 'radio', name: 'payment_method', label: 'お支払い方法' })],
      new Map([['pay', 'lastName']]),
    );
    expect(items.map((i) => i.cls.category)).toEqual(['unknown']);
  });

  it('lets force adopt confident-field answers', async () => {
    const items = mergeClassified([confidentMeta('c')], new Map([['c', 'firstName']]), { force: true });
    expect(items[0]!.cls).toMatchObject({ category: 'firstName', source: 'llm' });
  });

  it('keeps rule results for fields the LLM does not answer', async () => {
    const items = mergeClassified([confidentMeta('c'), pendingMeta('p')], new Map());
    expect(items.map((i) => i.cls.category)).toEqual(['lastName', 'unknown']);
  });
});

describe('withLegacyThrowFallback: throw path is test-only', () => {
  it('passes attempt-capable classifiers through untouched', () => {
    const classifier = classifierWith(okAttempt());
    expect(withLegacyThrowFallback(classifier)).toBe(classifier);
    expect(withLegacyThrowFallback(null)).toBeNull();
  });

  it('adapts a classify-only fake with the old fail-safe semantics', async () => {
    const legacy = {
      classify: vi.fn(async () => new Map([['p', 'email' as const]])),
    } as unknown as FieldClassifier;
    const seam = withLegacyThrowFallback(legacy)!;
    expect(await seam.attempt!([pendingMeta('p')])).toEqual({ map: new Map([['p', 'email']]), failureReason: null });
    const failing = {
      classify: async () => { throw new Error('x'); },
    } as unknown as FieldClassifier;
    expect(await withLegacyThrowFallback(failing)!.attempt!([pendingMeta('p')]))
      .toEqual({ map: new Map(), failureReason: null });
  });
});
