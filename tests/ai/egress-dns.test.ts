// Ported from the audit exploit test for VULN-001 (CWE-918/CWE-367), inverted to expect
// rejection: a nip.io name that resolves to a private address must be rejected by the
// resolved-address gate at save time and at dial time, offline via a fake DoH fetch.
// A DoH outage is an escape hatch, not a block: only confirmed internal resolutions are
// rejected; an unreachable resolver lets the dial proceed and warns at save time.
import { describe, it, expect, vi } from 'vitest';
import {
  createEgressCheck, DOH_ORIGIN, DOH_TIMEOUT_MS, isPrivateIp, normalizeAiSettings,
  validateAiSettingsResolved, validateBaseUrlResolved,
  type EgressCheck,
} from '../../src/ai/settings';
import { autoEgress, createOpenAiClassifier, HttpRequestError } from '../../src/ai/http-classifiers';
import { handleMessage, type HandlerDeps } from '../../src/llm/handle-message';
import { makeMeta } from '../helpers';

const field = makeMeta({ id: 'f', label: '姓' });
const openai = { baseUrl: 'https://api.openai.com/v1', model: 'm' };

type DohAnswers = { A?: string[]; AAAA?: string[] };

// DoH JSON API fake; counts queries so tests can assert the per-classify lookup budget.
// Every request is pinned to DOH_ORIGIN so resolver drift fails the tests.
function dohFetch(answers: DohAnswers, opts: { fail?: boolean; status?: number } = {}) {
  const calls: string[] = [];
  const fake = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (`${url.origin}${url.pathname}` !== DOH_ORIGIN) throw new Error(`unexpected DoH origin: ${url}`);
    const type = url.searchParams.get('type') === 'AAAA' ? 'AAAA' : 'A';
    calls.push(type);
    if (opts.fail) throw new TypeError('doh unreachable');
    if (opts.status !== undefined && opts.status !== 200) {
      return { ok: false, status: opts.status, json: async () => ({}) } as Response;
    }
    const data = answers[type] ?? [];
    return {
      ok: true,
      status: 200,
      json: async () => ({ Status: 0, Answer: data.map((d) => ({ type: type === 'A' ? 1 : 28, data: d })) }),
    } as Response;
  }) as typeof fetch;
  return { fake, calls };
}

const classifyOk = () =>
  ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"f":"lastName"}' } }] }) }) as Response;

const attackerSettings = (baseUrl: string) =>
  normalizeAiSettings({ provider: 'openai', openai: { baseUrl, model: 'gpt-4o-mini' } });

function makeDeps(o: {
  settings: ReturnType<typeof attackerSettings>;
  egress: EgressCheck;
  fetch: typeof fetch;
  hasKey?: { openai: boolean; gemini: boolean };
  secrets?: { openai?: string; gemini?: string };
}): HandlerDeps {
  return {
    lm: null,
    loadSettings: async () => ({ ...o.settings, hasKey: o.hasKey ?? { openai: true, gemini: false } }),
    loadSecrets: async () => o.secrets ?? { openai: 'sk-test' },
    hasPermission: async () => true,
    fetch: o.fetch,
    authFailed: new Set(),
    compat: new Set(),
    audit: { record: async () => {} },
    egress: o.egress,
  };
}

describe('isPrivateIp', () => {
  it.each([
    ['0.0.0.0', true], ['10.1.2.3', true], ['127.0.0.1', true],
    ['100.63.255.255', false], ['100.64.0.1', true], ['100.127.255.255', true], ['100.128.0.1', false],
    ['169.253.255.255', false], ['169.254.169.254', true],
    ['172.15.255.255', false], ['172.16.0.0', true], ['172.31.255.255', true], ['172.32.0.1', false],
    ['192.167.255.255', false], ['192.168.0.0', true],
    ['198.17.255.255', false], ['198.18.0.1', true], ['198.19.255.255', true], ['198.20.0.1', false],
    ['224.0.0.1', true], ['240.0.0.1', true], ['255.255.255.255', true],
    ['8.8.8.8', false], ['93.184.216.34', false],
  ])('ipv4 %s -> %s', (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });

  it.each([
    ['::', true], ['::1', true], ['0:0:0:0:0:0:0:1', true],
    ['fe7f::1', false], ['fe80::1', true], ['febf::1', true], ['fec0::1', false],
    ['fb00::1', false], ['fc00::1', true], ['fd00::1', true], ['fdff::1', true],
    ['::ffff:10.0.0.1', true], ['::ffff:8.8.8.8', false], ['::ffff:a00:1', true],
    ['2606:4700:4700::1111', false],
  ])('ipv6 %s -> %s', (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });
});

