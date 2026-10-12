export const AUDIT_KEY = 'jushoai:audit-log';
export const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
// Guards against a runaway loop filling storage within the retention window.
export const AUDIT_MAX_ENTRIES = 1000;
// Byte budget for the retained batch: entries carry request/response payloads
// whose total size the entry count alone does not bound. Measured in UTF-8
// bytes, the unit chrome.storage.local actually charges after serialization
// (CJK costs ~3 bytes per char, so counting chars would understate a
// Japanese-heavy batch). Kept under the browser's quota (5 MB in Firefox,
// 10 MB in Chrome) so a full batch cannot wedge every future write.
export const AUDIT_MAX_BYTES = 4_000_000;

// Upper bound for the page URL kept in an audit record. sanitizePageUrl has no
// length limit and history.pushState can stretch the pathname, so the audit
// ingest caps it here instead of in the shared sanitizer (which also feeds the
// feedback report URL). 1024 bytes keeps any realistic origin (~<300 bytes)
// with room for a path prefix. The cut is on a code-point boundary, so no
// broken encoding or split surrogate pair is ever stored. A stored pageUrl at
// exactly the bound may be a truncated prefix; this is accepted (the audit
// needs the destination identity, not the full path).
export const AUDIT_PAGE_URL_MAX_BYTES = 1024;
const pageUrlEncoder = new TextEncoder();
const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
export function capAuditPageUrl(url: string): string {
  if (pageUrlEncoder.encode(url).length <= AUDIT_PAGE_URL_MAX_BYTES) return url;
  // Binary-search the longest fitting UTF-16 prefix (O(log n) encodings),
  // then drop a trailing split surrogate pair, if any. Any other cut already
  // falls on a code-point boundary.
  let lo = 0;
  let hi = url.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (pageUrlEncoder.encode(url.slice(0, mid)).length <= AUDIT_PAGE_URL_MAX_BYTES) lo = mid;
    else hi = mid - 1;
  }
  let end = lo;
  if (end > 0 && isHighSurrogate(url.charCodeAt(end - 1))) end -= 1;
  return url.slice(0, end);
}

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
// Each entry is measured as the UTF-8 length of its JSON form, so every stored
// field (including the page-controlled pageUrl) counts toward the budget; key
// names and escaping are included because JSON.stringify produces them.
// One encoder is shared by every measurement: the classify hot path records an
// audit per append, so allocating an encoder per call is pure churn.
const textEncoder = new TextEncoder();
const utf8Bytes = (s: string): number => textEncoder.encode(s).length;
// Sizes are memoized per entry object, so the retained log is measured once
// per entry for objects that keep identity in memory: appendEntry keeps the
// existing entry objects and adds one, so each append only encodes the new
// entry. AuditStore.record() re-reads the state from chrome.storage.local and
// normalizeAuditState rebuilds every entry, so identities do not survive a
// storage round-trip and the retained log is re-measured on the next append.
// That re-measurement is bounded: at most the retained entries
// (AUDIT_MAX_ENTRIES) are encoded once each per append.
// Cached sizes go stale if an entry is mutated after measuring; callers must not mutate measured entries (re-measure after any mutation).
const sizeCache = new WeakMap<AuditEntry, number>();
const entryBytes = (e: AuditEntry): number => {
  const cached = sizeCache.get(e);
  if (cached !== undefined) return cached;
  const size = utf8Bytes(JSON.stringify(e));
  sizeCache.set(e, size);
  return size;
};

// UTF-8 length of the stored entries array: the bracket pair and the ASCII
// separators between entries count too — 2 + max(0, n - 1) bytes, all ASCII —
// plus every entry's serialized body. The budget check and the removal loop
// share this one estimate, so the accounting never disagrees with itself
// about what the stored batch costs.
export function batchBytes(entries: AuditEntry[]): number {
  return 2 + Math.max(0, entries.length - 1) + entries.reduce((sum, e) => sum + entryBytes(e), 0);
}

function withinByteBudget(entries: AuditEntry[]): AuditEntry[] {
  const sizes = entries.map(entryBytes);
  let total = batchBytes(entries);
  let i = 0;
  while (i < entries.length && total > AUDIT_MAX_BYTES) {
    // Dropping an entry removes its body and the separator before it: the
    // remainder keeps one separator per remaining pair, so subtracting both
    // keeps the estimate equal to the true serialized size while entries
    // remain. When the last entry is dropped the loop exits and the empty
    // array costs 2 bytes: the subtraction above leaves total at 1 instead,
    // but total is discarded with the loop exit so the 1-byte underestimate
    // never affects the return value or the stored data.
    total -= sizes[i]! + 1;
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
