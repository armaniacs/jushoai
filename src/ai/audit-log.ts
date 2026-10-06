export const AUDIT_KEY = 'jushoai:audit-log';
export const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
// Guards against a runaway loop filling storage within the retention window.
export const AUDIT_MAX_ENTRIES = 1000;

export const AUDIT_RESULTS = ['success', 'auth-error', 'http-error', 'network-error', 'invalid-response', 'error'] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];
export type AuditPurpose = 'classify' | 'connection-test';

// Only metadata about the call. Field contents, profile values, keys, headers and
// response bodies are deliberately not representable here.
export interface AuditEntry {
  id: number;
  createdAt: number;
  provider: string;
  host: string;
  model: string;
  purpose: AuditPurpose;
  pageUrl: string;
  fieldCount: number;
  result: AuditResult;
  httpStatus: number | null;
  retried: boolean;
}

export type AuditDraft = Omit<AuditEntry, 'id' | 'createdAt'>;

export interface AuditState {
  nextId: number;
  entries: AuditEntry[];
}

export const EMPTY_AUDIT_STATE: AuditState = { nextId: 1, entries: [] };

export function pruneEntries(entries: AuditEntry[], now: number): AuditEntry[] {
  const fresh = entries.filter((e) => now - e.createdAt <= AUDIT_RETENTION_MS);
  return fresh.length > AUDIT_MAX_ENTRIES ? fresh.slice(fresh.length - AUDIT_MAX_ENTRIES) : fresh;
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
  (v.httpStatus === null || typeof v.httpStatus === 'number') && typeof v.retried === 'boolean';

export function normalizeAuditState(raw: unknown): AuditState {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return EMPTY_AUDIT_STATE;
  const entries = raw.entries.filter(isEntry);
  const maxId = entries.reduce((m, e) => Math.max(m, e.id), 0);
  const nextId = typeof raw.nextId === 'number' && raw.nextId > maxId ? raw.nextId : maxId + 1;
  return { nextId, entries };
}

export const TSV_COLUMNS = [
  'id', 'created_at', 'provider', 'host', 'model', 'purpose', 'page_url', 'field_count', 'result', 'http_status', 'retried',
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
      String(e.fieldCount), e.result, e.httpStatus === null ? '' : String(e.httpStatus), String(e.retried),
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
