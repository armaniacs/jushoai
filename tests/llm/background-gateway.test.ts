import { describe, it, expect, vi, afterEach } from 'vitest';
import { CLASSIFY_TIMEOUT_MS, MAX_CLASSIFY_TOTAL, getAiStatusViaBackground, requestDownloadViaBackground, testAiViaBackground, BackgroundClassifier } from '../../src/llm/background-gateway';
import { runClassifyPipeline } from '../../src/classify-pipeline/pipeline';
import { HTTP_TIMEOUT_MS } from '../../src/ai/http-classifiers';
import { makeMeta } from '../helpers';

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

// Pending metas for the canonical run route (PBI-193): run-level pins drive
// runClassifyPipeline + BackgroundClassifier + the wire, the one composition
// production uses, instead of re-pinning the chunk run per layer.
const pending = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}`, name: `xyz-${i}` }));
const llmItems = (result: { items: { meta: { id: string }; cls: { source: string; category: string } }[] }) =>
  result.items.filter((i) => i.cls.source === 'llm').map((i) => [i.meta.id, i.cls.category] as const);
const echo = async (m: { fields: { id: string }[] }) => ({
  ok: true,
  entries: m.fields.map((f) => [f.id, 'email']),
});

describe('getAiStatusViaBackground', () => {
  it('returns the status, and unavailable on malformed or failed replies', async () => {
    const unknown = { status: 'unavailable', provider: 'none' };
    send.mockResolvedValueOnce({ status: 'available', provider: 'built-in' });
    expect(await getAiStatusViaBackground()).toEqual({ status: 'available', provider: 'built-in' });
    send.mockResolvedValueOnce({ status: 'unsupported', provider: 'built-in' });
    expect(await getAiStatusViaBackground()).toEqual({ status: 'unsupported', provider: 'built-in' });
    send.mockResolvedValueOnce({ status: 'weird', provider: 'built-in' });
    expect(await getAiStatusViaBackground()).toEqual(unknown);
    send.mockResolvedValueOnce(undefined);
    expect(await getAiStatusViaBackground()).toEqual(unknown);
    send.mockRejectedValueOnce(new Error('x'));
    expect(await getAiStatusViaBackground()).toEqual(unknown);
  });
});

describe('requestDownloadViaBackground', () => {
  it('reports started only for a well-formed true reply', async () => {
    send.mockResolvedValueOnce({ started: true });
    expect(await requestDownloadViaBackground()).toBe(true);
    send.mockRejectedValueOnce(new Error('x'));
    expect(await requestDownloadViaBackground()).toBe(false);
  });
});

describe('BackgroundClassifier', () => {
  const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}`, value: 'SECRET' }));

  it('chunks into groups of 20 and merges results through the canonical run', async () => {
    send.mockImplementation(echo);
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(45), {});
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map((c) => c[0].fields.length)).toEqual([20, 20, 5]);
    expect(llmItems(result)).toHaveLength(45);
  });

  it('keeps successful chunks when another fails or is malformed', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockRejectedValue(new Error('x'));
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(30), {});
    expect(send).toHaveBeenCalledTimes(2);
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
    expect(result.failureReason).toBe('network');
  });

  it.each([
    ['not ok', { ok: false } as const, null],
    ['malformed', 'junk' as const, 'bad-response'],
  ])('keeps earlier results and records the failure after a %s reply', async (_n, fail, reason) => {
    send.mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] }).mockResolvedValue(fail);
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(60), {});
    // The canonical run keeps sending the remaining chunks (its own discipline:
    // first failure wins, earlier results stay), so all three chunks go out.
    expect(send).toHaveBeenCalledTimes(3);
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
    expect(result.failureReason).toBe(reason);
  });

  it('keeps earlier results and records the first failure after a rejected reply', async () => {
    send.mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] }).mockRejectedValue(new Error('x'));
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(60), {});
    expect(send).toHaveBeenCalledTimes(3);
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
    expect(result.failureReason).toBe('network');
  });

  it('caps the fields sent per run', async () => {
    send.mockImplementation(echo);
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(100), {});
    expect(MAX_CLASSIFY_TOTAL).toBe(60);
    expect(send).toHaveBeenCalledTimes(3);
    expect(llmItems(result)).toHaveLength(60);
    expect(result.failureReason).toBe('truncated');
  });

  it('keeps the gateway timeout above two HTTP attempts', () => {
    expect(CLASSIFY_TIMEOUT_MS).toBeGreaterThan(2 * HTTP_TIMEOUT_MS);
    expect(CLASSIFY_TIMEOUT_MS).toBe(45_000);
    expect(CLASSIFY_TIMEOUT_MS).toBeGreaterThan(HTTP_TIMEOUT_MS);
    expect(HTTP_TIMEOUT_MS).toBe(20_000);
  });

  it('does not send field values', async () => {
    send.mockResolvedValue({ ok: false });
    await new BackgroundClassifier().classify(metas(1));
    expect(JSON.stringify(send.mock.calls[0]![0])).not.toContain('SECRET');
  });

  it('omits the chunk key on single-chunk runs (review #6)', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true,
      entries: m.fields.map((f) => [f.id, 'email']),
    }));
    await new BackgroundClassifier().classify(metas(5));
    expect(send).toHaveBeenCalledOnce();
    const msg = send.mock.calls[0]![0] as Record<string, unknown>;
    expect(msg.type).toBe('ai-classify');
    expect('chunk' in msg).toBe(false);
  });

  it('carries the chunk position only on split runs', async () => {
    send.mockImplementation(echo);
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(45), {});
    expect(send).toHaveBeenCalledTimes(3);
    const chunks = send.mock.calls.map((c) => (c[0] as Record<string, unknown>).chunk);
    expect(chunks).toEqual([
      { index: 1, count: 3 },
      { index: 2, count: 3 },
      { index: 3, count: 3 },
    ]);
    expect(result.failureReason).toBeNull();
  });

  it('returns an empty map for no fields without messaging', async () => {
    expect((await new BackgroundClassifier().classify([])).size).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('BackgroundClassifier truncation signal (PBI-25)', () => {
  it('reports truncated when fields exceed the cap', async () => {
    send.mockImplementation(echo);
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(61), {});
    expect(send).toHaveBeenCalledTimes(3);
    expect(llmItems(result)).toHaveLength(60);
    expect(result.failureReason).toBe('truncated');
  });

  it('reports no truncation at or below the cap', async () => {
    send.mockImplementation(echo);
    for (const n of [1, 60]) {
      const result = await runClassifyPipeline(new BackgroundClassifier(), pending(n), {});
      expect(llmItems(result)).toHaveLength(n);
      expect(result.failureReason).toBeNull();
    }
  });

  it('keeps a chunk failure ahead of the truncation notice', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockResolvedValue({ ok: false, reason: 'auth' });
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(61), {});
    expect(result.failureReason).toBe('auth');
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
  });
});

