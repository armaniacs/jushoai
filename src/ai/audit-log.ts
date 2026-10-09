export const AUDIT_KEY = 'jushoai:audit-log';
export const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
// Guards against a runaway loop filling storage within the retention window.
export const AUDIT_MAX_ENTRIES = 1000;
// Byte budget for the retained batch: entries carry request/response payloads
// whose total size the entry count alone does not bound. Kept under the browser's
// chrome.storage.local quota (5 MB in Firefox, 10 MB in Chrome) so a full batch
// cannot wedge every future write.
export const AUDIT_MAX_BYTES = 4_000_000;

export const AUDIT_RESULTS = ['success', 'auth-error', 'http-error', 'network-error', 'invalid-response', 'error'] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];
export type AuditPurpose = 'classify' | 'connection-test';

// Responses can be arbitrarily large; the trace keeps the head plus an ellipsis.
export const AUDIT_RESPONSE_CLIP_LENGTH = 2000;
const RESPONSE_ELLIPSIS = '…';

export function clipAuditResponse(s: string): string {
  return s.length > AUDIT_RESPONSE_CLIP_LENGTH ? s.slice(0, AUDIT_RESPONSE_CLIP_LENGTH) + RESPONSE_ELLIPSIS : s;
}

// The request/response trace is recorded so the user can verify what an external
// provider actually received and answered. The prompt carries only the metadata
// allow-list, so profile values, field values, API keys and request headers never
// reach this log. The system prompt is code-defined and identical for every call,
// so it stays out of the entries and is shown by the settings-page viewer.
export interface AuditEntry {
  id: number;
  createdAt: number;
  provider: string;
  host: string;
  model: string;
  purpose: AuditPurpose;
  pageUrl: string;
  fieldCount: number;
  request: string;
  response: string;
  chunkIndex: number | null;
  chunkCount: number | null;
  result: AuditResult;
  httpStatus: number | null;
  retried: boolean;
  durationMs: number | null;
}

export type AuditDraft = Omit<AuditEntry, 'id' | 'createdAt'>;

export interface AuditState {
  nextId: number;
  entries: AuditEntry[];
}

export const EMPTY_AUDIT_STATE: AuditState = { nextId: 1, entries: [] };

export function pruneEntries(entries: AuditEntry[], now: number): AuditEntry[] {
  const fresh = entries.filter((e) => now - e.createdAt <= AUDIT_RETENTION_MS);
  const capped = fresh.length > AUDIT_MAX_ENTRIES ? fresh.slice(fresh.length - AUDIT_MAX_ENTRIES) : fresh;
  return withinByteBudget(capped);
}

// Drops the oldest entries until the estimated serialized batch fits the byte
// budget; without this a full batch would make chrome.storage.local.set fail on
// every future append and the stale blob would never shrink on its own.
const entryBytes = (e: AuditEntry): number => e.request.length + e.response.length + 256;

function withinByteBudget(entries: AuditEntry[]): AuditEntry[] {
  let total = 0;
  for (const e of entries) total += entryBytes(e);
  let i = 0;
  while (i < entries.length && total > AUDIT_MAX_BYTES) {
    total -= entryBytes(entries[i]!);
    i++;
  }
  return i === 0 ? entries : entries.slice(i);
}

