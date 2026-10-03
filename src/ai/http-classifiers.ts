import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import {
  buildPrompt, buildSchema, parseLlmOutput, SYSTEM_PROMPT, type FieldClassifier,
} from '../llm/classifier';
import type { GeminiSettings, OpenAiSettings } from './types';

export const HTTP_TIMEOUT_MS = 15_000;

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
): HttpRequest {
  const body = {
    model: cfg.model,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(fields) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'field_categories', strict: true, schema: buildSchema(fields) },
    },
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
    url: `https://generativelanguage.googleapis.com/${cfg.apiVersion}/models/${encodeURIComponent(cfg.model)}:generateContent`,
    init: baseInit({ 'x-goog-api-key': apiKey }, body),
  };
}

export function extractGeminiText(json: unknown): string | null {
  const text = (json as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : null;
}

export class HttpClassifier implements FieldClassifier {
  constructor(
    private readonly build: (fields: FieldMeta[]) => HttpRequest,
    private readonly extract: (json: unknown) => string | null,
    private readonly deps: HttpDeps,
  ) {}

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    if (fields.length === 0) return new Map();
    const { url, init } = this.build(fields);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.deps.timeoutMs ?? HTTP_TIMEOUT_MS);
    try {
      let res: Response;
      try {
        res = await this.deps.fetch(url, { ...init, signal: controller.signal });
      } catch {
        throw new HttpRequestError(null, 'request failed');
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
    } finally {
      clearTimeout(timer);
    }
  }
}

export const createOpenAiClassifier = (cfg: OpenAiSettings, apiKey: string | undefined, deps: HttpDeps) =>
  new HttpClassifier((f) => buildOpenAiRequest(cfg, apiKey, f), extractOpenAiText, deps);

export const createGeminiClassifier = (cfg: GeminiSettings, apiKey: string, deps: HttpDeps) =>
  new HttpClassifier((f) => buildGeminiRequest(cfg, apiKey, f), extractGeminiText, deps);
