import { describe, it, expect, vi } from 'vitest';
import { parseRequest, parseClassifyResponse, parseStatusResponse, parseTestResponse, parseAuditClearResponse, MAX_CLASSIFY_FIELDS, toWireMeta, META_WIRE_KEYS, isAnalyzeReason, ANALYZE_REASONS, AI_REQUEST_VERSION, aiStatusRequest, aiClassifyRequest, aiDownloadRequest, aiTestRequest, openOptionsRequest, auditClearRequest } from '../src/messages';
import { MAX_CLASSIFY_TOTAL } from '../src/llm/background-gateway';
import { makeMeta } from './helpers';

const field = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: 'n', ...extra });

describe('parseRequest', () => {
  it('accepts the three exact shapes', () => {
    expect(parseRequest({ type: 'ai-status' })).toEqual({ type: 'ai-status', v: 1 });
    expect(parseRequest({ type: 'ai-download' })).toEqual({ type: 'ai-download', v: 1 });
    const r = parseRequest({ type: 'ai-classify', fields: [field('a', { label: 'L', maxLength: 5 })] });
    expect(r?.type).toBe('ai-classify');
  });

  it('rejects unknown, extra-keyed or non-object messages', () => {
    for (const m of [null, undefined, 'x', 1, [], {}, { type: 'ai-status', x: 1 },
      { type: 'ai-classify' }, { type: 'ai-classify', fields: 'x' }, { type: 'ai-classify', fields: [], x: 1 }]) {
      expect(parseRequest(m)).toBeNull();
    }
  });

  it('accepts open-options with a single key and rejects extra keys', () => {
    expect(parseRequest({ type: 'open-options' })).toEqual({ type: 'open-options', v: 1 });
    expect(parseRequest({ type: 'open-options', extra: 1 })).toBeNull();
  });

  it('rejects more than the maximum number of fields', () => {
    const fields = Array.from({ length: MAX_CLASSIFY_FIELDS + 1 }, (_, i) => field(`f${i}`));
    expect(parseRequest({ type: 'ai-classify', fields })).toBeNull();
  });

  it('accepts an optional chunk schedule and rejects malformed ones', () => {
    const fields = [field('a')];
    const ok = parseRequest({ type: 'ai-classify', fields, chunk: { index: 2, count: 3 } });
    if (ok?.type !== 'ai-classify') return;
    expect(ok.chunk).toEqual({ index: 2, count: 3 });
    for (const chunk of ['x', {}, { index: 0, count: 3 }, { index: 4, count: 3 }, { index: 1.5, count: 3 },
      { index: 2, count: 'x' }, { index: 2, count: MAX_CLASSIFY_TOTAL + 1 }]) {
      expect(parseRequest({ type: 'ai-classify', fields, chunk })).toBeNull();
    }
  });

  it('sanitizes fields to the metadata allow-list and drops bad ones', () => {
    const r = parseRequest({
      type: 'ai-classify',
      fields: [
        field('a', { value: 'SECRET', label: 123, placeholder: 'p'.repeat(500), maxLength: 'x', type: 'text' }),
        { name: 'no id' },
        field('x'.repeat(500)),
        null,
      ],
    });
    expect(r?.type).toBe('ai-classify');
    if (r?.type !== 'ai-classify') return;
    expect(r.fields).toHaveLength(1);
    const f = r.fields[0]!;
    expect(f.id).toBe('a');
    expect(f.value).toBe('');
    expect(f.label).toBe('');
    expect(f.placeholder.length).toBeLessThanOrEqual(200);
    expect(f.maxLength).toBeNull();
  });

  it('keeps sender and receiver on the same wire shape', () => {
    expect(Object.keys(toWireMeta(makeMeta())).sort()).toEqual([...META_WIRE_KEYS].sort());
  });

  it('passes allow-listed values and drops page-controlled ones', () => {
    const meta = makeMeta({
      id: 'a', value: 'SECRET', autocomplete: 'name', pattern: 'x',
      options: [{ value: 'o', text: 'o' }], readOnly: true, disabled: true,
    });
    const r = parseRequest({ type: 'ai-classify', fields: [meta] });
    if (r?.type !== 'ai-classify') return;
    const received = r.fields[0]!;
    expect(toWireMeta(received)).toEqual(toWireMeta(meta));
    expect(received.value).toBe('');
    expect(received.autocomplete).toBe('');
    expect(received.pattern).toBe('');
    expect(received.options).toEqual([]);
    expect(received.readOnly).toBe(false);
    expect(received.disabled).toBe(false);
  });
});

