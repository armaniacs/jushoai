import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAiStatusViaBackground, requestDownloadViaBackground, BackgroundClassifier } from '../../src/llm/background-gateway';
import { makeMeta } from '../helpers';

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

describe('getAiStatusViaBackground', () => {
  it('returns the status, and unsupported on malformed or failed replies', async () => {
    send.mockResolvedValueOnce({ status: 'available' });
    expect(await getAiStatusViaBackground()).toBe('available');
    send.mockResolvedValueOnce({ status: 'weird' });
    expect(await getAiStatusViaBackground()).toBe('unsupported');
    send.mockResolvedValueOnce(undefined);
    expect(await getAiStatusViaBackground()).toBe('unsupported');
    send.mockRejectedValueOnce(new Error('x'));
    expect(await getAiStatusViaBackground()).toBe('unsupported');
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
