import { describe, it, expect, vi, afterEach } from 'vitest';
import { CLASSIFY_TIMEOUT_MS, MAX_CLASSIFY_TOTAL, getAiStatusViaBackground, requestDownloadViaBackground, testAiViaBackground, BackgroundClassifier } from '../../src/llm/background-gateway';
import { HTTP_TIMEOUT_MS } from '../../src/ai/http-classifiers';
import { makeMeta } from '../helpers';

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

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

  it('chunks into groups of 20 and merges results', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true,
      entries: m.fields.map((f) => [f.id, 'email']),
    }));
    const out = await new BackgroundClassifier().classify(metas(45));
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map((c) => c[0].fields.length)).toEqual([20, 20, 5]);
    expect(out.size).toBe(45);
  });

  it('keeps successful chunks when another fails or is malformed', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockRejectedValueOnce(new Error('x'));
    const out = await new BackgroundClassifier().classify(metas(30));
    expect([...out]).toEqual([['f0', 'tel']]);
  });

  it.each([
    ['not ok', async () => ({ ok: false })],
    ['malformed', async () => 'junk'],
    ['rejected', async () => { throw new Error('x'); }],
  ])('stops sending further chunks after a %s reply and keeps earlier results', async (_n, fail) => {
    send.mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] }).mockImplementationOnce(fail);
    const out = await new BackgroundClassifier().classify(metas(60));
    expect(send).toHaveBeenCalledTimes(2);
    expect([...out]).toEqual([['f0', 'tel']]);
  });

  it('caps the fields sent per run', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true,
      entries: m.fields.map((f) => [f.id, 'email']),
    }));
    const out = await new BackgroundClassifier().classify(metas(100));
    expect(MAX_CLASSIFY_TOTAL).toBe(60);
    expect(send).toHaveBeenCalledTimes(3);
    expect(out.size).toBe(60);
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

  it('returns an empty map for no fields without messaging', async () => {
    expect((await new BackgroundClassifier().classify([])).size).toBe(0);
    expect(send).not.toHaveBeenCalled();
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
      .mockImplementationOnce(never);
    const metas = Array.from({ length: 30 }, (_, i) => makeMeta({ id: `f${i}` }));
    const p = new BackgroundClassifier(50).classify(metas);
    await vi.advanceTimersByTimeAsync(50);
    expect([...(await p)]).toEqual([['f0', 'tel']]);
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
