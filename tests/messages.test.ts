import { describe, it, expect, vi } from 'vitest';
import { parseRequest, decodeRequest, encodeRequest, parseClassifyResponse, parseStatusResponse, parseTestResponse, parseAuditClearResponse, MAX_CLASSIFY_FIELDS, toWireMeta, encodeFieldMeta, decodeFieldMeta, META_WIRE_KEYS, isAnalyzeReason, ANALYZE_REASONS, AI_REQUEST_VERSION, aiStatusRequest, aiClassifyRequest, aiDownloadRequest, aiTestRequest, openOptionsRequest, auditClearRequest } from '../src/messages';
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

  it('keeps the ai-classify sender envelope byte-identical through the builder (PBI-54)', () => {
    const rows = [encodeFieldMeta(makeMeta({ id: 'a', value: 'SECRET' })), encodeFieldMeta(makeMeta({ id: 'b' }))];
    // What the gateway sent as a raw literal before the migration.
    const legacy = { type: 'ai-classify', v: 1, fields: rows };
    expect(aiClassifyRequest(rows)).toEqual(legacy);
    const legacyChunked = { type: 'ai-classify', v: 1, fields: rows, chunk: { index: 2, count: 3 } };
    expect(aiClassifyRequest(rows, { index: 2, count: 3 })).toEqual(legacyChunked);
    // An undefined schedule stays out of the envelope (single-chunk audit silence).
    expect('chunk' in aiClassifyRequest(rows, undefined)).toBe(false);
    // Round-trip: value never crosses, ids survive.
    const decoded = decodeRequest(aiClassifyRequest(rows, { index: 1, count: 1 }));
    if (decoded?.type !== 'ai-classify') throw new Error('must decode');
    expect(decoded.fields.map((f) => [f.id, f.value])).toEqual([['a', ''], ['b', '']]);
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

describe('wire codec (PBI-46)', () => {
  it('hides versioning behind encode: every variant leaves with v:1 and no caller assembly', () => {
    expect(encodeRequest({ type: 'ai-status' })).toEqual({ type: 'ai-status', v: 1 });
    expect(encodeRequest({ type: 'ai-download' })).toEqual({ type: 'ai-download', v: 1 });
    expect(encodeRequest({ type: 'ai-test' })).toEqual({ type: 'ai-test', v: 1 });
    expect(encodeRequest({ type: 'open-options' })).toEqual({ type: 'open-options', v: 1 });
    expect(encodeRequest({ type: 'audit-clear' })).toEqual({ type: 'audit-clear', v: 1 });
    const fields = [makeMeta({ id: 'a' })];
    expect(encodeRequest({ type: 'ai-classify', fields })).toEqual({ type: 'ai-classify', v: 1, fields });
    expect(encodeRequest({ type: 'ai-classify', fields, chunk: { index: 1, count: 2 } })).toEqual({
      type: 'ai-classify', v: 1, fields, chunk: { index: 1, count: 2 },
    });
  });

  it('drops stray keys and restamps the version instead of trusting the input', () => {
    expect(encodeRequest({ type: 'ai-status', v: 99, extra: 1 } as unknown as { type: 'ai-status' }))
      .toEqual({ type: 'ai-status', v: 1 });
  });

  it('keeps builders as thin encode aliases', () => {
    expect(aiStatusRequest()).toEqual(encodeRequest({ type: 'ai-status' }));
    expect(aiDownloadRequest()).toEqual(encodeRequest({ type: 'ai-download' }));
    expect(aiTestRequest()).toEqual(encodeRequest({ type: 'ai-test' }));
    expect(openOptionsRequest()).toEqual(encodeRequest({ type: 'open-options' }));
    expect(auditClearRequest()).toEqual(encodeRequest({ type: 'audit-clear' }));
    const fields = [makeMeta({ id: 'a' })];
    expect(aiClassifyRequest(fields)).toEqual(encodeRequest({ type: 'ai-classify', fields }));
    expect(aiClassifyRequest(fields, { index: 1, count: 2 }))
      .toEqual(encodeRequest({ type: 'ai-classify', fields, chunk: { index: 1, count: 2 } }));
  });

  it('round-trips every encoded variant through decode', () => {
    for (const req of [aiStatusRequest(), aiDownloadRequest(), aiTestRequest(), openOptionsRequest(), auditClearRequest()]) {
      expect(decodeRequest(req)).toEqual(req);
      expect(decodeRequest(req)).toEqual(parseRequest(req));
    }
    const classify = aiClassifyRequest([makeMeta({ id: 'a' })], { index: 2, count: 3 });
    const decoded = decodeRequest(classify);
    expect(decoded?.type).toBe('ai-classify');
    if (decoded?.type !== 'ai-classify') return;
    expect(decoded.v).toBe(1);
    expect(decoded.chunk).toEqual({ index: 2, count: 3 });
    expect(decoded.fields).toHaveLength(1);
  });

  it('detects wire drift inside the codec and fails safe', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Unknown keys are rejected (null), not acted on.
      expect(decodeRequest({ type: 'ai-status', v: 1, extra: 1 })).toBeNull();
      expect(decodeRequest({ type: 'ai-classify', fields: [field('a')], v: 1, extra: 1 })).toBeNull();
      // A misnamed envelope key counts as drift too.
      expect(decodeRequest({ type: 'ai-status', v: 1, typo: 1 } as unknown as { type: 'ai-status' })).toBeNull();
      // Missing keys are rejected.
      expect(decodeRequest({ type: 'ai-classify' })).toBeNull();
      expect(decodeRequest({})).toBeNull();
      // Unknown versions warn once per message and reject.
      expect(decodeRequest({ type: 'ai-status', v: 2 })).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      // Legacy version-less shapes are still accepted without warning.
      expect(decodeRequest({ type: 'ai-status' })).toEqual({ type: 'ai-status', v: 1 });
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps the field wire discipline behind encode/decode only', () => {
    const meta = makeMeta({ id: 'a', value: 'SECRET', label: 'L' });
    const wire = encodeFieldMeta(meta);
    expect(Object.keys(wire).sort()).toEqual([...META_WIRE_KEYS].sort());
    expect(JSON.stringify(wire)).not.toContain('SECRET');
    expect(toWireMeta(meta)).toEqual(wire);
    // decode strips off-allow-list keys and restores the fill-safe shape.
    const decoded = decodeFieldMeta({ ...wire, value: 'SECRET', tag: 'select', bogus: 1 });
    expect(decoded?.value).toBe('');
    expect(Object.keys(encodeFieldMeta(decoded!)).sort()).toEqual([...META_WIRE_KEYS].sort());
    // Missing or unusable ids are dropped (null) so the caller can count them.
    for (const bad of [null, {}, { id: '' }, { id: 'x'.repeat(500) }]) {
      expect(decodeFieldMeta(bad)).toBeNull();
    }
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