describe('timeouts', () => {
  afterEach(() => vi.useRealTimers());
  const never = () => new Promise(() => {});

  it('falls back to unavailable when the status reply hangs', async () => {
    vi.useFakeTimers();
    send.mockImplementationOnce(never);
    const p = getAiStatusViaBackground(50);
    await vi.advanceTimersByTimeAsync(50);
    expect(await p).toEqual({ status: 'unavailable', provider: 'none' });
  });

  it('stops after the hung classify chunk', async () => {
    vi.useFakeTimers();
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockImplementation(never);
    const p = runClassifyPipeline(new BackgroundClassifier(50), pending(30), {});
    await vi.advanceTimersByTimeAsync(50);
    const result = await p;
    expect(send).toHaveBeenCalledTimes(2);
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
    expect(result.failureReason).toBe('network');
  });

  it('download resolves false on timeout', async () => {
    vi.useFakeTimers();
    send.mockImplementationOnce(never);
    const p = requestDownloadViaBackground(50);
    await vi.advanceTimersByTimeAsync(50);
    expect(await p).toBe(false);
  });

  it('clears the timer after a normal reply', async () => {
    vi.useFakeTimers();
    send.mockResolvedValueOnce({ status: 'available', provider: 'built-in' });
    await getAiStatusViaBackground(5000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('BackgroundClassifier total timeout and abort (PBI-33)', () => {
  const hang = () => new Promise(() => {});

  it('clamps a hung chunk to the remaining budget and keeps earlier results with a reason', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockImplementationOnce(hang);
    const result = await runClassifyPipeline(new BackgroundClassifier(5_000, 60), pending(60), {});
    // Each chunk send is clamped to the remaining budget (min(5_000, 60ms)),
    // so the hung second chunk is cut at ~60ms; the canonical run keeps
    // sending the third chunk, whose send still carries the clamp.
    expect(send).toHaveBeenCalledTimes(3);
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
    expect(result.failureReason).toBe('network');
  });

  it('sends nothing when already aborted and reports a reason for rule-only continuation', async () => {
    const c = new AbortController();
    c.abort();
    const res = await new BackgroundClassifier().attempt(pending(30), undefined, { signal: c.signal });
    expect(send).not.toHaveBeenCalled();
    expect(res.map.size).toBe(0);
    expect(res.failureReason).toBe('network');
  });

  it('links an abort to the in-flight chunk and skips unsent chunks', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockImplementationOnce(hang);
    const c = new AbortController();
    const p = runClassifyPipeline(new BackgroundClassifier(), pending(60), { signal: c.signal });
    await new Promise((r) => setTimeout(r, 10));
    c.abort();
    const result = await p;
    expect(send).toHaveBeenCalledTimes(2);
    expect(llmItems(result)).toEqual([['f0', 'tel']]);
    expect(result.failureReason).toBe('network');
  });

  it('keeps a cutoff ahead of the truncation notice', async () => {
    const c = new AbortController();
    c.abort();
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(61), { signal: c.signal });
    expect(send).not.toHaveBeenCalled();
    expect(result.failureReason).toBe('network');
    expect(result.items.every((i) => i.cls.source === 'rule')).toBe(true);
  });

  it('leaves fast runs within budget unchanged', async () => {
    send.mockImplementation(echo);
    const result = await runClassifyPipeline(new BackgroundClassifier(), pending(45), {});
    expect(send).toHaveBeenCalledTimes(3);
    expect(llmItems(result)).toHaveLength(45);
    expect(result.failureReason).toBeNull();
  });
});

describe('getAiStatusViaBackground (status info)', () => {
  it('returns status and provider from a valid reply', async () => {
    send.mockResolvedValueOnce({ status: 'available', provider: 'openai' });
    expect(await getAiStatusViaBackground()).toEqual({ status: 'available', provider: 'openai' });
  });

  it('falls back to unavailable for malformed replies, errors and timeouts', async () => {
    send.mockResolvedValueOnce({ status: 'bogus' });
    expect(await getAiStatusViaBackground()).toEqual({ status: 'unavailable', provider: 'none' });
    send.mockRejectedValueOnce(new Error('x'));
    expect(await getAiStatusViaBackground()).toEqual({ status: 'unavailable', provider: 'none' });
    send.mockImplementationOnce(() => new Promise(() => {}));
    expect(await getAiStatusViaBackground(10)).toEqual({ status: 'unavailable', provider: 'none' });
  });
});

describe('testAiViaBackground', () => {
  it('returns a parsed result and null for malformed or failed replies', async () => {
    send.mockResolvedValueOnce({ ok: true, category: 'fullName' });
    expect(await testAiViaBackground()).toEqual({ ok: true, category: 'fullName' });
    send.mockResolvedValueOnce({ nope: 1 });
    expect(await testAiViaBackground()).toBeNull();
    send.mockRejectedValueOnce(new Error('x'));
    expect(await testAiViaBackground()).toBeNull();
    send.mockImplementationOnce(() => new Promise(() => {}));
    expect(await testAiViaBackground(10)).toBeNull();
  });
});