describe('createEgressCheck', () => {
  it('allows loopback hosts without resolving', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('http://127.0.0.1:1234/v1'))).resolves.toEqual({ ok: true, verified: true });
    await expect(check(new URL('https://localhost:8443/v1'))).resolves.toEqual({ ok: true, verified: true });
    expect(doh.calls).toEqual([]);
  });

  it('blocks private and internal lexical hosts without resolving', async () => {
    const doh = dohFetch({});
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('https://192.168.1.1/v1'))).resolves.toEqual({ ok: false, internal: true });
    await expect(check(new URL('https://printer.local/v1'))).resolves.toEqual({ ok: false, internal: true });
    expect(doh.calls).toEqual([]);
  });

  it('allows public IPv4 literals without resolving', async () => {
    const doh = dohFetch({});
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('https://172.32.0.1/v1'))).resolves.toEqual({ ok: true, verified: true });
    expect(doh.calls).toEqual([]);
  });

  it('blocks a name that resolves to a private address', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('https://169-254-169-254.nip.io/v1'))).resolves.toEqual({ ok: false, internal: true });
    expect(doh.calls).toEqual(['A', 'AAAA']);
  });

  it('blocks a name that resolves to a loopback address', async () => {
    const doh = dohFetch({ A: ['127.0.0.1'] });
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('https://127-0-0-1.nip.io:8443/v1'))).resolves.toEqual({ ok: false, internal: true });
  });

  it('blocks when any resolved address is private', async () => {
    const doh = dohFetch({ A: ['93.184.216.34', '10.0.0.5'] });
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('https://rebind.example.com/v1'))).resolves.toEqual({ ok: false, internal: true });
  });

  it('allows a name that resolves to public addresses', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'], AAAA: ['2606:4700:4700::1111'] });
    const check = createEgressCheck({ fetch: doh.fake });
    await expect(check(new URL('https://api.openai.com/v1'))).resolves.toEqual({ ok: true, verified: true });
    expect(doh.calls).toEqual(['A', 'AAAA']);
  });

  it('lets the dial proceed unverified when DoH is unreachable, errors or answers nothing', async () => {
    const unreachable = createEgressCheck({ fetch: dohFetch({}, { fail: true }).fake });
    await expect(unreachable(new URL('https://api.openai.com/v1'))).resolves.toEqual({ ok: true, verified: false });

    const empty = createEgressCheck({ fetch: dohFetch({}).fake });
    await expect(empty(new URL('https://api.openai.com/v1'))).resolves.toEqual({ ok: true, verified: false });

    const bad = createEgressCheck({ fetch: dohFetch({}, { status: 500 }).fake });
    await expect(bad(new URL('https://api.openai.com/v1'))).resolves.toEqual({ ok: true, verified: false });
  });

  it('lets the dial proceed unverified when the DoH request times out at DOH_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    try {
      const fake = (async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        })) as typeof fetch;
      const check = createEgressCheck({ fetch: fake });
      const pending = check(new URL('https://api.openai.com/v1'));
      await vi.advanceTimersByTimeAsync(DOH_TIMEOUT_MS);
      await expect(pending).resolves.toEqual({ ok: true, verified: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('caches resolutions per check instance until the TTL expires', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    const check = createEgressCheck({ fetch: doh.fake }, 5);
    await check(new URL('https://api.openai.com/v1'));
    await check(new URL('https://api.openai.com/v1'));
    expect(doh.calls).toEqual(['A', 'AAAA']);
    await new Promise((r) => setTimeout(r, 10));
    await check(new URL('https://api.openai.com/v1'));
    expect(doh.calls).toEqual(['A', 'AAAA', 'A', 'AAAA']);
  });

  it('caches the unreachable verdict so one TTL window pays one delay', async () => {
    const doh = dohFetch({}, { fail: true });
    const check = createEgressCheck({ fetch: doh.fake }, 5);
    await check(new URL('https://api.openai.com/v1'));
    await check(new URL('https://api.openai.com/v1'));
    expect(doh.calls).toEqual(['A', 'AAAA']);
    await new Promise((r) => setTimeout(r, 10));
    await check(new URL('https://api.openai.com/v1'));
    expect(doh.calls).toEqual(['A', 'AAAA', 'A', 'AAAA']);
  });
});

