import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuditedClassifier, type TracedClassifier } from '../../src/ai/audited-classifier';
import type { AuditDraft } from '../../src/ai/audit-log';
import {
  createGeminiClassifier, createOpenAiClassifier, HttpAuthError,
} from '../../src/ai/http-classifiers';
import type { CappedClassifier, FieldClassifier } from '../../src/core/classifier';
import { BackgroundClassifier } from '../../src/llm/background-gateway';
import { PromptApiClassifier } from '../../src/llm/classifier';
import type { LanguageModelStatic } from '../../src/llm/availability';
import { makeMeta } from '../helpers';

// PBI-42: the unified attempt seam. Every adapter behind FieldClassifier
// exposes attempt() returning {map, failureReason}, so truncation and failure
// reasons are observable on the seam return value instead of escaping into
// caller closures.

const send = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
afterEach(() => send.mockReset());

const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}` }));
const fields = [makeMeta({ id: 'a', label: '姓' }), makeMeta({ id: 'b', name: 'x' })];

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const openaiBody = (content: string) => jsonResponse(200, { choices: [{ message: { content } }] });
const geminiBody = (text: string) =>
  jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] });

const openai = { baseUrl: 'https://api.openai.com/v1', model: 'm1' };
const gemini = { model: 'g1', apiVersion: 'v1beta' };

const okLm = (text: string) => ({
  create: async () => ({ prompt: async () => text, destroy: () => {} }),
}) as unknown as LanguageModelStatic;

describe('unified attempt seam shape (BDD scenario 2)', () => {
  it('exposes {map, failureReason} on attempt() for every adapter behind the seam', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true, entries: m.fields.map((f) => [f.id, 'email']),
    }));
    const lm = okLm('{"a":"lastName"}');
    const adapters: [string, FieldClassifier][] = [
      ['background', new BackgroundClassifier()],
      ['prompt-api', new PromptApiClassifier(lm)],
      ['http-openai', createOpenAiClassifier(openai, 'sk-test', {
        fetch: vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}')),
      })],
      ['http-gemini', createGeminiClassifier(gemini, 'g-key', {
        fetch: vi.fn().mockResolvedValue(geminiBody('{"a":"lastName"}')),
      })],
      ['audited', new AuditedClassifier(new PromptApiClassifier(lm),
        { provider: 'built-in', host: '', model: '', purpose: 'classify', pageUrl: '' },
        { record: async () => {} })],
    ];
    for (const [name, adapter] of adapters) {
      expect(typeof adapter.classify, `${name}.classify`).toBe('function');
      expect(typeof adapter.attempt, `${name}.attempt`).toBe('function');
      const outcome = await adapter.attempt(fields);
      expect(outcome.map, `${name}.map`).toBeInstanceOf(Map);
      expect(
        outcome.failureReason === null || typeof outcome.failureReason === 'string',
        `${name}.failureReason`,
      ).toBe(true);
    }
  });
});

describe('truncation and failure ride the seam return (BDD scenario 1)', () => {
  it('accepts a caller schedule on the capped seam without consuming it (PBI-49)', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true, entries: m.fields.map((f) => [f.id, 'email']),
    }));
    // Typed as the seam (not the concrete class): a schedule must typecheck…
    const capped: CappedClassifier = new BackgroundClassifier();
    const outcome = await capped.attempt(fields, { index: 1, count: 3 });
    // …and stay out of the gateway's own chunking (single-chunk run).
    expect(outcome.map.size).toBe(fields.length);
    expect(outcome.failureReason).toBeNull();
    expect(outcome.truncatedCount).toBe(0);
    expect(send).toHaveBeenCalledOnce();
  });

  it('reports truncation with the capped map on an over-cap background run', async () => {
    send.mockImplementation(async (m: { fields: { id: string }[] }) => ({
      ok: true, entries: m.fields.map((f) => [f.id, 'email']),
    }));
    const outcome = await new BackgroundClassifier().attempt(metas(61));
    expect(outcome.map.size).toBe(60);
    expect(outcome.failureReason).toBe('truncated');
    expect(outcome.truncatedCount).toBe(1);
  });

  it('reports the provider reason on a failed background attempt', async () => {
    send.mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const auth = await new BackgroundClassifier().attempt(metas(1));
    expect(auth.map.size).toBe(0);
    expect(auth.failureReason).toBe('auth');

    send.mockRejectedValueOnce(new Error('down'));
    const network = await new BackgroundClassifier().attempt(metas(1));
    expect(network.map.size).toBe(0);
    expect(network.failureReason).toBe('network');
  });

  it('maps HTTP failures to the seam reason and keeps classify() throwing', async () => {
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(401, {}));
    const authClassifier = createOpenAiClassifier(openai, 'sk-test', { fetch: authFetch });
    const auth = await authClassifier.attempt(fields);
    expect(auth.map.size).toBe(0);
    expect(auth.failureReason).toBe('auth');
    expect(auth.error).toBeInstanceOf(HttpAuthError);
    await expect(authClassifier.classify(fields)).rejects.toBeInstanceOf(HttpAuthError);

    const denied = await createOpenAiClassifier(openai, 'sk-test', {
      fetch: vi.fn().mockResolvedValue(jsonResponse(500, {})),
    }).attempt(fields);
    expect(denied.failureReason).toBe('network');

    const compatFetch = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    const rejected = await createOpenAiClassifier(openai, 'sk-test', { fetch: compatFetch }).attempt(fields);
    expect(compatFetch).toHaveBeenCalledTimes(2);
    expect(rejected.failureReason).toBe('rejected');
  });

  it('reports bad-response when the attempt itself breaks outside HTTP', async () => {
    const outcome = await createOpenAiClassifier(openai, 'sk-test', {
      fetch: vi.fn(),
      egress: async () => { throw new Error('dns down'); },
    }).attempt(fields);
    expect(outcome.map.size).toBe(0);
    expect(outcome.failureReason).toBe('bad-response');
  });

  it('reports null on a successful HTTP attempt', async () => {
    const outcome = await createOpenAiClassifier(openai, 'sk-test', {
      fetch: vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}')),
    }).attempt(fields);
    expect([...outcome.map]).toEqual([['a', 'lastName']]);
    expect(outcome.failureReason).toBeNull();
  });

  it('reports bad-response when the built-in model fails, null on success', async () => {
    const badLm = { create: vi.fn().mockRejectedValue(new Error('no session')) } as unknown as LanguageModelStatic;
    const failed = await new PromptApiClassifier(badLm).attempt(fields);
    expect(failed.map.size).toBe(0);
    expect(failed.failureReason).toBe('bad-response');
    expect(failed.error).toBeInstanceOf(Error);

    const ok = await new PromptApiClassifier(okLm('{"a":"lastName","b":"email"}')).attempt(fields);
    expect([...ok.map]).toEqual([['a', 'lastName'], ['b', 'email']]);
    expect(ok.failureReason).toBeNull();
  });

  it('passes the inner reason through the audit wrapper unchanged', async () => {
    const inner: TracedClassifier = {
      attempt: async () => ({
        map: new Map([['a', 'lastName' as const]]),
        failureReason: 'auth',
        trace: { status: 401, retried: false, request: 'P', response: 'R' },
        error: new HttpAuthError(),
      }),
      classify: async () => { throw new HttpAuthError(); },
    };
    const drafts: AuditDraft[] = [];
    const wrapped = new AuditedClassifier(
      inner,
      { provider: 'openai', host: 'h', model: 'm', purpose: 'classify', pageUrl: '' },
      { record: async (d) => { drafts.push(d); } },
    );
    const outcome = await wrapped.attempt(fields);
    expect(outcome.failureReason).toBe('auth');
    expect([...outcome.map]).toEqual([['a', 'lastName']]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ result: 'auth-error', httpStatus: 401 });

    const okInner: TracedClassifier = {
      attempt: async () => ({
        map: new Map([['a', 'lastName' as const]]),
        failureReason: null,
        trace: { status: 200, retried: false, request: 'P', response: 'R' },
      }),
      classify: async (ms) => new Map(ms.map((m) => [m.id, 'lastName' as const])),
    };
    const okOutcome = await new AuditedClassifier(
      okInner,
      { provider: 'openai', host: 'h', model: 'm', purpose: 'classify', pageUrl: '' },
      { record: async () => {} },
    ).attempt(fields);
    expect(okOutcome.failureReason).toBeNull();
    expect([...okOutcome.map]).toEqual([['a', 'lastName']]);
  });
});