export function appendEntry(state: AuditState, draft: AuditDraft, now: number): AuditState {
  const entry: AuditEntry = { ...draft, id: state.nextId, createdAt: now };
  return { nextId: state.nextId + 1, entries: pruneEntries([...state.entries, entry], now) };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isEntry = (v: unknown): v is AuditEntry =>
  isRecord(v) &&
  typeof v.id === 'number' && typeof v.createdAt === 'number' &&
  typeof v.provider === 'string' && typeof v.host === 'string' && typeof v.model === 'string' &&
  (v.purpose === 'classify' || v.purpose === 'connection-test') &&
  typeof v.pageUrl === 'string' && typeof v.fieldCount === 'number' &&
  (AUDIT_RESULTS as readonly unknown[]).includes(v.result) &&
  (v.httpStatus === null || typeof v.httpStatus === 'number') && typeof v.retried === 'boolean' &&
  (v.request === undefined || typeof v.request === 'string') &&
  (v.response === undefined || typeof v.response === 'string') &&
  (v.chunkIndex === undefined || v.chunkIndex === null || typeof v.chunkIndex === 'number') &&
  (v.chunkCount === undefined || v.chunkCount === null || typeof v.chunkCount === 'number') &&
  (v.durationMs === undefined || v.durationMs === null || typeof v.durationMs === 'number');

// Entries written before the request/response tracing keep loading; the missing
// trace fields are filled with their empty values instead of dropping the row.
const withTraceDefaults = (e: AuditEntry): AuditEntry => ({
  ...e,
  request: typeof e.request === 'string' ? e.request : '',
  response: typeof e.response === 'string' ? e.response : '',
  chunkIndex: typeof e.chunkIndex === 'number' ? e.chunkIndex : null,
  chunkCount: typeof e.chunkCount === 'number' ? e.chunkCount : null,
  durationMs: typeof e.durationMs === 'number' ? e.durationMs : null,
});

export function normalizeAuditState(raw: unknown): AuditState {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return EMPTY_AUDIT_STATE;
  const entries = raw.entries.filter(isEntry).map(withTraceDefaults);
  const maxId = entries.reduce((m, e) => Math.max(m, e.id), 0);
  const nextId = typeof raw.nextId === 'number' && raw.nextId > maxId ? raw.nextId : maxId + 1;
  return { nextId, entries };
}

export const TSV_COLUMNS = [
  'id', 'created_at', 'provider', 'host', 'model', 'purpose', 'page_url', 'field_count',
  'chunk_index', 'chunk_count', 'result', 'http_status', 'retried', 'duration_ms', 'request', 'response',
] as const;

function escapeTsvField(value: string): string {
  let s = value;
  // CWE-1236: a leading formula character would make a spreadsheet evaluate the cell.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (s.includes('\t') || s.includes('\n') || s.includes('\r') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Newest first.
export function toTsv(entries: AuditEntry[]): string {
  const rows = [...entries].sort((a, b) => b.id - a.id).map((e) =>
    [
      String(e.id), new Date(e.createdAt).toISOString(), e.provider, e.host, e.model, e.purpose, e.pageUrl,
      String(e.fieldCount),
      e.chunkIndex === null ? '' : String(e.chunkIndex), e.chunkCount === null ? '' : String(e.chunkCount),
      e.result, e.httpStatus === null ? '' : String(e.httpStatus), String(e.retried),
      e.durationMs === null ? '' : String(e.durationMs),
      e.request, e.response,
    ].map(escapeTsvField).join('\t'),
  );
  return `${TSV_COLUMNS.join('\t')}\n${rows.map((r) => `${r}\n`).join('')}`;
}

export function auditFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `jushoai-audit-log-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.tsv`;
}

export interface AuditRecorder {
  record(draft: AuditDraft): Promise<void>;
}

export class AuditStore implements AuditRecorder {
  // chrome.storage has no transaction, so appends are serialized to avoid lost updates.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly now: () => number = Date.now) {}

  private async read(): Promise<AuditState> {
    const result = await chrome.storage.local.get(AUDIT_KEY);
    return normalizeAuditState(result[AUDIT_KEY]);
  }

  record(draft: AuditDraft): Promise<void> {
    const run = async () => {
      const next = appendEntry(await this.read(), draft, this.now());
      await chrome.storage.local.set({ [AUDIT_KEY]: next });
    };
    const done = this.queue.then(run, run);
    this.queue = done.catch(() => undefined);
    return done;
  }

  async list(): Promise<AuditEntry[]> {
    return pruneEntries((await this.read()).entries, this.now());
  }

  clear(): Promise<void> {
    // Same serialization as record(): a clear racing an in-flight record must
    // not lose the record or resurrect entries after clearing.
    const run = async () => {
      const state = await this.read();
      await chrome.storage.local.set({ [AUDIT_KEY]: { nextId: state.nextId, entries: [] } });
    };
    const done = this.queue.then(run, run);
    this.queue = done.catch(() => undefined);
    return done;
  }
}
