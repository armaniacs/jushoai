import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AUDIT_KEY, AUDIT_MAX_BYTES, AUDIT_MAX_ENTRIES, AUDIT_RESPONSE_CLIP_LENGTH, AUDIT_RETENTION_MS, AuditStore,
  appendEntry, auditFileName, clipAuditResponse, normalizeAuditState, toTsv, EMPTY_AUDIT_STATE, type AuditDraft,
} from '../../src/ai/audit-log';

const draft = (over: Partial<AuditDraft> = {}): AuditDraft => ({
  provider: 'openai', host: 'api.openai.com', model: 'm', purpose: 'classify', pageUrl: 'https://example.com/form',
  fieldCount: 3, request: 'PROMPT', response: 'RAW', chunkIndex: null, chunkCount: null,
  result: 'success', httpStatus: 200, retried: false, durationMs: 12, ...over,
});

describe('appendEntry', () => {
  it('assigns sequential ids and the timestamp', () => {
    let s = appendEntry(EMPTY_AUDIT_STATE, draft(), 1000);
    s = appendEntry(s, draft(), 2000);
    expect(s.entries.map((e) => [e.id, e.createdAt])).toEqual([[1, 1000], [2, 2000]]);
    expect(s.nextId).toBe(3);
  });

  it('drops entries older than the retention window at the boundary', () => {
    const now = 10 * AUDIT_RETENTION_MS;
    let s = appendEntry(EMPTY_AUDIT_STATE, draft(), now - AUDIT_RETENTION_MS - 1);
    s = appendEntry(s, draft(), now - AUDIT_RETENTION_MS);
    s = appendEntry(s, draft(), now);
    expect(s.entries.map((e) => e.id)).toEqual([2, 3]);
  });

  it('keeps only the newest entries past the safety cap', () => {
    let s = EMPTY_AUDIT_STATE;
    for (let i = 0; i < AUDIT_MAX_ENTRIES + 5; i++) s = appendEntry(s, draft(), 1000 + i);
    expect(s.entries).toHaveLength(AUDIT_MAX_ENTRIES);
    expect(s.entries[0]!.id).toBe(6);
  });

  it('drops the oldest entries when the byte budget is exceeded', () => {
    const big = (): AuditDraft => draft({ request: 'x'.repeat(3_000_000) });
    let s = appendEntry(EMPTY_AUDIT_STATE, big(), 1000);
    s = appendEntry(s, big(), 2000);
    expect(s.entries.map((e) => e.id)).toEqual([2]);
    expect(s.nextId).toBe(3);
  });

  it('keeps entries exactly at the byte budget', () => {
    const exact = draft({ request: 'x'.repeat(AUDIT_MAX_BYTES - 256 - 3) });
    const s = appendEntry(EMPTY_AUDIT_STATE, exact, 1);
    expect(s.entries).toHaveLength(1);
  });

  it('records the trace of what the model received and answered', () => {
    const s = appendEntry(EMPTY_AUDIT_STATE, draft(), 1);
    expect(s.entries[0]).toMatchObject({ request: 'PROMPT', response: 'RAW', durationMs: 12 });
  });

  it('carries only call metadata and the trace, nothing else', () => {
    const s = appendEntry(EMPTY_AUDIT_STATE, { ...draft(), label: '山田', apiKey: 'sk-x' } as AuditDraft, 1);
    expect(Object.keys(draft()).sort()).toEqual([
      'chunkCount', 'chunkIndex', 'durationMs', 'fieldCount', 'host', 'httpStatus', 'model', 'pageUrl',
      'provider', 'purpose', 'request', 'response', 'result', 'retried',
    ]);
    expect(s.entries).toHaveLength(1);
  });
});

describe('normalizeAuditState', () => {
  it('returns empty state for garbage and filters malformed entries', () => {
    expect(normalizeAuditState(null)).toEqual(EMPTY_AUDIT_STATE);
    const good = appendEntry(EMPTY_AUDIT_STATE, draft(), 5).entries[0]!;
    const s = normalizeAuditState({ nextId: 1, entries: [good, { id: 'x' }, null] });
    expect(s.entries).toEqual([good]);
    expect(s.nextId).toBe(good.id + 1);
  });

  it('fills the trace fields of entries written before the tracing', () => {
    const legacy = {
      id: 1, createdAt: 5, provider: 'openai', host: 'h', model: 'm', purpose: 'classify',
      pageUrl: 'https://e.com/p', fieldCount: 1, result: 'success', httpStatus: 200, retried: false,
    };
    const s = normalizeAuditState({ nextId: 2, entries: [legacy] });
    expect(s.entries).toEqual([{
      ...legacy, request: '', response: '', chunkIndex: null, chunkCount: null, durationMs: null,
    }]);
  });

  it('drops entries with malformed trace fields', () => {
    const good = appendEntry(EMPTY_AUDIT_STATE, draft(), 5).entries[0]!;
    const s = normalizeAuditState({ nextId: 1, entries: [good, { ...good, request: 42 }, { ...good, chunkIndex: '2' }] });
    expect(s.entries).toEqual([good]);
  });
});