describe('validateBaseUrlResolved', () => {
  it('rejects a nip.io name that resolves to an internal address', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const check = await validateBaseUrlResolved('https://169-254-169-254.nip.io', { fetch: doh.fake });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toContain('内部ネットワーク');
  });

  it('accepts a public endpoint and the designed http localhost path', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    expect((await validateBaseUrlResolved('https://api.openai.com/v1', { fetch: doh.fake })).ok).toBe(true);
    expect((await validateBaseUrlResolved('http://127.0.0.1:1234/v1', { fetch: doh.fake })).ok).toBe(true);
    expect((await validateBaseUrlResolved('http://localhost:11434/v1', { fetch: doh.fake })).ok).toBe(true);
    expect(doh.calls).toEqual(['A', 'AAAA']);
  });

  it('short-circuits on lexical failures without resolving', async () => {
    const doh = dohFetch({});
    const check = await validateBaseUrlResolved('http://example.com/v1', { fetch: doh.fake });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toContain('http は');
    expect(doh.calls).toEqual([]);
  });

  it('marks an unreachable resolver without a hard internal rejection', async () => {
    const doh = dohFetch({}, { fail: true });
    const check = await validateBaseUrlResolved('https://api.openai.com/v1', { fetch: doh.fake });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.unreachable).toBe(true);
      expect(check.reason).toContain('解決');
    }
  });
});

describe('validateAiSettingsResolved', () => {
  it('rejects attacker settings whose endpoint resolves internally (inverted VULN-001 gate)', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const res = await validateAiSettingsResolved(
      attackerSettings('https://169-254-169-254.nip.io'),
      { openai: true, gemini: true },
      { fetch: doh.fake },
    );
    expect(res.unreachable).toBe(false);
    expect(res.errors.some((e) => e.includes('内部ネットワーク'))).toBe(true);
  });

  it('accepts public endpoints with a key', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    await expect(validateAiSettingsResolved(
      attackerSettings('https://api.openai.com/v1'),
      { openai: true, gemini: true },
      { fetch: doh.fake },
    )).resolves.toEqual({ errors: [], unreachable: false });
  });

  it('reports an unreachable resolver without adding an error', async () => {
    const doh = dohFetch({}, { fail: true });
    await expect(validateAiSettingsResolved(
      attackerSettings('https://api.openai.com/v1'),
      { openai: true, gemini: true },
      { fetch: doh.fake },
    )).resolves.toEqual({ errors: [], unreachable: true });
  });

  it('does not resolve for gemini, empty urls or loopback endpoints', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    await expect(validateAiSettingsResolved(
      { provider: 'gemini', openai, gemini: { model: 'g', apiVersion: 'v1beta' } },
      { openai: false, gemini: true },
      { fetch: doh.fake },
    )).resolves.toEqual({ errors: [], unreachable: false });
    await expect(validateAiSettingsResolved(
      attackerSettings(''),
      { openai: false, gemini: true },
      { fetch: doh.fake },
    )).resolves.toEqual({
      errors: ['ベース URL を入力してください', 'API キーを入力してください'],
      unreachable: false,
    });
    await expect(validateAiSettingsResolved(
      attackerSettings('http://127.0.0.1:1234/v1'),
      { openai: false, gemini: true },
      { fetch: doh.fake },
    )).resolves.toEqual({ errors: [], unreachable: false });
    expect(doh.calls).toEqual([]);
  });
});

describe('dial-time gate in HttpClassifier.send (inverted VULN-001 dispatch)', () => {
  it('blocks the dispatch of the API key and metadata to an internally resolving name', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const c = createOpenAiClassifier(
      { baseUrl: 'https://169-254-169-254.nip.io', model: 'gpt-4o-mini' },
      'sk-attacker-key',
      { fetch: classifyFetch as unknown as typeof fetch, egress: createEgressCheck({ fetch: doh.fake }) },
    );
    await expect(c.classify([field])).rejects.toBeInstanceOf(HttpRequestError);
    expect(classifyFetch).not.toHaveBeenCalled();
  });

  it('sends to a public endpoint unchanged', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const c = createOpenAiClassifier(openai, 'sk', {
      fetch: classifyFetch as unknown as typeof fetch,
      egress: createEgressCheck({ fetch: doh.fake }),
    });
    expect([...(await c.classify([field]))]).toEqual([['f', 'lastName']]);
    expect(classifyFetch).toHaveBeenCalledOnce();
    expect(classifyFetch.mock.calls[0]![0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('sends to the provider when DoH is unreachable (escape hatch)', async () => {
    const doh = dohFetch({}, { fail: true });
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const c = createOpenAiClassifier(openai, 'sk', {
      fetch: classifyFetch as unknown as typeof fetch,
      egress: createEgressCheck({ fetch: doh.fake }),
    });
    expect([...(await c.classify([field]))]).toEqual([['f', 'lastName']]);
    expect(classifyFetch).toHaveBeenCalledOnce();
  });

  it('costs one lookup per classify including the compat retry', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    const classifyFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) } as Response)
      .mockResolvedValue(classifyOk());
    const c = createOpenAiClassifier(openai, 'sk', {
      fetch: classifyFetch as unknown as typeof fetch,
      egress: createEgressCheck({ fetch: doh.fake }),
    }, { compat: false });
    expect([...(await c.classify([field]))]).toEqual([['f', 'lastName']]);
    expect(classifyFetch).toHaveBeenCalledTimes(2);
    expect(doh.calls).toEqual(['A', 'AAAA']);
  });
});

