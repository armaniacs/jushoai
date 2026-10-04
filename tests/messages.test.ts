import { describe, it, expect } from 'vitest';
import { parseRequest, parseClassifyResponse, parseStatusResponse, parseTestResponse, MAX_CLASSIFY_FIELDS } from '../src/messages';

const field = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: 'n', ...extra });

describe('parseRequest', () => {
  it('accepts the three exact shapes', () => {
    expect(parseRequest({ type: 'ai-status' })).toEqual({ type: 'ai-status' });
    expect(parseRequest({ type: 'ai-download' })).toEqual({ type: 'ai-download' });
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
    expect(parseRequest({ type: 'open-options' })).toEqual({ type: 'open-options' });
    expect(parseRequest({ type: 'open-options', extra: 1 })).toBeNull();
  });

  it('rejects more than the maximum number of fields', () => {
    const fields = Array.from({ length: MAX_CLASSIFY_FIELDS + 1 }, (_, i) => field(`f${i}`));
    expect(parseRequest({ type: 'ai-classify', fields })).toBeNull();
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
    expect(parseRequest({ type: 'ai-test' })).toEqual({ type: 'ai-test' });
    expect(parseRequest({ type: 'ai-test', extra: 1 })).toBeNull();
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

  it.each([null, { ok: true, category: 'nonsense' }, { ok: false, reason: 'boom' }, { ok: false }])('rejects %j', (v) => {
    expect(parseTestResponse(v)).toBeNull();
  });
});
