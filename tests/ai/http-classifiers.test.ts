import { describe, it, expect, vi } from 'vitest';
import {
  buildGeminiRequest, buildOpenAiRequest, createGeminiClassifier, createOpenAiClassifier,
  extractGeminiText, extractOpenAiText, HttpAuthError, HttpRequestError, isRejectedStatus,
  MAX_RESPONSE_BYTES,
} from '../../src/ai/http-classifiers';
import { AUDIT_RESPONSE_CLIP_LENGTH } from '../../src/ai/audit-log';
import { CATEGORIES } from '../../src/core/types';
import { makeMeta } from '../helpers';

const fields = [makeMeta({ id: 'a', label: '姓', value: 'SECRET-VALUE' }), makeMeta({ id: 'b', name: 'x' })];
const openai = { baseUrl: 'https://api.openai.com/v1', model: 'm1' };
const gemini = { model: 'g1', apiVersion: 'v1beta' };

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('buildOpenAiRequest', () => {
  it('posts a constrained chat completion to {baseUrl}/chat/completions', () => {
    const { url, init } = buildOpenAiRequest(openai, 'sk-test', fields);
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(init.redirect).toBe('error');
    expect(init.credentials).toBe('omit');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('m1');
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.required).toEqual(['a', 'b']);
    expect(body.response_format.json_schema.schema.properties.a.enum).toEqual([...CATEGORIES]);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
  });

  it('omits Authorization without a key and never sends field values', () => {
    const { init } = buildOpenAiRequest(openai, undefined, fields);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body as string).not.toContain('SECRET-VALUE');
  });
});

describe('extractOpenAiText', () => {
  it('reads the first choice content', () => {
    expect(extractOpenAiText({ choices: [{ message: { content: '{"a":"lastName"}' } }] })).toBe('{"a":"lastName"}');
  });

  it.each([null, {}, { choices: [] }, { choices: [{ message: { content: 1 } }] }])('returns null for %j', (v) => {
    expect(extractOpenAiText(v)).toBeNull();
  });
});

describe('buildGeminiRequest', () => {
  it('sends the key in a header, not in the URL, and uses a Gemini schema', () => {
    const { url, init } = buildGeminiRequest(gemini, 'g-key', fields);
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/g1:generateContent');
    expect(url).not.toContain('g-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('g-key');
    expect(init.redirect).toBe('error');
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    const schema = body.generationConfig.responseSchema;
    expect(schema.required).toEqual(['a', 'b']);
    expect(JSON.stringify(schema)).not.toContain('additionalProperties');
    expect(body.systemInstruction.parts[0].text).toContain('分類');
    expect(init.body as string).not.toContain('SECRET-VALUE');
  });

  it('encodes the model name in the path', () => {
    expect(buildGeminiRequest({ ...gemini, model: 'a/b' }, 'k', fields).url).toContain('/models/a%2Fb:generateContent');
  });
});

describe('extractGeminiText', () => {
  it('reads the first candidate part', () => {
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: '{"a":"email"}' }] } }] })).toBe('{"a":"email"}');
  });

  it('joins the text of all parts', () => {
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '"email"}' }] } }] })).toBe('{"a":"email"}');
  });

  it.each([null, {}, { candidates: [] }, { candidates: [{ content: { parts: [] } }] }])('returns null for %j', (v) => {
    expect(extractGeminiText(v)).toBeNull();
  });
});

