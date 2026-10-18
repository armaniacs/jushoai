import { describe, it, expect, vi } from 'vitest';
import {
  FETCH_TIMEOUT_MS,
  collectExpectedRemnants,
  countExpectedPlaceholders,
  fetchPage,
  formatExpectedRemnants,
  parseRegistry,
  parseSyncArgs,
  selectTargets,
  stampRegistry,
} from '../../scripts/sync-target-urls.mjs';

describe('sync-target-urls registry', () => {
  const md = `# Target URLs\n\n- https://example.com/a → a.html\n- https://example.com/b\n`;
  it('parses mapped and unmapped URLs', () => {
    expect(parseRegistry(md)).toEqual([
      { url: 'https://example.com/a', file: 'a.html' },
      { url: 'https://example.com/b', file: null },
    ]);
  });
  it('stamps the mapping onto the bare line', () => {
    const next = stampRegistry(md, 'https://example.com/b', 'b.html');
    expect(next).toContain('- https://example.com/b → b.html');
    expect(parseRegistry(next)).toContainEqual({ url: 'https://example.com/b', file: 'b.html' });
  });
  it('appends unknown URLs', () => {
    expect(stampRegistry(md, 'https://example.com/c', 'c.html')).toContain('- https://example.com/c → c.html');
  });
});

describe('sync-target-urls target selection', () => {
  const entries = [
    { url: 'https://example.com/a', file: 'a.html' },
    { url: 'https://example.com/b', file: null },
    { url: 'https://example.com/c', file: null },
  ];
  it('parses --only with separate and = forms, and --all', () => {
    expect(parseSyncArgs(['--only', 'https://example.com/b'])).toEqual({
      only: 'https://example.com/b',
      all: false,
      check: false,
    });
    expect(parseSyncArgs(['--only=https://example.com/b'])).toEqual({
      only: 'https://example.com/b',
      all: false,
      check: false,
    });
    expect(parseSyncArgs(['--all'])).toEqual({ only: null, all: true, check: false });
    expect(parseSyncArgs([])).toEqual({ only: null, all: false, check: false });
  });
  it('parses --check without disturbing --only/--all', () => {
    expect(parseSyncArgs(['--check'])).toEqual({ only: null, all: false, check: true });
  });
  it('--only narrows to the single requested URL', () => {
    expect(selectTargets(entries, { only: 'https://example.com/b' })).toEqual([
      { url: 'https://example.com/b', file: null },
    ]);
  });
  it('--all keeps every entry (wired-skip stays in the caller)', () => {
    expect(selectTargets(entries, { all: true })).toEqual(entries);
  });
  it('selects nothing without an explicit flag (no implicit bulk fetch)', () => {
    expect(selectTargets(entries, {})).toEqual([]);
    expect(selectTargets(entries)).toEqual([]);
  });
});

describe('sync-target-urls fetch with timeout', () => {
  it('uses a 15s AbortSignal.timeout', () => {
    expect(FETCH_TIMEOUT_MS).toBe(15_000);
  });
  it('passes an AbortSignal to fetch', async () => {
    const html = '<html></html>';
    const fetchFn = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        ({ ok: true, status: 200, text: async () => html }) as Response,
    );
    const page = await fetchPage('https://example.com/b', fetchFn as unknown as typeof fetch);
    expect(page).toEqual({ ok: true, text: html });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it('maps timeout abort to a skippable non-ok result instead of throwing', async () => {
    const abortError = new DOMException('The operation was aborted', 'TimeoutError');
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
      throw abortError;
    });
    await expect(
      fetchPage('https://example.com/hang', fetchFn as unknown as typeof fetch),
    ).resolves.toEqual({ ok: false, error: abortError });
  });
  it('maps non-ok responses to skippable results', async () => {
    const fetchFn = vi.fn(
      async (_url: string, _init?: RequestInit) => ({ ok: false, status: 500 }) as Response,
    );
    await expect(
      fetchPage('https://example.com/down', fetchFn as unknown as typeof fetch),
    ).resolves.toEqual({ ok: false, status: 500 });
  });
});

describe('sync-target-urls addurl-check remnants', () => {
  it('counts a single placeholder', () => {
    expect(countExpectedPlaceholders(`'a': '<expected>',`)).toBe(1);
  });
  it('counts multiple placeholders in one source', () => {
    expect(countExpectedPlaceholders(`'a': '<expected>',\n'b': '<expected>',`)).toBe(2);
  });
  it('counts zero when the source is filled', () => {
    expect(countExpectedPlaceholders(`'a': '山田',`)).toBe(0);
    expect(countExpectedPlaceholders('')).toBe(0);
  });
  it('lists remnants per file with counts', () => {
    expect(
      collectExpectedRemnants({
        'a.test.ts': `'a': '<expected>',`,
        'b.test.ts': `'filled': 'x',`,
        'c.test.ts': `'a': '<expected>',\n'b': '<expected>',`,
      }),
    ).toEqual([
      { file: 'a.test.ts', count: 1 },
      { file: 'c.test.ts', count: 2 },
    ]);
  });
  it('formats the per-file list with a total', () => {
    const out = formatExpectedRemnants([
      { file: 'b.test.ts', count: 2 },
      { file: 'a.test.ts', count: 1 },
    ]);
    expect(out).toContain('a.test.ts: 1');
    expect(out).toContain('b.test.ts: 2');
    expect(out).toContain('total: 3 in 2 file(s)');
  });
  it('formats the zero-remnant message when nothing is left', () => {
    expect(formatExpectedRemnants([])).toMatch(/no '<expected>' remnants/);
  });
});