describe('toTsv', () => {
  it('writes a header and newest-first rows with ISO dates', () => {
    let s = appendEntry(EMPTY_AUDIT_STATE, draft({ httpStatus: null, result: 'network-error' }), Date.UTC(2026, 9, 6));
    s = appendEntry(s, draft({ chunkIndex: 2, chunkCount: 3 }), Date.UTC(2026, 9, 7));
    const lines = toTsv(s.entries).split('\n');
    expect(lines[0]).toBe(
      'id\tcreated_at\tprovider\thost\tmodel\tpurpose\tpage_url\tfield_count\tchunk_index\tchunk_count\tresult\thttp_status\tretried\tduration_ms\trequest\tresponse',
    );
    expect(lines[1]).toBe(
      '2\t2026-10-07T00:00:00.000Z\topenai\tapi.openai.com\tm\tclassify\thttps://example.com/form\t3\t2\t3\tsuccess\t200\tfalse\t12\tPROMPT\tRAW',
    );
    expect(lines[2]!.split('\t')[11]).toBe('');
    expect(lines[3]).toBe('');
  });

  it('prefixes formula triggers and quotes tabs, newlines and quotes', () => {
    const s = appendEntry(EMPTY_AUDIT_STATE, draft({ pageUrl: '=HYPERLINK(x)', model: 'a\tb', host: '+1', provider: '@x' }), 1);
    const row = toTsv(s.entries).split('\n')[1]!;
    expect(row).toContain("\t'=HYPERLINK(x)\t");
    expect(row).toContain('\t"a\tb"\t');
    expect(row).toContain("\t'+1\t");
    expect(row).toContain("\t'@x\t");
  });

  it('quotes embedded double quotes after the formula prefix', () => {
    const s = appendEntry(EMPTY_AUDIT_STATE, draft({ pageUrl: '=A("x")' }), 1);
    expect(toTsv(s.entries)).toContain('\t"\'=A(""x"")"\t');
  });

  it('quotes trace cells containing tabs, newlines and quotes', () => {
    const s = appendEntry(EMPTY_AUDIT_STATE, draft({ request: 'a\tb', response: 'x\n"y"' }), 1);
    const out = toTsv(s.entries);
    expect(out).toContain('"a\tb"');
    expect(out).toContain('"x\n""y"""');
  });

  it('writes only the header for no entries', () => {
    expect(toTsv([])).toBe(
      'id\tcreated_at\tprovider\thost\tmodel\tpurpose\tpage_url\tfield_count\tchunk_index\tchunk_count\tresult\thttp_status\tretried\tduration_ms\trequest\tresponse\n',
    );
  });
});

describe('clipAuditResponse', () => {
  it('keeps responses at the cap untouched', () => {
    expect(clipAuditResponse('x'.repeat(AUDIT_RESPONSE_CLIP_LENGTH))).toHaveLength(AUDIT_RESPONSE_CLIP_LENGTH);
  });

  it('clips longer responses and marks the ellipsis', () => {
    const clipped = clipAuditResponse('x'.repeat(AUDIT_RESPONSE_CLIP_LENGTH + 1));
    expect(clipped).toHaveLength(AUDIT_RESPONSE_CLIP_LENGTH + 1);
    expect(clipped.endsWith('…')).toBe(true);
  });
});

describe('auditFileName', () => {
  it('uses the local date', () => {
    expect(auditFileName(new Date(2026, 0, 5))).toBe('jushoai-audit-log-2026-01-05.tsv');
  });
});

describe('AuditStore', () => {
  let store: Record<string, unknown>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          // Yields so unserialized read-modify-write cycles would interleave.
          set: async (obj: Record<string, unknown>) => { await Promise.resolve(); Object.assign(store, obj); },
        },
      },
    });
  });

  it('keeps every entry when records race', async () => {
    const s = new AuditStore(() => 1000);
    await Promise.all([s.record(draft()), s.record(draft()), s.record(draft())]);
    expect((await s.list()).map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('hides expired entries when listing and clears without reusing ids', async () => {
    let now = 1000;
    const s = new AuditStore(() => now);
    await s.record(draft());
    now += AUDIT_RETENTION_MS + 1;
    expect(await s.list()).toEqual([]);
    await s.record(draft());
    await s.clear();
    expect(await s.list()).toEqual([]);
    await s.record(draft());
    expect((await s.list())[0]!.id).toBe(3);
    expect(AUDIT_KEY in store).toBe(true);
  });
});
