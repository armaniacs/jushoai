import { describe, it, expect } from 'vitest';
import { AuditedClassifier, resultOf, type AttemptTrace, type TracedClassifier } from '../../src/ai/audited-classifier';
import { AUDIT_RESPONSE_CLIP_LENGTH, type AuditDraft } from '../../src/ai/audit-log';
import { HttpAuthError, HttpRequestError } from '../../src/ai/http-classifiers';
import { makeMeta } from '../helpers';

const ctx = { provider: 'openai', host: 'h', model: 'm', purpose: 'classify', pageUrl: 'https://e.com/p' } as const;
const fields = [makeMeta({ id: 'a' }), makeMeta({ id: 'b' })];

const emptyTrace = (): AttemptTrace => ({ status: null, retried: false, request: '', response: '' });

function traced(trace: Partial<AttemptTrace> = {}, map = new Map(), error?: unknown): TracedClassifier {
  return {
    // PBI-42: fakes speak the unified seam too — the reason mirrors the error.
    attempt: async () => ({
      map,
      failureReason: error === undefined ? null : 'network',
      trace: { ...emptyTrace(), ...trace },
      ...(error === undefined ? {} : { error }),
    }),
    classify: async () => {
      if (error !== undefined) throw error;
      return map;
    },
  };
}

function setup(inner: TracedClassifier, failRecord = false) {
  const drafts: AuditDraft[] = [];
  const recorder = { record: async (d: AuditDraft) => { if (failRecord) throw new Error('disk'); drafts.push(d); } };
  return { drafts, wrapped: new AuditedClassifier(inner, ctx, recorder) };
}

describe('AuditedClassifier', () => {
  it('records one success entry with the field count and the returned trace', async () => {
    const { drafts, wrapped } = setup(traced({ status: 200, retried: true, request: 'P', response: 'R' }));
    await wrapped.classify(fields);
    expect(drafts).toEqual([{
      ...ctx, fieldCount: 2, request: 'P', response: 'R', chunkIndex: null, chunkCount: null,
      result: 'success', httpStatus: 200, retried: true, durationMs: expect.any(Number),
    }]);
  });

  it('records the chunk schedule passed by the caller', async () => {
    const { drafts, wrapped } = setup(traced({ request: 'P', response: 'R' }));
    await wrapped.classify(fields, { index: 2, count: 3 });
    expect(drafts[0]).toMatchObject({ chunkIndex: 2, chunkCount: 3 });
  });

  it('records an empty exchange and null schedule when the attempt traces nothing', async () => {
    const { drafts, wrapped } = setup(traced());
    await wrapped.classify(fields);
    expect(drafts[0]).toMatchObject({ request: '', response: '', chunkIndex: null, chunkCount: null });
  });

  it('clips the recorded response past the storage cap', async () => {
    const { drafts, wrapped } = setup(traced({ request: 'P', response: 'x'.repeat(AUDIT_RESPONSE_CLIP_LENGTH + 5) }));
    await wrapped.classify(fields);
    expect(drafts[0]!.response).toHaveLength(AUDIT_RESPONSE_CLIP_LENGTH + 1);
    expect(drafts[0]!.response.endsWith('…')).toBe(true);
  });

  it.each([
    [new HttpAuthError(), 'auth-error'],
    [new HttpRequestError(null, 'x'), 'network-error'],
    [new HttpRequestError(500, 'x'), 'http-error'],
    [new HttpRequestError(200, 'x'), 'invalid-response'],
    [new Error('boom'), 'error'],
  ])('records %s as %s and rethrows', async (err, result) => {
    const { drafts, wrapped } = setup(traced({}, new Map(), err));
    await expect(wrapped.classify(fields)).rejects.toBe(err);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.result).toBe(result);
    expect(drafts[0]!.durationMs).toEqual(expect.any(Number));
    expect(resultOf(err)).toBe(result);
  });

  it('does not change the outcome when the recorder fails', async () => {
    const ok = setup(traced({}, new Map([['a', 'lastName' as const]])), true);
    expect((await ok.wrapped.classify(fields)).get('a')).toBe('lastName');
    const err = new HttpAuthError();
    const bad = setup(traced({}, new Map(), err), true);
    await expect(bad.wrapped.classify(fields)).rejects.toBe(err);
  });
});
