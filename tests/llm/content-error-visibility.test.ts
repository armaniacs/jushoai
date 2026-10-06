import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ProviderKind } from '../../src/ai/types';
import { DEFAULT_AI_SETTINGS, type AiSettings, type KeyPresence } from '../../src/ai/types';
import type { LanguageModelStatic } from '../../src/llm/availability';
import { handleMessage, type HandlerDeps } from '../../src/llm/handle-message';
import { BackgroundClassifier } from '../../src/llm/background-gateway';
import { parseClassifyResult } from '../../src/messages';
import { makeMeta } from '../helpers';

// --- handle-message helpers (same shape as tests/entrypoints/handle-message.test.ts) ---

const field = (id: string, extra: Record<string, unknown> = {}) => ({
  id, type: 'text', name: '', htmlId: '', label: '', placeholder: '', nearby: '', maxLength: null, ...extra,
});
const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const statusJson = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;
const openaiBody = (content: string) => okJson({ choices: [{ message: { content } }] });

interface Opts {
  settings?: Partial<AiSettings>;
  hasKey?: KeyPresence;
  secrets?: { openai?: string; gemini?: string };
  permitted?: boolean;
  fetch?: ReturnType<typeof vi.fn>;
  lm?: LanguageModelStatic | null;
  authFailed?: Set<ProviderKind>;
}

function makeDeps(o: Opts = {}) {
  const fetchMock = o.fetch ?? vi.fn();
  const authFailed = o.authFailed ?? new Set<ProviderKind>();
  const settings = { ...DEFAULT_AI_SETTINGS, ...o.settings, hasKey: o.hasKey ?? { openai: false, gemini: false } };
  const deps: HandlerDeps = {
    lm: o.lm ?? null,
    loadSettings: async () => settings,
    loadSecrets: async () => o.secrets ?? {},
    hasPermission: async () => o.permitted ?? true,
    fetch: fetchMock as unknown as typeof fetch,
    authFailed,
    compat: new Set<ProviderKind>(),
    audit: { record: async () => {} },
  };
  return { deps, fetchMock, authFailed };
}

const openai: Partial<AiSettings> = {
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
};
const configured = { hasKey: { openai: true, gemini: false }, secrets: { openai: 'sk-test' } };
const msg = { type: 'ai-classify', fields: [field('a', { label: '姓' })] };

describe('ai-classify failure reasons', () => {
  it('reports not-configured when no provider is set up', async () => {
    expect(await handleMessage(msg, makeDeps().deps)).toEqual({ ok: false, reason: 'not-configured' });
    expect(await handleMessage(msg, makeDeps({ settings: openai }).deps)).toEqual({ ok: false, reason: 'not-configured' });
  });

  it('reports permission when the host permission is missing', async () => {
    const { deps, fetchMock } = makeDeps({ settings: openai, ...configured, permitted: false });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'permission' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports auth without touching the network while a failure is recorded', async () => {
    const { deps, fetchMock } = makeDeps({
      settings: openai, ...configured, authFailed: new Set<ProviderKind>(['openai']),
    });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'auth' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports unavailable when built-in AI cannot classify', async () => {
    const { deps } = makeDeps({ settings: { provider: 'built-in' }, lm: null });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('reports auth and records it on 401', async () => {
    const { deps, authFailed } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(401)) });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'auth' });
    expect(authFailed.has('openai')).toBe(true);
  });

  it('reports network for a failing status without recording auth', async () => {
    const { deps, authFailed } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(500)) });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'network' });
    expect(authFailed.size).toBe(0);
  });

  it('reports network when the fetch itself throws', async () => {
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockRejectedValue(new TypeError('down')) });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'network' });
  });

  it('reports rejected when the provider refuses the schema twice', async () => {
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(400)) });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'rejected' });
  });

  it('reports bad-response when the built-in model throws', async () => {
    const lm = {
      availability: async () => 'available',
      create: async () => ({ prompt: async () => { throw new Error('boom'); }, destroy: () => {} }),
    } as unknown as LanguageModelStatic;
    const { deps } = makeDeps({ settings: { provider: 'built-in' }, lm });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('keeps the success shape unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}'));
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    expect(await handleMessage(msg, deps)).toEqual({ ok: true, entries: [['a', 'lastName']] });
  });

  it('never echoes the key in a failure response', async () => {
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(500)) });
    expect(JSON.stringify(await handleMessage(msg, deps))).not.toContain('sk-test');
  });
});

describe('parseClassifyResult', () => {
  it('parses a success into a category map', () => {
    const res = parseClassifyResult({ ok: true, entries: [['a', 'lastName']] });
    expect(res).toEqual({ ok: true, map: new Map([['a', 'lastName']]) });
  });

  it('parses a reasoned failure', () => {
    expect(parseClassifyResult({ ok: false, reason: 'network' })).toEqual({ ok: false, reason: 'network' });
    expect(parseClassifyResult({ ok: false, reason: 'auth' })).toEqual({ ok: false, reason: 'auth' });
  });

  it('rejects a reasonless or bogus failure', () => {
    expect(parseClassifyResult({ ok: false })).toBeNull();
    expect(parseClassifyResult({ ok: false, reason: 'bogus' })).toBeNull();
    expect(parseClassifyResult('junk')).toBeNull();
  });
});

// --- BackgroundClassifier reason interpretation ---

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

describe('BackgroundClassifier failure reasons', () => {
  const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}`, value: 'SECRET' }));

  it('keeps earlier chunks and records the reason after a reasoned failure', async () => {
    send
      .mockResolvedValueOnce({ ok: true, entries: [['f0', 'tel']] })
      .mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const classifier = new BackgroundClassifier();
    const out = await classifier.classify(metas(30));
    expect([...out]).toEqual([['f0', 'tel']]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(classifier.lastFailureReason).toBe('auth');
  });

  it('records bad-response for a malformed reply', async () => {
    send.mockResolvedValueOnce('junk');
    const classifier = new BackgroundClassifier();
    expect((await classifier.classify(metas(1))).size).toBe(0);
    expect(classifier.lastFailureReason).toBe('bad-response');
  });

  it('records network when the send itself fails', async () => {
    send.mockRejectedValueOnce(new Error('Extension context invalidated'));
    const classifier = new BackgroundClassifier();
    expect((await classifier.classify(metas(1))).size).toBe(0);
    expect(classifier.lastFailureReason).toBe('network');
  });

  it('reports no failure reason on success', async () => {
    send.mockResolvedValue({ ok: true, entries: [['f0', 'tel']] });
    const classifier = new BackgroundClassifier();
    expect((await classifier.classify(metas(1))).size).toBe(1);
    expect(classifier.lastFailureReason).toBeNull();
  });

  it('does not send field values on the failure path', async () => {
    send.mockResolvedValue({ ok: false, reason: 'network' });
    await new BackgroundClassifier().classify(metas(1));
    expect(JSON.stringify(send.mock.calls[0]![0])).not.toContain('SECRET');
  });
});