describe('handleMessage gates ai-classify and ai-test at dial time', () => {
  const attacker = attackerSettings('https://169-254-169-254.nip.io');

  it('runs the dial-time gate for ai-classify and never fetches when it blocks', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const classifyFetch = vi.fn();
    const deps = makeDeps({
      settings: attacker,
      egress: createEgressCheck({ fetch: doh.fake }),
      fetch: classifyFetch as unknown as typeof fetch,
    });
    expect(await handleMessage({ type: 'ai-classify', fields: [field] }, deps))
      .toEqual({ ok: false, reason: 'network' });
    expect(classifyFetch).not.toHaveBeenCalled();
  });

  it('runs the dial-time gate for ai-test too', async () => {
    const doh = dohFetch({ A: ['169.254.169.254'] });
    const classifyFetch = vi.fn();
    const deps = makeDeps({
      settings: attacker,
      egress: createEgressCheck({ fetch: doh.fake }),
      fetch: classifyFetch as unknown as typeof fetch,
    });
    expect(await handleMessage({ type: 'ai-test' }, deps)).toEqual({ ok: false, reason: 'network' });
    expect(classifyFetch).not.toHaveBeenCalled();
  });

  it('lets ai-classify proceed through the gate for a public endpoint', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const deps = makeDeps({
      settings: attackerSettings('https://api.openai.com/v1'),
      egress: createEgressCheck({ fetch: doh.fake }),
      fetch: classifyFetch as unknown as typeof fetch,
    });
    expect(await handleMessage({ type: 'ai-classify', fields: [field] }, deps))
      .toEqual({ ok: true, entries: [['f', 'lastName']] });
    expect(doh.calls).toEqual(['A', 'AAAA']);
  });

  it('shares the egress cache across successive messages through one deps.egress', async () => {
    const doh = dohFetch({ A: ['93.184.216.34'] });
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const deps = makeDeps({
      settings: attackerSettings('https://api.openai.com/v1'),
      egress: createEgressCheck({ fetch: doh.fake }),
      fetch: classifyFetch as unknown as typeof fetch,
    });
    expect(await handleMessage({ type: 'ai-classify', fields: [field] }, deps))
      .toEqual({ ok: true, entries: [['f', 'lastName']] });
    expect(await handleMessage({ type: 'ai-classify', fields: [field] }, deps))
      .toEqual({ ok: true, entries: [['f', 'lastName']] });
    expect(doh.calls).toEqual(['A', 'AAAA']);
  });

  it('lets ai-classify proceed when DoH is unreachable', async () => {
    const doh = dohFetch({}, { fail: true });
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const deps = makeDeps({
      settings: attackerSettings('https://api.openai.com/v1'),
      egress: createEgressCheck({ fetch: doh.fake }),
      fetch: classifyFetch as unknown as typeof fetch,
    });
    expect(await handleMessage({ type: 'ai-classify', fields: [field] }, deps))
      .toEqual({ ok: true, entries: [['f', 'lastName']] });
    expect(classifyFetch).toHaveBeenCalledOnce();
  });

  it('keeps the keyless loopback path working through the gate', async () => {
    const doh = dohFetch({});
    const classifyFetch = vi.fn().mockResolvedValue(classifyOk());
    const deps = makeDeps({
      settings: attackerSettings('http://localhost:11434/v1'),
      egress: createEgressCheck({ fetch: doh.fake }),
      fetch: classifyFetch as unknown as typeof fetch,
      hasKey: { openai: false, gemini: false },
      secrets: {},
    });
    expect(await handleMessage({ type: 'ai-classify', fields: [field] }, deps))
      .toEqual({ ok: true, entries: [['f', 'lastName']] });
    expect(doh.calls).toEqual([]);
  });
});

describe('autoEgress wiring', () => {
  it('creates no gate under vitest so tests keep injecting their own fake', () => {
    expect(autoEgress()).toBeUndefined();
  });
});
