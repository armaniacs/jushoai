import { describe, expect, it, vi, afterEach } from 'vitest';
import type { ProviderKind } from '../../src/ai/types';
import type { PublicAiSettings } from '../../src/ai/types';
import { asClassifyFailure } from '../../src/messages';
import { BackgroundClassifier } from '../../src/llm/background-gateway';
import { ProviderRegistry } from '../../src/llm/provider-registry';
import { makeMeta } from '../helpers';

// PBI-174 step 1: 失敗語彙の優先順位を ClassifyPipeline 集約の前に固定する。
// ここで pin する順序は集約後も変えない:
//   - チャンク失敗が切り詰め通知より優先される (gateway)
//   - abort/期限切れの打ち切りが切り詰め通知より優先される (gateway)
//   - 未知語彙は bad-response に畳まれ、null(成功/legacy 不明)は通す (messages)
//   - HTTP 状態→語彙の対応は classify/test で同一 (registry。test の
//     bad-response→network 読み替えだけが歴史的非対称として残る)

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}` }));

describe('failure vocabulary priority: gateway chunk failure beats truncation', () => {
  it('keeps a chunk failure ahead of the truncation notice', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const attempt = await new BackgroundClassifier().attempt(metas(61));
    expect(attempt.failureReason).toBe('auth');
    expect(attempt.truncatedCount).toBe(1);
    expect(attempt.map.size).toBe(1);
  });

  it('keeps an abort cutoff ahead of the truncation notice', async () => {
    const c = new AbortController();
    c.abort();
    const attempt = await new BackgroundClassifier().attempt(metas(61), undefined, { signal: c.signal });
    expect(send).not.toHaveBeenCalled();
    expect(attempt.failureReason).toBe('network');
    expect(attempt.truncatedCount).toBe(1);
  });

  it('keeps the first failure when a later chunk would also fail', async () => {
    send
      .mockResolvedValueOnce({ ok: false, reason: 'auth' })
      .mockResolvedValueOnce({ ok: false, reason: 'network' });
    const attempt = await new BackgroundClassifier().attempt(metas(30));
    expect(send).toHaveBeenCalledTimes(1);
    expect(attempt.failureReason).toBe('auth');
    expect(attempt.map.size).toBe(0);
  });

  it('reports truncated only when every chunk succeeded', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true,
      entries: m.fields.map((f) => [f.id, 'email']),
    }));
    const attempt = await new BackgroundClassifier().attempt(metas(61));
    expect(attempt.failureReason).toBe('truncated');
    expect(attempt.truncatedCount).toBe(1);
    expect(attempt.map.size).toBe(60);
  });

  it('folds a reason-less legacy failure into truncated when the cap also drops fields', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockResolvedValueOnce({ ok: false });
    const attempt = await new BackgroundClassifier().attempt(metas(61));
    expect(attempt.failureReason).toBe('truncated');
    expect(attempt.truncatedCount).toBe(1);
    expect([...attempt.map]).toEqual([['f0', 'tel']]);
  });
});

describe('failure vocabulary priority: asClassifyFailure normalization', () => {
  it('lets null (success) through', () => {
    expect(asClassifyFailure(null)).toBeNull();
  });

  it.each([
    'not-configured', 'permission', 'auth', 'network', 'rejected', 'bad-response', 'unavailable', 'first-dial', 'truncated',
  ] as const)('passes the vocabulary reason %s through', (reason) => {
    expect(asClassifyFailure(reason)).toBe(reason);
  });

  it('folds an out-of-vocabulary reason to bad-response', () => {
    expect(asClassifyFailure('future-reason')).toBe('bad-response');
    expect(asClassifyFailure('')).toBe('bad-response');
  });
});

describe('failure vocabulary priority: registry status mapping', () => {
  const openaiSettings = {
    provider: 'openai',
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
    gemini: { model: '', apiVersion: 'v1beta' },
    hasKey: { openai: true, gemini: false },
  } as PublicAiSettings;
  const secrets = { openai: 'sk-test' };
  const statusJson = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;
  const registryWith = (fetchMock: ReturnType<typeof vi.fn>) => new ProviderRegistry(
    {
      getLanguageModel: () => null,
      hasPermission: async () => true,
      fetch: fetchMock as unknown as typeof fetch,
      audit: { record: async () => {} },
    },
    { authFailed: new Set<ProviderKind>(), compat: new Set<ProviderKind>() },
  );
  const fields = [makeMeta({ id: 'a', label: '姓' })];

  it('maps 401 to auth in classify', async () => {
    const registry = registryWith(vi.fn().mockResolvedValue(statusJson(401)));
    await expect(registry.classify(openaiSettings, secrets, fields, { purpose: 'classify' }))
      .resolves.toEqual({ ok: false, reason: 'auth' });
  });

  it('maps 500 to network in classify', async () => {
    const registry = registryWith(vi.fn().mockResolvedValue(statusJson(500)));
    await expect(registry.classify(openaiSettings, secrets, fields, { purpose: 'classify' }))
      .resolves.toEqual({ ok: false, reason: 'network' });
  });

  it('maps a repeated 400 (compat retry exhausted) to rejected in classify', async () => {
    const fetchMock = vi.fn().mockResolvedValue(statusJson(400));
    const registry = registryWith(fetchMock);
    await expect(registry.classify(openaiSettings, secrets, fields, { purpose: 'classify' }))
      .resolves.toEqual({ ok: false, reason: 'rejected' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps a fetch failure to network in classify and test alike', async () => {
    const failing = () => { throw new Error('down'); };
    await expect(registryWith(vi.fn(failing)).classify(openaiSettings, secrets, fields, { purpose: 'classify' }))
      .resolves.toEqual({ ok: false, reason: 'network' });
    await expect(registryWith(vi.fn(failing)).test(openaiSettings, secrets))
      .resolves.toEqual({ ok: false, reason: 'network' });
  });

  it('maps 401 to auth in test', async () => {
    const registry = registryWith(vi.fn().mockResolvedValue(statusJson(401)));
    await expect(registry.test(openaiSettings, secrets))
      .resolves.toEqual({ ok: false, reason: 'auth' });
  });
});
