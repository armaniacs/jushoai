import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import { buildPrompt, buildSchema, parseLlmOutput, SYSTEM_PROMPT } from '../llm/prompt';
import { clipAuditResponse } from './audit-log';
import type { AttemptTrace, ClassifyAttempt, TracedClassifier } from './audited-classifier';
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

// PBI-42: the unified seam's failureReason for one HTTP attempt, mirroring the
// classify-branch mapping in ProviderRegistry.mapFailure (which stays the owner
// of the throw-path vocabulary). Success and offline/empty fast paths report
// null; auth rejections report 'auth', rejected shapes 'rejected', other HTTP
// failures 'network', and anything else 'bad-response'.
const failureReasonOf = (error: unknown): 'auth' | 'rejected' | 'network' | 'bad-response' => {
  if (error instanceof HttpAuthError) return 'auth';
  if (error instanceof HttpRequestError) return isRejectedStatus(error.status) ? 'rejected' : 'network';
  return 'bad-response';
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

export class HttpClassifier implements TracedClassifier {
  constructor(
    private readonly build: (fields: FieldMeta[], compat: boolean) => HttpRequest,
    private readonly extract: (json: unknown) => string | null,
    private readonly deps: HttpDeps,
    private readonly retry?: RetryOptions,
  ) {}

  // Dial-time resolved-address gate over the caller's egress check. Internal
  // seam (one adapter means a hypothetical seam): blocked targets look like
  // ordinary request failures to callers.
  private async checkEgress(url: string): Promise<void> {
    if (!this.deps.egress) return;
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      throw new HttpRequestError(null, 'request failed');
    }
    const verdict = await this.deps.egress(target);
    if (!verdict.ok) {
      throw new HttpRequestError(null, verdict.internal ? 'blocked: internal address' : 'blocked: could not verify the address');
    }
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
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

  // The trace rides the return value: prompt text comes straight from the
  // builder (no body re-parse), and failures carry their partial trace in the
  // same shape so the audit entry matches the old out-param record exactly.
  // PBI-42: the unified seam's failureReason rides along too (see
  // failureReasonOf), so callers read the reason off the return value.
  async attempt(fields: FieldMeta[]): Promise<ClassifyAttempt> {
    const trace: AttemptTrace = { status: null, retried: false, request: buildPrompt(fields), response: '' };
    if (fields.length === 0) return { map: new Map(), failureReason: null, trace };
    // Offline fast path: skip the DoH egress check and fetch entirely so an
    // offline client continues with rule-only classification immediately
    // instead of burning battery on a doomed 20s timeout. The typeof guard
    // keeps background/ServiceWorker contexts without navigator on the
    // normal online path.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { map: new Map(), failureReason: null, trace };
    }
    const compat = this.retry?.compat ?? false;
    try {
      const built = this.build(fields, compat);
      // Immediately before its fetch with nothing awaited in between: this
      // adjacency is the only available narrowing of the check-to-use window
      // (see the residual-risk note on createEgressCheck). Do not insert work
      // here without re-examining that window.
      await this.checkEgress(built.url);
      let res = await this.fetchWithTimeout(built.url, built.init);
      trace.status = res.status;
      if (this.retry && !compat && isRejectedStatus(res.status)) {
        trace.firstStatus = res.status;
        trace.status = null;
        trace.retried = true;
        const retryBuilt = this.build(fields, true);
        await this.checkEgress(retryBuilt.url);
        res = await this.fetchWithTimeout(retryBuilt.url, retryBuilt.init);
        trace.status = res.status;
        // compat is recorded below, only for a fully usable response: a
        // 200 whose body still fails extraction must not pin all future
        // requests to the degraded mode.
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
      trace.response = clipAuditResponse(text ?? JSON.stringify(json));
      if (text === null) throw new HttpRequestError(res.status, 'unexpected response shape');
      const map = parseLlmOutput(text, fields);
      // "Usable" means extracted (the mode answered in the expected shape);
      // an empty map still counts: the mode proved itself, the content was
      // merely unhelpful. Only extraction failures skip the pinning above.
      if (trace.retried) this.retry?.onCompat?.();
      return { map, failureReason: null, trace };
    } catch (error) {
      return { map: new Map(), failureReason: failureReasonOf(error), trace, error };
    }
  }

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    const attempt = await this.attempt(fields);
    if (attempt.error !== undefined) throw attempt.error;
    return attempt.map;
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

// The dial-time egress gate is intentionally not wired for gemini: the destination is a
// compile-time constant (GEMINI_BASE_URL) with a validated apiVersion and an encoded
// model, so there is no attacker-controlled destination to verify. Wiring the gate would
// add a DoH round trip to every classify for no defensive gain. handle-message.ts passes
// fetch only for the same recorded reason; the user-facing note lives in the Gemini guides.
export const createGeminiClassifier = (cfg: GeminiSettings, apiKey: string, deps: HttpDeps) =>
  new HttpClassifier((f) => buildGeminiRequest(cfg, apiKey, f), extractGeminiText, deps);
