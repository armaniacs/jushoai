import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseClassifyResult } from '../../src/messages';
import { BackgroundClassifier } from '../../src/llm/background-gateway';
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
    expect(parseClassifyResult({ ok: false, reason: 'bogus' })).toBeNull();
  });
});

describe('BackgroundClassifier legacy failure fidelity (Legacy Bridge Medium)', () => {
  const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}` }));

  it('records null (unknown) for a reason-less {ok:false} reply while keeping earlier chunks', async () => {
    const c = new BackgroundClassifier();
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockResolvedValueOnce({ ok: false });
    const out = await c.classify(metas(30));
    expect([...out]).toEqual([['f0', 'tel']]);
    expect(c.lastFailureReason).toBeNull();
  });

  it('still records bad-response for a genuinely malformed reply', async () => {
    const c = new BackgroundClassifier();
    send.mockResolvedValueOnce({ ok: false, reason: 42 });
    const out = await c.classify(metas(5));
    expect(out.size).toBe(0);
    expect(c.lastFailureReason).toBe('bad-response');
  });

  it('records the reasoned failure verbatim instead of bad-response', async () => {
    const c = new BackgroundClassifier();
    send.mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const out = await c.classify(metas(5));
    expect(out.size).toBe(0);
    expect(c.lastFailureReason).toBe('auth');
  });

  it('resets lastFailureReason to null on a fully successful run', async () => {
    const c = new BackgroundClassifier();
    send.mockResolvedValueOnce({ ok: false, reason: 'network' });
    await c.classify(metas(5));
    expect(c.lastFailureReason).toBe('network');
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true, entries: m.fields.map((f) => [f.id, 'email']),
    }));
    await c.classify(metas(5));
    expect(c.lastFailureReason).toBeNull();
  });
});