describe('HttpClassifier', () => {
  it('returns validated categories from the response', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '{"a":"lastName","b":"nonsense"}' } }] }),
    );
    const c = createOpenAiClassifier(openai, 'sk-test', { fetch });
    expect([...(await c.classify(fields))]).toEqual([['a', 'lastName']]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('captures the trace prompt from the actual request body', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '{"a":"lastName"}' } }] }),
    );
    const c = createOpenAiClassifier(openai, 'sk-test', { fetch });
    await c.classify(fields);
    const body = JSON.parse((fetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(c.lastExchange?.request).toBe(body.messages[1].content);

    const gFetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"b":"email"}' }] } }] }),
    );
    const g = createGeminiClassifier(gemini, 'g-key', { fetch: gFetch });
    await g.classify(fields);
    const gBody = JSON.parse((gFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(g.lastExchange?.request).toBe(gBody.contents[0].parts[0].text);
  });

  it('works for Gemini responses too', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"b":"email"}' }] } }] }),
    );
    const c = createGeminiClassifier(gemini, 'g-key', { fetch });
    expect([...(await c.classify(fields))]).toEqual([['b', 'email']]);
  });

  it('does not call the network for an empty field list', async () => {
    const fetch = vi.fn();
    expect((await createOpenAiClassifier(openai, 'k', { fetch }).classify([])).size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([401, 403])('throws HttpAuthError for %i', async (status) => {
    const c = createOpenAiClassifier(openai, 'sk-test', { fetch: vi.fn().mockResolvedValue(jsonResponse(status, {})) });
    await expect(c.classify(fields)).rejects.toBeInstanceOf(HttpAuthError);
  });

  it('throws HttpRequestError for other failures without leaking the key', async () => {
    const bodies: Array<() => Promise<Response>> = [
      async () => jsonResponse(500, {}),
      async () => jsonResponse(200, { unexpected: true }),
      async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json sk-test'); } }) as unknown as Response,
      async () => { throw new TypeError('network sk-test'); },
    ];
    for (const body of bodies) {
      const c = createOpenAiClassifier(openai, 'sk-test', { fetch: vi.fn(body) });
      const err = await c.classify(fields).catch((e) => e);
      expect(err).toBeInstanceOf(HttpRequestError);
      expect(String(err.message)).not.toContain('sk-test');
    }
  });

  it('aborts after the timeout', async () => {
    const fetch = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
      }));
    const c = createOpenAiClassifier(openai, 'k', { fetch: fetch as unknown as typeof globalThis.fetch, timeoutMs: 20 });
    await expect(c.classify(fields)).rejects.toBeInstanceOf(HttpRequestError);
  });
});

