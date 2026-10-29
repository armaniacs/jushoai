import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseClassifyResult } from '../../src/messages';
import { BackgroundClassifier } from '../../src/llm/background-gateway';
import { runClassifyPipeline } from '../../src/classify-pipeline/pipeline';
import { makeMeta } from '../helpers';

// Legacy Bridge (fixed): an old background answering `{ok:false}` WITHOUT a
// reason no longer folds into `lastFailureReason = 'bad-response'`. The
// gateway records null (reason unknown) while keeping earlier chunks, so a
// legacy failure stays distinguishable from a genuinely malformed reply.

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

describe('parseClassifyResult legacy shape (Legacy Bridge Medium)', () => {
  it('returns null for reason-less {ok:false} from an old background', () => {
    expect(parseClassifyResult({ ok: false })).toBeNull();
  });

  it('keeps reasoned failures distinct from null', () => {
    expect(parseClassifyResult({ ok: false, reason: 'auth' })).toEqual({ ok: false, reason: 'auth' });
    expect(parseClassifyResult({ ok: false, reason: 'unavailable' })).toEqual({ ok: false, reason: 'unavailable' });
    expect(parseClassifyResult({ ok: false, reason: 'truncated' })).toEqual({ ok: false, reason: 'truncated' });
    expect(parseClassifyResult({ ok: false, reason: 'bogus' })).toBeNull();
  });
});

describe('BackgroundClassifier legacy failure fidelity (Legacy Bridge Medium)', () => {
  const pending = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}`, name: `xyz-${i}` }));
  const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}` }));

  it('reports null (unknown) for a reason-less {ok:false} reply while keeping earlier chunks', async () => {
    const c = new BackgroundClassifier();
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockResolvedValue({ ok: false });
    const result = await runClassifyPipeline(c, pending(30), {});
    const kept = result.items.find((i) => i.meta.id === 'f0' && i.cls.source === 'llm');
    expect(kept).toMatchObject({ cls: { category: 'tel' } });
    expect(result.failureReason).toBeNull();
  });

  it('still reports bad-response for a genuinely malformed reply', async () => {
    const c = new BackgroundClassifier();
    send.mockResolvedValueOnce({ ok: false, reason: 42 });
    const attempt = await c.attempt(metas(5));
    expect(attempt.map.size).toBe(0);
    expect(attempt.failureReason).toBe('bad-response');
  });

  it('reports the reasoned failure verbatim instead of bad-response', async () => {
    const c = new BackgroundClassifier();
    send.mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const attempt = await c.attempt(metas(5));
    expect(attempt.map.size).toBe(0);
    expect(attempt.failureReason).toBe('auth');
  });

  it('binds each attempt to its own reason with no shared mutable', async () => {
    const c = new BackgroundClassifier();
    send.mockResolvedValueOnce({ ok: false, reason: 'network' });
    expect((await c.attempt(metas(5))).failureReason).toBe('network');
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true, entries: m.fields.map((f) => [f.id, 'email']),
    }));
    const second = await c.attempt(metas(5));
    expect(second.failureReason).toBeNull();
    expect(second.map.size).toBe(5);
  });
});
