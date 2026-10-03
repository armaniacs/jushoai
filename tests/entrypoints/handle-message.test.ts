import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_AI_SETTINGS, type AiSettings, type KeyPresence, type ProviderKind } from '../../src/ai/types';
import type { LanguageModelStatic } from '../../src/llm/availability';
import { handleMessage, type HandlerDeps } from '../../src/llm/handle-message';

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
  };
  return { deps, fetchMock, authFailed };
}

const openai: Partial<AiSettings> = {
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
};
const configured = { hasKey: { openai: true, gemini: false }, secrets: { openai: 'sk-test' } };

const builtInLm = (availability: string, answer = '{"a":"lastName"}'): LanguageModelStatic => ({
  availability: async () => availability as never,
  create: async () => ({ prompt: async () => answer, destroy: () => {} }),
});

describe('handleMessage: shape handling', () => {
  it('ignores anything that is not exactly one of the request shapes', async () => {
    const { deps } = makeDeps();
    expect(await handleMessage({ type: 'nope' }, deps)).toBeUndefined();
    expect(await handleMessage('x', deps)).toBeUndefined();
  });

  it('drops forged field values before they reach a provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}'));
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    await handleMessage({ type: 'ai-classify', fields: [field('a', { value: 'FORGED', label: '姓', options: ['x'] })] }, deps);
    const sent = (fetchMock.mock.calls[0]![1] as RequestInit).body as string;
    expect(sent).not.toContain('FORGED');
  });
});

describe('handleMessage: ai-status', () => {
  it('reports disabled for provider none and does not touch the network', async () => {
    const { deps, fetchMock } = makeDeps();
    expect(await handleMessage({ type: 'ai-status' }, deps)).toEqual({ status: 'disabled', provider: 'none' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports the Prompt API availability for built-in', async () => {
    const a = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('available') });
    expect(await handleMessage({ type: 'ai-status' }, a.deps)).toEqual({ status: 'available', provider: 'built-in' });
    const b = makeDeps({ settings: { provider: 'built-in' }, lm: null });
    expect(await handleMessage({ type: 'ai-status' }, b.deps)).toEqual({ status: 'unsupported', provider: 'built-in' });
  });

  it('walks through not-configured, permission-missing, auth-error and available for a cloud provider', async () => {
    const run = (o: Opts) => handleMessage({ type: 'ai-status' }, makeDeps({ settings: openai, ...o }).deps);
    expect(await run({})).toEqual({ status: 'not-configured', provider: 'openai' });
    expect(await run({ ...configured, permitted: false })).toEqual({ status: 'permission-missing', provider: 'openai' });
    expect(await run({ ...configured, authFailed: new Set<ProviderKind>(['openai']) })).toEqual({ status: 'auth-error', provider: 'openai' });
    expect(await run(configured)).toEqual({ status: 'available', provider: 'openai' });
  });
});

describe('handleMessage: ai-download', () => {
  it('only starts a download for built-in', async () => {
    const create = vi.fn().mockResolvedValue({ destroy: () => {} });
    const lm = { availability: async () => 'downloadable', create } as unknown as LanguageModelStatic;
    const built = makeDeps({ settings: { provider: 'built-in' }, lm });
    expect(await handleMessage({ type: 'ai-download' }, built.deps)).toEqual({ started: true });
    const cloud = makeDeps({ settings: openai, lm });
    expect(await handleMessage({ type: 'ai-download' }, cloud.deps)).toEqual({ started: false });
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('handleMessage: ai-classify', () => {
  const msg = { type: 'ai-classify', fields: [field('a', { label: '姓' })] };

  it('does nothing for none and for unconfigured providers', async () => {
    const none = makeDeps();
    expect(await handleMessage(msg, none.deps)).toEqual({ ok: false });
    const unset = makeDeps({ settings: openai });
    expect(await handleMessage(msg, unset.deps)).toEqual({ ok: false });
    expect(none.fetchMock).not.toHaveBeenCalled();
    expect(unset.fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the network without host permission', async () => {
    const { deps, fetchMock } = makeDeps({ settings: openai, ...configured, permitted: false });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('classifies through the OpenAI-compatible provider using the stored key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}'));
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    expect(await handleMessage(msg, deps)).toEqual({ ok: true, entries: [['a', 'lastName']] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
  });

  it('classifies through Gemini', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ candidates: [{ content: { parts: [{ text: '{"a":"email"}' }] } }] }));
    const { deps } = makeDeps({
      settings: { provider: 'gemini', gemini: { model: 'g', apiVersion: 'v1beta' } },
      hasKey: { openai: false, gemini: true },
      secrets: { gemini: 'g-key' },
      fetch: fetchMock,
    });
    expect(await handleMessage(msg, deps)).toEqual({ ok: true, entries: [['a', 'email']] });
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'g-key' });
  });

  it('uses the Prompt API for built-in and degrades when it is unavailable', async () => {
    const ok = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('available') });
    expect(await handleMessage(msg, ok.deps)).toEqual({ ok: true, entries: [['a', 'lastName']] });
    const off = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('unavailable') });
    expect(await handleMessage(msg, off.deps)).toEqual({ ok: false });
  });

  it('records an authentication failure and stops sending until settings change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(statusJson(401));
    const { deps, authFailed } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
    expect(authFailed.has('openai')).toBe(true);
    expect(await handleMessage({ type: 'ai-status' }, deps)).toEqual({ status: 'auth-error', provider: 'openai' });
    await handleMessage(msg, deps);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns ok:false for non-auth failures without recording an auth error', async () => {
    const { deps, authFailed } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(500)) });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
    expect(authFailed.size).toBe(0);
  });

  it('does not leak the API key into any response', async () => {
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(500)) });
    expect(JSON.stringify(await handleMessage(msg, deps))).not.toContain('sk-test');
  });
});