describe('OpenAI-compatible compatibility retry', () => {
  it.each([400, 422])('treats %i as a rejected request shape', () => {
    expect(isRejectedStatus(400)).toBe(true);
    expect(isRejectedStatus(422)).toBe(true);
  });

  it.each([null, 401, 403, 429, 500])('does not treat %s as a rejected request shape', (status) => {
    expect(isRejectedStatus(status)).toBe(false);
  });

  const okBody = () => jsonResponse(200, { choices: [{ message: { content: '{"a":"lastName"}' } }] });
  const bodyOf = (fetch: ReturnType<typeof vi.fn>, n: number) =>
    JSON.parse((fetch.mock.calls[n]![1] as RequestInit).body as string);

  it.each([400, 422])('retries once without temperature and with json_object after %i', async (status) => {
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse(status, {})).mockResolvedValueOnce(okBody());
    const onCompat = vi.fn();
    const c = createOpenAiClassifier(openai, 'sk', { fetch }, { compat: false, onCompat });
    expect([...(await c.classify(fields))]).toEqual([['a', 'lastName']]);
    expect(fetch).toHaveBeenCalledTimes(2);
    const first = bodyOf(fetch, 0);
    const second = bodyOf(fetch, 1);
    expect(first.temperature).toBe(0);
    expect(first.response_format.type).toBe('json_schema');
    expect('temperature' in second).toBe(false);
    expect(second.response_format).toEqual({ type: 'json_object' });
    expect(onCompat).toHaveBeenCalledOnce();
  });

  it('throws HttpRequestError when the retry is rejected too, with at most two calls', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    const onCompat = vi.fn();
    const c = createOpenAiClassifier(openai, 'sk', { fetch }, { compat: false, onCompat });
    const err = await c.classify(fields).catch((e) => e);
    expect(err).toBeInstanceOf(HttpRequestError);
    expect(err.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onCompat).not.toHaveBeenCalled();
  });

  it.each([401, 403, 429, 500])('does not retry %i', async (status) => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(status, {}));
    const c = createOpenAiClassifier(openai, 'sk', { fetch }, { compat: false });
    await expect(c.classify(fields)).rejects.toBeDefined();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('skips the first attempt in compat mode and does not retry', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    const c = createOpenAiClassifier(openai, 'sk', { fetch }, { compat: true });
    await expect(c.classify(fields)).rejects.toBeInstanceOf(HttpRequestError);
    expect(fetch).toHaveBeenCalledOnce();
    expect(bodyOf(fetch, 0).response_format).toEqual({ type: 'json_object' });
  });

  it('does not retry Gemini', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    await expect(createGeminiClassifier(gemini, 'k', { fetch }).classify(fields)).rejects.toBeInstanceOf(HttpRequestError);
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe('request allow-list', () => {
  const rich = [makeMeta({
    id: 'a', label: '姓', options: [{ value: 'OPT-SECRET', text: 'OPT-SECRET' }], autocomplete: 'AC-SECRET', pattern: 'PAT-SECRET', value: 'VAL-SECRET',
  })];

  it.each([
    ['openai', () => buildOpenAiRequest(openai, 'sk-KEY', rich)],
    ['gemini', () => buildGeminiRequest(gemini, 'g-KEY', rich)],
  ])('%s request carries no options, autocomplete, pattern or value', (_n, build) => {
    const { url, init } = build();
    const all = JSON.stringify({ url, headers: init.headers, body: init.body });
    for (const secret of ['OPT-SECRET', 'AC-SECRET', 'PAT-SECRET', 'VAL-SECRET']) expect(all).not.toContain(secret);
  });

  it('keeps the API key out of the URL and body', () => {
    const o = buildOpenAiRequest(openai, 'sk-KEY', rich);
    expect(o.url).not.toContain('sk-KEY');
    expect(o.init.body as string).not.toContain('sk-KEY');
    const g = buildGeminiRequest(gemini, 'g-KEY', rich);
    expect(g.url).not.toContain('g-KEY');
    expect(g.init.body as string).not.toContain('g-KEY');
  });
});

describe('bounded response reading', () => {
  const content = '{"a":"lastName"}';
  // The provider envelope around the extracted LLM output text.
  const envelope = (text: string) => JSON.stringify({ choices: [{ message: { content: text } }] });
  // A body padded with legal JSON whitespace up to exactly `size` bytes.
  const padded = (size: number, inner: string) => inner + ' '.repeat(Math.max(0, size - inner.length));
  const bytesOf = (s: string) => new TextEncoder().encode(s);

  interface FakeStream {
    res: Response;
    fake: { reads: number; jsonCalls: number; cancelled: boolean };
  }

  const streamResponse = (
    status: number,
    body: Uint8Array,
    headers: Record<string, string> = {},
    chunkSize = 64 * 1024,
    firstReadDelayMs = 0,
  ): FakeStream => {
    const fake = { reads: 0, jsonCalls: 0, cancelled: false };
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < body.length; i += chunkSize) chunks.push(body.slice(i, i + chunkSize));
    const res = {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      json: async () => {
        fake.jsonCalls++;
        return JSON.parse(new TextDecoder().decode(body));
      },
      body: {
        getReader: () => {
          let i = 0;
          return {
            read: async () => {
              fake.reads++;
              if (i === 0 && firstReadDelayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, firstReadDelayMs));
              }
              return i < chunks.length
                ? { done: false as const, value: chunks[i++] }
                : { done: true as const, value: undefined };
            },
            cancel: async () => {
              fake.cancelled = true;
            },
          };
        },
      },
    };
    return { res: res as unknown as Response, fake };
  };

  const classifyWith = async (res: Response, deps: { timeoutMs?: number } = {}) => {
    const c = createOpenAiClassifier(openai, 'sk-test', { fetch: vi.fn().mockResolvedValue(res), ...deps });
    return { c, out: await c.classify(fields).catch((e) => e) };
  };

  it('rejects an oversized Content-Length before reading the body', async () => {
    const { res, fake } = streamResponse(200, bytesOf(envelope(content)), { 'content-length': String(MAX_RESPONSE_BYTES + 1) });
    const { c, out } = await classifyWith(res);
    expect(out).toBeInstanceOf(HttpRequestError);
    expect(out.message).toBe('response too large');
    expect(out.status).toBe(200);
    expect(fake.reads).toBe(0);
    expect(fake.jsonCalls).toBe(0);
    expect(c.lastTrace.status).toBe(200);
  });

  it('accepts a Content-Length exactly at the cap', async () => {
    const { res, fake } = streamResponse(200, bytesOf(padded(MAX_RESPONSE_BYTES, envelope(content))), { 'content-length': String(MAX_RESPONSE_BYTES) });
    const { out } = await classifyWith(res);
    expect([...out]).toEqual([['a', 'lastName']]);
    expect(fake.reads).toBeGreaterThan(0);
  });

  it('cuts off an oversized stream without Content-Length', async () => {
    const { res, fake } = streamResponse(200, bytesOf(padded(MAX_RESPONSE_BYTES + 1, envelope(content))));
    const { out } = await classifyWith(res);
    expect(out).toBeInstanceOf(HttpRequestError);
    expect(out.message).toBe('response too large');
    expect(fake.cancelled).toBe(true);
  });

  it('treats a malformed Content-Length as absent and bounds by read', async () => {
    const { res } = streamResponse(200, bytesOf(envelope(content)), { 'content-length': 'garbage' });
    const { out } = await classifyWith(res);
    expect([...out]).toEqual([['a', 'lastName']]);
  });

  it('classifies a bounded stream without any headers as before', async () => {
    const { res } = streamResponse(200, bytesOf(envelope(content)));
    const { out } = await classifyWith(res);
    expect([...out]).toEqual([['a', 'lastName']]);
  });

  it('clips an oversized raw response in lastExchange.response', async () => {
    const big = JSON.stringify({ unexpected: 'x'.repeat(AUDIT_RESPONSE_CLIP_LENGTH + 100) });
    const { res } = streamResponse(200, bytesOf(big));
    const { c, out } = await classifyWith(res);
    expect(out).toBeInstanceOf(HttpRequestError);
    expect(c.lastExchange?.response.length).toBe(AUDIT_RESPONSE_CLIP_LENGTH + 1);
    expect(c.lastExchange?.response.endsWith('…')).toBe(true);
  });

  it('clips a long extracted text in lastExchange.response too', async () => {
    const long = '{"a":"lastName"' + ' '.repeat(AUDIT_RESPONSE_CLIP_LENGTH + 100) + '}';
    const { res } = streamResponse(200, bytesOf(envelope(long)));
    const { c, out } = await classifyWith(res);
    expect([...out]).toEqual([['a', 'lastName']]);
    expect(c.lastExchange?.response.length).toBe(AUDIT_RESPONSE_CLIP_LENGTH + 1);
  });

  it('reads the body after the fetch timeout is disarmed', async () => {
    const { res } = streamResponse(200, bytesOf(envelope(content)), {}, 64 * 1024, 50);
    const { out } = await classifyWith(res, { timeoutMs: 20 });
    expect([...out]).toEqual([['a', 'lastName']]);
  });

  it('does not read the body of a rejected first attempt even with an oversized Content-Length', async () => {
    const bad = streamResponse(400, bytesOf(envelope(content)), { 'content-length': String(MAX_RESPONSE_BYTES + 1) });
    const good = streamResponse(200, bytesOf(envelope(content)));
    const onCompat = vi.fn();
    const fetch = vi.fn().mockResolvedValueOnce(bad.res).mockResolvedValueOnce(good.res);
    const c = createOpenAiClassifier(openai, 'sk', { fetch }, { compat: false, onCompat });
    expect([...(await c.classify(fields))]).toEqual([['a', 'lastName']]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(bad.fake.reads).toBe(0);
    expect(bad.fake.cancelled).toBe(false);
    expect(onCompat).toHaveBeenCalledOnce();
  });
});
