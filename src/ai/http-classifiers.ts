import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import type { FieldClassifier } from '../core/classifier';
import { buildPrompt, buildSchema, parseLlmOutput, SYSTEM_PROMPT } from '../llm/classifier';
import { clipAuditResponse } from './audit-log';
import { createEgressCheck, type EgressCheck } from './settings';
import { GEMINI_BASE_URL, type GeminiSettings, type OpenAiSettings } from './types';

export const HTTP_TIMEOUT_MS = 20_000;

// Caps what one provider response may buffer: res.json() alone would hold the
// whole body before any size check, and a misbehaving endpoint could OOM the
// service worker mid-classify. Normal 20-field responses are a few KB, and the
// cap stays under AUDIT_MAX_BYTES.
export const MAX_RESPONSE_BYTES = 1_000_000;

export class HttpAuthError extends Error {
  constructor() {
    super('authentication failed');
    this.name = 'HttpAuthError';
  }
}

// Messages never include request or response bodies, so keys cannot leak through errors.
export class HttpRequestError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export interface HttpRequest {
  url: string;
  init: RequestInit;
}

export interface HttpDeps {
  fetch: typeof fetch;
  timeoutMs?: number;
  // Dial-time resolved-address gate; the OpenAI factory wires a DoH-based default.
  egress?: EgressCheck;
}

const baseInit = (headers: Record<string, string>, body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
  redirect: 'error',
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
});

export function buildOpenAiRequest(
  cfg: OpenAiSettings,
  apiKey: string | undefined,
  fields: FieldMeta[],
  compat = false,
): HttpRequest {
  // Compat mode drops what reasoning models (temperature) and older servers (json_schema) reject.
  const body = {
    model: cfg.model,
    ...(compat ? {} : { temperature: 0 }),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(fields) },
    ],
    response_format: compat
      ? { type: 'json_object' }
      : { type: 'json_schema', json_schema: { name: 'field_categories', strict: true, schema: buildSchema(fields) } },
  };
  return {
    url: `${cfg.baseUrl}/chat/completions`,
    init: baseInit(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, body),
  };
}

export function extractOpenAiText(json: unknown): string | null {
  const content = (json as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : null;
}

// Gemini's responseSchema is an OpenAPI subset: no additionalProperties, upper-case type names.
function toGeminiSchema(fields: FieldMeta[]) {
  return {
    type: 'OBJECT',
    properties: Object.fromEntries(fields.map((f) => [f.id, { type: 'STRING', enum: [...CATEGORIES] }])),
    required: fields.map((f) => f.id),
  };
}

export function buildGeminiRequest(cfg: GeminiSettings, apiKey: string, fields: FieldMeta[]): HttpRequest {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(fields) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(fields),
    },
  };
  return {
    url: `${GEMINI_BASE_URL}/${cfg.apiVersion}/models/${encodeURIComponent(cfg.model)}:generateContent`,
    init: baseInit({ 'x-goog-api-key': apiKey }, body),
  };
}

