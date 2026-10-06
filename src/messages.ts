import { CATEGORIES, type Category, type FieldMeta } from './core/types';
import { CLOUD_STATUSES, PROVIDER_KINDS, type AiState, type AiStatusInfo } from './ai/types';
import { AI_STATUSES } from './llm/availability';

// Send-size contract for ai-classify, shared with background-gateway:
// the sender ships at most MAX_CLASSIFY_TOTAL fields in MAX_CLASSIFY_CHUNK
// pieces, and the receiver backstops each message at MAX_CLASSIFY_FIELDS.
// The chunk must stay below the backstop so a well-formed sender never trips it.
export const MAX_CLASSIFY_FIELDS = 30;
export const MAX_CLASSIFY_CHUNK = 20;
const MAX_ID_LENGTH = 100;
const MAX_TEXT_LENGTH = 200;

const AI_STATES: readonly string[] = [...AI_STATUSES, ...CLOUD_STATUSES];
const TEST_FAILURES = ['not-configured', 'permission', 'auth', 'network', 'rejected', 'bad-response'] as const;

export type TestFailure = (typeof TEST_FAILURES)[number];
export type TestResponse = { ok: true; category: Category } | { ok: false; reason: TestFailure };

// Failure vocabulary for ai-classify: the TestFailure set plus 'unavailable'
// (built-in AI present in settings but not usable right now).
const CLASSIFY_FAILURES = [...TEST_FAILURES, 'unavailable'] as const;

export type ClassifyFailure = (typeof CLASSIFY_FAILURES)[number];
export type ClassifyResponse =
  | { ok: true; entries: [string, Category][] }
  | { ok: false; reason: ClassifyFailure };

export type AiRequest =
  | { type: 'ai-status' }
  | { type: 'ai-classify'; fields: FieldMeta[] }
  | { type: 'ai-download' }
  | { type: 'ai-test' }
  | { type: 'open-options' };

// Popup (action popup) to content script: start the usual classify → preview flow
// on the active tab. Answered by the content script, not by the background.
export const ANALYZE_MESSAGE_TYPE = 'jushoai-analyze';
// Closed vocabulary for analyze failures, shared by the sender (content script)
// and the consumer (action popup) across the runtime-message seam.
export const ANALYZE_REASONS = ['no-form', 'no-tab', 'error'] as const;
export type AnalyzeReason = (typeof ANALYZE_REASONS)[number];
export const isAnalyzeReason = (v: unknown): v is AnalyzeReason =>
  typeof v === 'string' && (ANALYZE_REASONS as readonly string[]).includes(v);
export type AnalyzeResponse = { ok: true } | { ok: false; reason: AnalyzeReason };

export const isAiState = (v: unknown): v is AiState => typeof v === 'string' && AI_STATES.includes(v);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT_LENGTH) : '');

// The metadata allow-list sent to the classifier; the single source shared by the sender
// (background-gateway), the receiver (sanitizeField) and the prompt builder (buildPrompt).
export const META_WIRE_KEYS = ['id', 'type', 'name', 'htmlId', 'label', 'placeholder', 'nearby', 'maxLength'] as const;
export type MetaWire = Pick<FieldMeta, (typeof META_WIRE_KEYS)[number]>;

// Display width for metadata strings leaving the extension (prompt rows and
// feedback reports). Distinct from MAX_TEXT_LENGTH, which caps the wire envelope.
export const META_CLIP_LENGTH = 80;

export function toWireMeta(f: FieldMeta): MetaWire {
  return {
    id: f.id,
    type: f.type,
    name: f.name,
    htmlId: f.htmlId,
    label: f.label,
    placeholder: f.placeholder,
    nearby: f.nearby,
    maxLength: f.maxLength,
  };
}

// Rebuilds a FieldMeta from the metadata allow-list only; page-controlled values never pass through.
function sanitizeField(v: unknown): FieldMeta | null {
  if (!isRecord(v)) return null;
  const id = v.id;
  if (typeof id !== 'string' || id === '' || id.length > MAX_ID_LENGTH) return null;
  const maxLength = typeof v.maxLength === 'number' && Number.isFinite(v.maxLength) ? v.maxLength : null;
  const wire: MetaWire = {
    id,
    type: text(v.type),
    name: text(v.name),
    htmlId: text(v.htmlId),
    label: text(v.label),
    placeholder: text(v.placeholder),
    nearby: text(v.nearby),
    maxLength,
  };
  return { ...wire, tag: 'input', autocomplete: '', pattern: '', options: [], readOnly: false, disabled: false, value: '' };
}

export function parseRequest(msg: unknown): AiRequest | null {
  if (!isRecord(msg)) return null;
  const keys = Object.keys(msg);
  if (msg.type === 'ai-status' && keys.length === 1) return { type: 'ai-status' };
  if (msg.type === 'ai-download' && keys.length === 1) return { type: 'ai-download' };
  if (msg.type === 'ai-test' && keys.length === 1) return { type: 'ai-test' };
  if (msg.type === 'open-options' && keys.length === 1) return { type: 'open-options' };
  if (msg.type === 'ai-classify' && keys.length === 2 && Array.isArray(msg.fields)) {
    if (msg.fields.length > MAX_CLASSIFY_FIELDS) return null;
    const fields = msg.fields.map(sanitizeField).filter((f): f is FieldMeta => f !== null);
    return { type: 'ai-classify', fields };
  }
  return null;
}

export function parseClassifyResponse(res: unknown): Map<string, Category> | null {
  const parsed = parseClassifyResult(res);
  return parsed?.ok === true ? parsed.map : null;
}

// Reason-aware counterpart of parseClassifyResponse: keeps the failure reason
// from an ai-classify reply instead of collapsing it to null.
export function parseClassifyResult(res: unknown): { ok: true; map: Map<string, Category> } | { ok: false; reason: ClassifyFailure } | null {
  if (!isRecord(res)) return null;
  if (res.ok === false) {
    return typeof res.reason === 'string' && (CLASSIFY_FAILURES as readonly string[]).includes(res.reason)
      ? { ok: false, reason: res.reason as ClassifyFailure }
      : null;
  }
  if (res.ok !== true || !Array.isArray(res.entries)) return null;
  const valid = new Set<string>(CATEGORIES);
  const out = new Map<string, Category>();
  for (const e of res.entries) {
    if (Array.isArray(e) && e.length === 2 && typeof e[0] === 'string' && typeof e[1] === 'string' && valid.has(e[1])) {
      out.set(e[0], e[1] as Category);
    }
  }
  return { ok: true, map: out };
}

export function parseStatusResponse(res: unknown): AiStatusInfo | null {
  if (!isRecord(res) || !isAiState(res.status)) return null;
  const provider = res.provider;
  if (typeof provider !== 'string' || !(PROVIDER_KINDS as readonly string[]).includes(provider)) return null;
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