describe('wire cap agreement with the scan cap', () => {
  it('keeps scan-clipped 200-char label and placeholder intact on the wire', () => {
    const meta = makeMeta({ id: 'a', label: 'あ'.repeat(200), placeholder: 'い'.repeat(200) });
    const r = parseRequest({ type: 'ai-classify', fields: [meta] });
    if (r?.type !== 'ai-classify') return;
    expect(r.fields[0]!.label).toBe('あ'.repeat(200));
    expect(r.fields[0]!.placeholder).toBe('い'.repeat(200));
  });

  it('re-clips a per-source-clipped joined label beyond 200 characters', () => {
    // What labelOf now returns: each source clipped, then joined, so the join can
    // exceed 200 and only the wire cap trims it.
    const joined = `${'あ'.repeat(200)} 姓`;
    const meta = makeMeta({ id: 'a', label: joined });
    const r = parseRequest({ type: 'ai-classify', fields: [meta] });
    if (r?.type !== 'ai-classify') return;
    expect(r.fields[0]!.label).toBe(joined.slice(0, 200));
  });
});

describe('parseClassifyResponse', () => {
  it('converts valid entries to a Map and ignores malformed ones', () => {
    const m = parseClassifyResponse({ ok: true, entries: [['a', 'email'], ['b', 'bogus'], ['c'], [1, 'tel'], 'x'] });
    expect([...m!]).toEqual([['a', 'email']]);
  });
  it('returns null for failures and malformed responses', () => {
    for (const r of [{ ok: false }, undefined, null, 'x', { ok: true }, { ok: true, entries: 'x' }]) {
      expect(parseClassifyResponse(r)).toBeNull();
    }
  });
});

describe('ai-test request', () => {
  it('accepts exactly { type: "ai-test" }', () => {
    expect(parseRequest({ type: 'ai-test' })).toEqual({ type: 'ai-test', v: 1 });
    expect(parseRequest({ type: 'ai-test', extra: 1 })).toBeNull();
  });
});

describe('audit-clear request', () => {
  it('accepts exactly { type: "audit-clear" } and rejects extra keys', () => {
    expect(parseRequest({ type: 'audit-clear' })).toEqual({ type: 'audit-clear', v: 1 });
    expect(parseRequest({ type: 'audit-clear', extra: 1 })).toBeNull();
  });
});