export function extractGeminiText(json: unknown): string | null {
  const parts = (json as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const texts = parts.map((p) => p?.text).filter((t): t is string => typeof t === 'string');
  return texts.length > 0 ? texts.join('') : null;
}

export interface RetryOptions {
  compat: boolean;
  onCompat?: () => void;
}

// Shared vocabulary for "the provider rejected the request shape": the compat
// retry condition and the failure-reason mapping must agree on this pair.
export const isRejectedStatus = (status: number | null): boolean =>
  status === 400 || status === 422;

// The user prompt text actually embedded in the request body, so the audit trace
// cannot drift from what was sent when the prompt builders change.
const promptInRequest = (init: RequestInit): string => {
  try {
    const body = JSON.parse(String(init.body)) as {
      messages?: { content?: unknown }[];
      contents?: { parts?: { text?: unknown }[] }[];
    };
    const message = body.messages?.[1]?.content;
    if (typeof message === 'string') return message;
    const parts = body.contents?.[0]?.parts;
    if (Array.isArray(parts)) {
      const texts = parts.map((p) => p?.text).filter((t): t is string => typeof t === 'string');
      return texts.join('');
    }
  } catch {
    // fall through: the trace keeps its empty request
  }
  return '';
};

// Bounded response read: the Content-Length check rejects an oversized body
// before a single byte is consumed, and the stream reader caps bodies that
// arrive without a usable Content-Length. Falls back to res.json() when no
// body stream exists (older runtimes, json()-only test fakes).
const readJsonBounded = async (res: Response): Promise<unknown> => {
  const declared = Number(res.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    throw new HttpRequestError(res.status, 'response too large');
  }
  const reader = res.body?.getReader?.();
  if (!reader) return res.json();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      // Cancelling keeps an oversized stream from trickling in after the failure.
      await reader.cancel().catch(() => {});
      throw new HttpRequestError(res.status, 'response too large');
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
};

export class HttpClassifier implements FieldClassifier {
  // Outcome of the latest classify call, read by the audit wrapper.
  lastTrace: { status: number | null; retried: boolean } = { status: null, retried: false };
  // Prompt text sent and raw output from the latest classify call, read by the audit wrapper.
  lastExchange?: { request: string; response: string };

  constructor(
    private readonly build: (fields: FieldMeta[], compat: boolean) => HttpRequest,
    private readonly extract: (json: unknown) => string | null,
    private readonly deps: HttpDeps,
    private readonly retry?: RetryOptions,
  ) {}

  private async send({ url, init }: HttpRequest): Promise<Response> {
    if (this.deps.egress) {
      let target: URL;
      try {
        target = new URL(url);
      } catch {
        throw new HttpRequestError(null, 'request failed');
      }
      const verdict = await this.deps.egress(target);
      // Blocked targets must look like ordinary request failures to callers.
      if (!verdict.ok) {
        throw new HttpRequestError(null, verdict.internal ? 'blocked: internal address' : 'blocked: unverified address');
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.deps.timeoutMs ?? HTTP_TIMEOUT_MS);
    try {
      return await this.deps.fetch(url, { ...init, signal: controller.signal });
    } catch {
      throw new HttpRequestError(null, 'request failed');
    } finally {
      clearTimeout(timer);
    }
  }

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    if (fields.length === 0) return new Map();
    const compat = this.retry?.compat ?? false;
    this.lastTrace = { status: null, retried: false };
    const built = this.build(fields, compat);
    const exchange: { request: string; response: string } = { request: promptInRequest(built.init), response: '' };
    this.lastExchange = exchange;
    let res = await this.send(built);
    this.lastTrace.status = res.status;
    if (this.retry && !compat && isRejectedStatus(res.status)) {
      this.lastTrace = { status: null, retried: true };
      res = await this.send(this.build(fields, true));
      this.lastTrace.status = res.status;
      if (res.ok) this.retry.onCompat?.();
    }
    if (res.status === 401 || res.status === 403) throw new HttpAuthError();
    if (!res.ok) throw new HttpRequestError(res.status, `http ${res.status}`);
    let json: unknown;
    try {
      json = await readJsonBounded(res);
    } catch (e) {
      // Size rejections keep their specific error instead of a body-parse one.
      if (e instanceof HttpRequestError) throw e;
      throw new HttpRequestError(res.status, 'invalid response body');
    }
    const text = this.extract(json);
    // Same clip the audit entry applies, so the retained trace string itself
    // stays bounded instead of holding a full-size response.
    exchange.response = clipAuditResponse(text ?? JSON.stringify(json));
    if (text === null) throw new HttpRequestError(res.status, 'unexpected response shape');
    return parseLlmOutput(text, fields);
  }
}

// Tests fake deps.fetch with provider-shaped responses, so an auto-wired DoH gate would
// consume their fetch calls and fail closed; tests inject an egress fake instead. The
// fetch binding sits inside so the guard keeps it unevaluated under vitest.
export const autoEgress = (): EgressCheck | undefined =>
  (import.meta.env as { VITEST?: boolean }).VITEST
    ? undefined
    : createEgressCheck({ fetch: globalThis.fetch.bind(globalThis) });

export const createOpenAiClassifier = (
  cfg: OpenAiSettings,
  apiKey: string | undefined,
  deps: HttpDeps,
  retry: RetryOptions = { compat: false },
) => new HttpClassifier(
  (f, compat) => buildOpenAiRequest(cfg, apiKey, f, compat),
  extractOpenAiText,
  { ...deps, egress: deps.egress ?? autoEgress() },
  retry,
);

export const createGeminiClassifier = (cfg: GeminiSettings, apiKey: string, deps: HttpDeps) =>
  new HttpClassifier((f) => buildGeminiRequest(cfg, apiKey, f), extractGeminiText, deps);
