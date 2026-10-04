import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import {
  buildPrompt, buildSchema, parseLlmOutput, SYSTEM_PROMPT, type FieldClassifier,
} from '../llm/classifier';
import { GEMINI_BASE_URL, type GeminiSettings, type OpenAiSettings } from './types';

export const HTTP_TIMEOUT_MS = 20_000;

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

const isRejection = (status: number) => status === 400 || status === 422;

export class HttpClassifier implements FieldClassifier {
  constructor(
    private readonly build: (fields: FieldMeta[], compat: boolean) => HttpRequest,
    private readonly extract: (json: unknown) => string | null,
    private readonly deps: HttpDeps,
    private readonly retry?: RetryOptions,
  ) {}

  private async send({ url, init }: HttpRequest): Promise<Response> {
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
    let res = await this.send(this.build(fields, compat));
    if (this.retry && !compat && isRejection(res.status)) {
      res = await this.send(this.build(fields, true));
      if (res.ok) this.retry.onCompat?.();
    }
    if (res.status === 401 || res.status === 403) throw new HttpAuthError();
    if (!res.ok) throw new HttpRequestError(res.status, `http ${res.status}`);
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new HttpRequestError(res.status, 'invalid response body');
    }
    const text = this.extract(json);
    if (text === null) throw new HttpRequestError(res.status, 'unexpected response shape');
    return parseLlmOutput(text, fields);
  }
}

export const createOpenAiClassifier = (
  cfg: OpenAiSettings,
  apiKey: string | undefined,
  deps: HttpDeps,
  retry: RetryOptions = { compat: false },
) => new HttpClassifier((f, compat) => buildOpenAiRequest(cfg, apiKey, f, compat), extractOpenAiText, deps, retry);

export const createGeminiClassifier = (cfg: GeminiSettings, apiKey: string, deps: HttpDeps) =>
  new HttpClassifier((f) => buildGeminiRequest(cfg, apiKey, f), extractGeminiText, deps);