describe('AiRequest message versioning (PBI-34)', () => {
  it('stamps v:1 on every variant via the builders', () => {
    expect(aiStatusRequest()).toEqual({ type: 'ai-status', v: 1 });
    expect(aiDownloadRequest()).toEqual({ type: 'ai-download', v: 1 });
    expect(aiTestRequest()).toEqual({ type: 'ai-test', v: 1 });
    expect(openOptionsRequest()).toEqual({ type: 'open-options', v: 1 });
    expect(auditClearRequest()).toEqual({ type: 'audit-clear', v: 1 });
    const fields = [makeMeta({ id: 'a' })];
    expect(aiClassifyRequest(fields)).toEqual({ type: 'ai-classify', v: 1, fields });
    expect(aiClassifyRequest(fields, { index: 1, count: 2 })).toEqual({
      type: 'ai-classify', v: 1, fields, chunk: { index: 1, count: 2 },
    });
    expect(AI_REQUEST_VERSION).toBe(1);
  });

  it('parses every version-stamped variant back with v:1', () => {
    for (const req of [aiStatusRequest(), aiDownloadRequest(), aiTestRequest(), openOptionsRequest(), auditClearRequest()]) {
      expect(parseRequest(req)).toEqual(req);
    }
    // ai-classify fields are sanitized on receipt, so compare the envelope only.
    const classify = aiClassifyRequest([makeMeta({ id: 'a' })], { index: 2, count: 3 });
    const parsed = parseRequest(classify);
    expect(parsed?.type).toBe('ai-classify');
    if (parsed?.type !== 'ai-classify') return;
    expect(parsed.v).toBe(1);
    expect(parsed.chunk).toEqual({ index: 2, count: 3 });
    expect(parsed.fields).toHaveLength(1);
  });

  it('accepts legacy version-less shapes without warning and normalizes them to v:1', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(parseRequest({ type: 'ai-status' })).toEqual({ type: 'ai-status', v: 1 });
      expect(parseRequest({ type: 'ai-download' })).toEqual({ type: 'ai-download', v: 1 });
      expect(parseRequest({ type: 'ai-test' })).toEqual({ type: 'ai-test', v: 1 });
      expect(parseRequest({ type: 'open-options' })).toEqual({ type: 'open-options', v: 1 });
      expect(parseRequest({ type: 'audit-clear' })).toEqual({ type: 'audit-clear', v: 1 });
      const r = parseRequest({ type: 'ai-classify', fields: [field('a')] });
      expect(r).toEqual({ type: 'ai-classify', v: 1, fields: expect.any(Array) });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('warns on unknown versions and refuses to treat them as known shapes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const v of [0, 2, 99, '1', null, true, {}]) {
        expect(parseRequest({ type: 'ai-status', v })).toBeNull();
        expect(parseRequest({ type: 'ai-test', v })).toBeNull();
        expect(parseRequest({ type: 'ai-classify', fields: [field('a')], v })).toBeNull();
      }
      // One warn per rejected message: 7 versions x 3 shapes.
      expect(warn).toHaveBeenCalledTimes(21);
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps the strict key check with v present: other extra keys are still rejected', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(parseRequest({ type: 'ai-status', v: 1, extra: 1 })).toBeNull();
      expect(parseRequest({ type: 'ai-test', v: 1, extra: 1 })).toBeNull();
      expect(parseRequest({ type: 'ai-classify', fields: [field('a')], v: 1, extra: 1 })).toBeNull();
      expect(parseRequest({ type: 'ai-classify', fields: [field('a')], v: 1, chunk: { index: 1, count: 1 }, extra: 1 })).toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('accepts v:1 alongside an optional chunk schedule', () => {
    const fields = [field('a')];
    const ok = parseRequest({ type: 'ai-classify', fields, v: 1, chunk: { index: 2, count: 3 } });
    expect(ok).toEqual({ type: 'ai-classify', v: 1, fields: expect.any(Array), chunk: { index: 2, count: 3 } });
    expect(parseRequest({ type: 'ai-classify', fields, v: 1, chunk: { index: 4, count: 3 } })).toBeNull();
  });
});

describe('parseAuditClearResponse', () => {
  it('accepts the ok and not-ok replies and rejects everything else', () => {
    expect(parseAuditClearResponse({ ok: true })).toEqual({ ok: true });
    expect(parseAuditClearResponse({ ok: false })).toEqual({ ok: false });
    for (const r of [null, undefined, 'x', 1, [], {}, { ok: 'yes' }, { ok: 1 }]) {
      expect(parseAuditClearResponse(r)).toBeNull();
    }
  });
});

describe('parseStatusResponse', () => {
  it('accepts a known status and provider', () => {
    expect(parseStatusResponse({ status: 'available', provider: 'openai' })).toEqual({ status: 'available', provider: 'openai' });
    expect(parseStatusResponse({ status: 'auth-error', provider: 'gemini' })).toEqual({ status: 'auth-error', provider: 'gemini' });
  });

  it.each([null, {}, { status: 'available' }, { status: 'x', provider: 'openai' }, { status: 'available', provider: 'evil' }])(
    'rejects %j',
    (v) => {
      expect(parseStatusResponse(v)).toBeNull();
    },
  );
});

describe('parseTestResponse', () => {
  it('accepts a category result and known failure reasons', () => {
    expect(parseTestResponse({ ok: true, category: 'lastName' })).toEqual({ ok: true, category: 'lastName' });
    expect(parseTestResponse({ ok: false, reason: 'auth' })).toEqual({ ok: false, reason: 'auth' });
    expect(parseTestResponse({ ok: false, reason: 'rejected' })).toEqual({ ok: false, reason: 'rejected' });
  });

  it('guards the analyze reason vocabulary', () => {
    for (const r of ANALYZE_REASONS) expect(isAnalyzeReason(r)).toBe(true);
    expect(isAnalyzeReason('boom')).toBe(false);
    expect(isAnalyzeReason(null)).toBe(false);
  });

  it.each([null, { ok: true, category: 'nonsense' }, { ok: false, reason: 'boom' }, { ok: false }])('rejects %j', (v) => {
    expect(parseTestResponse(v)).toBeNull();
  });
});
