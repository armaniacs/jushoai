import { describe, it, expect, vi } from 'vitest';
import {
  buildGeminiRequest, buildOpenAiRequest, createGeminiClassifier, createOpenAiClassifier,
  extractGeminiText, extractOpenAiText, HttpAuthError, HttpRequestError, isRejectedStatus,
} from '../../src/ai/http-classifiers';
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
