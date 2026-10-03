import { CATEGORIES, type Category, type FieldMeta } from './core/types';
import type { AiState, AiStatusInfo } from './ai/types';
import type { AiStatus } from './llm/availability';

export const MAX_CLASSIFY_FIELDS = 30;
export const MAX_CLASSIFY_CHUNK = 20;
const MAX_ID_LENGTH = 100;
const MAX_TEXT_LENGTH = 200;

const AI_STATUSES: readonly string[] = ['available', 'downloadable', 'downloading', 'unavailable', 'unsupported'];
const AI_STATES: readonly string[] = [...AI_STATUSES, 'disabled', 'not-configured', 'permission-missing', 'auth-error'];
const PROVIDER_KINDS: readonly string[] = ['none', 'built-in', 'openai', 'gemini'];
const TEST_FAILURES = ['not-configured', 'permission', 'auth', 'network', 'bad-response'] as const;

export type TestFailure = (typeof TEST_FAILURES)[number];
export type TestResponse = { ok: true; category: Category } | { ok: false; reason: TestFailure };

export type AiRequest =
  | { type: 'ai-status' }
  | { type: 'ai-classify'; fields: FieldMeta[] }
  | { type: 'ai-download' }
  | { type: 'ai-test' };

export type ClassifyResponse = { ok: true; entries: [string, Category][] } | { ok: false };

export const isAiStatus = (v: unknown): v is AiStatus => typeof v === 'string' && AI_STATUSES.includes(v);

export const isAiState = (v: unknown): v is AiState => typeof v === 'string' && AI_STATES.includes(v);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT_LENGTH) : '');

// Rebuilds a FieldMeta from the metadata allow-list only; page-controlled values never pass through.
function sanitizeField(v: unknown): FieldMeta | null {
  if (!isRecord(v)) return null;
  const id = v.id;
  if (typeof id !== 'string' || id === '' || id.length > MAX_ID_LENGTH) return null;
  const maxLength = typeof v.maxLength === 'number' && Number.isFinite(v.maxLength) ? v.maxLength : null;
  return {
    id,
    tag: 'input',
    type: text(v.type),
    name: text(v.name),
    htmlId: text(v.htmlId),
    autocomplete: '',
    label: text(v.label),
    placeholder: text(v.placeholder),
    nearby: text(v.nearby),
    maxLength,
    pattern: '',
    options: [],
    readOnly: false,
    disabled: false,
    value: '',
  };
}

export function parseRequest(msg: unknown): AiRequest | null {
  if (!isRecord(msg)) return null;
  const keys = Object.keys(msg);
  if (msg.type === 'ai-status' && keys.length === 1) return { type: 'ai-status' };
  if (msg.type === 'ai-download' && keys.length === 1) return { type: 'ai-download' };
  if (msg.type === 'ai-test' && keys.length === 1) return { type: 'ai-test' };
  if (msg.type === 'ai-classify' && keys.length === 2 && Array.isArray(msg.fields)) {
    if (msg.fields.length > MAX_CLASSIFY_FIELDS) return null;
    const fields = msg.fields.map(sanitizeField).filter((f): f is FieldMeta => f !== null);
    return { type: 'ai-classify', fields };
  }
  return null;
}

export function parseClassifyResponse(res: unknown): Map<string, Category> | null {
  if (!isRecord(res) || res.ok !== true || !Array.isArray(res.entries)) return null;
  const valid = new Set<string>(CATEGORIES);
  const out = new Map<string, Category>();
  for (const e of res.entries) {
    if (Array.isArray(e) && e.length === 2 && typeof e[0] === 'string' && typeof e[1] === 'string' && valid.has(e[1])) {
      out.set(e[0], e[1] as Category);
    }
  }
  return out;
}

export function parseStatusResponse(res: unknown): AiStatusInfo | null {
  if (!isRecord(res) || !isAiState(res.status)) return null;
  const provider = res.provider;
  if (typeof provider !== 'string' || !PROVIDER_KINDS.includes(provider)) return null;
  return { status: res.status, provider: provider as AiStatusInfo['provider'] };
}

export function parseTestResponse(res: unknown): TestResponse | null {
  if (!isRecord(res)) return null;
  if (res.ok === true && typeof res.category === 'string' && (CATEGORIES as readonly string[]).includes(res.category)) {
    return { ok: true, category: res.category as Category };
  }
  if (res.ok === false && typeof res.reason === 'string' && (TEST_FAILURES as readonly string[]).includes(res.reason)) {
    return { ok: false, reason: res.reason as TestFailure };
  }
  return null;
}