describe('handleMessage: ai-test', () => {
  it('returns the category of a synthetic field on success and clears a recorded auth failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"t":"fullName"}'));
    const authFailed = new Set<ProviderKind>(['openai']);
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock, authFailed });
    expect(await handleMessage({ type: 'ai-test' }, deps)).toEqual({ ok: true, category: 'fullName' });
    expect(authFailed.size).toBe(0);
  });

  it('maps failures to reasons', async () => {
    const none = makeDeps();
    expect(await handleMessage({ type: 'ai-test' }, none.deps)).toEqual({ ok: false, reason: 'not-configured' });
    const noPerm = makeDeps({ settings: openai, ...configured, permitted: false });
    expect(await handleMessage({ type: 'ai-test' }, noPerm.deps)).toEqual({ ok: false, reason: 'permission' });
    const auth = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(403)) });
    expect(await handleMessage({ type: 'ai-test' }, auth.deps)).toEqual({ ok: false, reason: 'auth' });
    const net = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockRejectedValue(new TypeError('x')) });
    expect(await handleMessage({ type: 'ai-test' }, net.deps)).toEqual({ ok: false, reason: 'network' });
    const bad = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(openaiBody('{}')) });
    expect(await handleMessage({ type: 'ai-test' }, bad.deps)).toEqual({ ok: false, reason: 'bad-response' });
  });
});

describe('handleMessage: built-in behaviors', () => {
  const msg = { type: 'ai-classify', fields: [field('a', { label: '姓' })] };

  it('reports downloadable and classifies only when available', async () => {
    const dl = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('downloadable') });
    expect(await handleMessage({ type: 'ai-status' }, dl.deps)).toEqual({ status: 'downloadable', provider: 'built-in' });
    expect(await handleMessage(msg, dl.deps)).toEqual({ ok: false });
    const nolm = makeDeps({ settings: { provider: 'built-in' }, lm: null });
    expect(await handleMessage(msg, nolm.deps)).toEqual({ ok: false });
  });

  it('returns serializable entries and never sends field values to the model', async () => {
    const prompt = vi.fn().mockResolvedValue('{"a":"lastName"}');
    const lm = { availability: async () => 'available', create: async () => ({ prompt, destroy: () => {} }) } as unknown as LanguageModelStatic;
    const { deps } = makeDeps({ settings: { provider: 'built-in' }, lm });
    const res = await handleMessage({ type: 'ai-classify', fields: [field('a', { value: 'TOPSECRET' })] }, deps);
    expect(() => JSON.stringify(res)).not.toThrow();
    expect(String(prompt.mock.calls[0]![0])).not.toContain('TOPSECRET');
  });

  it('returns ok:false when the model throws', async () => {
    const lm = {
      availability: async () => 'available',
      create: async () => ({ prompt: async () => { throw new Error('boom'); }, destroy: () => {} }),
    } as unknown as LanguageModelStatic;
    const { deps } = makeDeps({ settings: { provider: 'built-in' }, lm });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
  });

  it('reports started:false when download is unavailable or create fails', async () => {
    const nolm = makeDeps({ settings: { provider: 'built-in' }, lm: null });
    expect(await handleMessage({ type: 'ai-download' }, nolm.deps)).toEqual({ started: false });
    const lm = { availability: async () => 'downloadable', create: async () => { throw new Error('no gesture'); } } as unknown as LanguageModelStatic;
    const bad = makeDeps({ settings: { provider: 'built-in' }, lm });
    expect(await handleMessage({ type: 'ai-download' }, bad.deps)).toEqual({ started: false });
  });
});
