import { describe, it, expect } from 'vitest';
import {
  EXCLUDED_URLS_MAX, EXCLUSION_ENTRY_MAX_LENGTH, addExclusionEntry, isExcludedUrl,
  mergeExcludedEntries, normalizeExclusionEntry, parseExcludedUrls, removeExclusionEntry,
} from '../../src/core/exclusions';

describe('normalizeExclusionEntry', () => {
  it('keeps an http(s) prefix and trims surrounding whitespace', () => {
    expect(normalizeExclusionEntry('  https://docs.google.com/spreadsheets/  ')).toEqual({
      ok: true,
      value: 'https://docs.google.com/spreadsheets/',
    });
    expect(normalizeExclusionEntry('http://example.com/a')).toEqual({ ok: true, value: 'http://example.com/a' });
  });

  it('canonicalizes the origin so matching is case-insensitive', () => {
    expect(normalizeExclusionEntry('HTTPS://Docs.Google.COM/Sheets')).toEqual({
      ok: true,
      value: 'https://docs.google.com/Sheets',
    });
  });

  it('accepts a bare origin, which excludes the whole site', () => {
    expect(normalizeExclusionEntry('https://docs.google.com')).toEqual({ ok: true, value: 'https://docs.google.com/' });
  });

  it('rejects empty, scheme-less and non-http schemes', () => {
    for (const raw of ['', '   ', 'docs.google.com', 'javascript:alert(1)', 'ftp://example.com', 'chrome://extensions']) {
      const result = normalizeExclusionEntry(raw);
      expect(result.ok, raw).toBe(false);
    }
  });

  it('rejects a scheme without a host and a malformed URL', () => {
    expect(normalizeExclusionEntry('https://').ok).toBe(false);
    expect(normalizeExclusionEntry('https://exa mple.com/').ok).toBe(false);
  });

  it('rejects an entry longer than the cap', () => {
    const long = `https://example.com/${'a'.repeat(EXCLUSION_ENTRY_MAX_LENGTH)}`;
    const result = normalizeExclusionEntry(long);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(String(EXCLUSION_ENTRY_MAX_LENGTH));
  });
});

describe('isExcludedUrl', () => {
  const entries = ['https://docs.google.com/spreadsheets/'];

  it('matches a URL that starts with the entry, including the entry itself', () => {
    expect(isExcludedUrl('https://docs.google.com/spreadsheets/', entries)).toBe(true);
    expect(isExcludedUrl('https://docs.google.com/spreadsheets/d/abc/edit#gid=0', entries)).toBe(true);
  });

  it('does not match a sibling path or a longer host', () => {
    expect(isExcludedUrl('https://docs.google.com/document/d/abc', entries)).toBe(false);
    expect(isExcludedUrl('https://docs.google.com/spreadsheets.example.com/', entries)).toBe(false);
  });

  it('ignores case on both sides', () => {
    expect(isExcludedUrl('HTTPS://DOCS.GOOGLE.COM/SPREADSHEETS/d/1', entries)).toBe(true);
  });

  it('is false for an empty list or a missing URL', () => {
    expect(isExcludedUrl('https://docs.google.com/spreadsheets/', [])).toBe(false);
    expect(isExcludedUrl('', entries)).toBe(false);
  });

  it('does not treat a matching host with another scheme as excluded', () => {
    expect(isExcludedUrl('http://docs.google.com/spreadsheets/', entries)).toBe(false);
  });
});

// PBI-239: matching is component-based (origin equality + path segment
// boundary), not a raw string prefix.
describe('isExcludedUrl: path boundary (PBI-239)', () => {
  const exact = ['https://shared-host/pay'];

  it('does not match sibling paths of an entry without a trailing slash', () => {
    expect(isExcludedUrl('https://shared-host/payment', exact)).toBe(false);
    expect(isExcludedUrl('https://shared-host/pay-admin', exact)).toBe(false);
  });

  it('matches the registered page and its subpaths', () => {
    expect(isExcludedUrl('https://shared-host/pay', exact)).toBe(true);
    expect(isExcludedUrl('https://shared-host/pay/', exact)).toBe(true);
    expect(isExcludedUrl('https://shared-host/pay/detail?x=1', exact)).toBe(true);
    expect(isExcludedUrl('https://other-host/pay', exact)).toBe(false);
  });

  it('treats the query as its own boundary and ignores the fragment', () => {
    expect(isExcludedUrl('https://shared-host/pay?x=1', exact)).toBe(true);
    expect(isExcludedUrl('https://shared-host/pay#top', exact)).toBe(true);
    const withQuery = ['https://shared-host/form?a=1'];
    expect(isExcludedUrl('https://shared-host/form?a=1&b=2', withQuery)).toBe(true);
    expect(isExcludedUrl('https://shared-host/form?a=12', withQuery)).toBe(false);
    expect(isExcludedUrl('https://shared-host/form?b=2&a=1', withQuery)).toBe(false);
    expect(isExcludedUrl('https://shared-host/form/step?a=1', withQuery)).toBe(false);
  });

  it('keeps the trailing slash as the subtree boundary', () => {
    const dir = ['https://shared-host/pay/'];
    expect(isExcludedUrl('https://shared-host/pay/', dir)).toBe(true);
    expect(isExcludedUrl('https://shared-host/pay/detail', dir)).toBe(true);
    expect(isExcludedUrl('https://shared-host/pay', dir)).toBe(false);
    expect(isExcludedUrl('https://shared-host/payment', dir)).toBe(false);
  });
});

describe('addExclusionEntry', () => {
  it('appends a normalized entry', () => {
    const result = addExclusionEntry([], ' https://docs.google.com/spreadsheets/ ');
    expect(result).toEqual({ ok: true, entries: ['https://docs.google.com/spreadsheets/'] });
  });

  it('rejects a duplicate regardless of case and trailing whitespace', () => {
    const result = addExclusionEntry(['https://docs.google.com/spreadsheets/'], 'HTTPS://docs.google.com/SPREADSHEETS/');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/登録/);
  });

  it('rejects an invalid value without changing the list', () => {
    const result = addExclusionEntry(['https://a.example/'], 'not-a-url');
    expect(result.ok).toBe(false);
  });

  it('rejects an addition past the cap', () => {
    const full = Array.from({ length: EXCLUDED_URLS_MAX }, (_, i) => `https://example.com/${i}`);
    const result = addExclusionEntry(full, 'https://example.com/one-more');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(String(EXCLUDED_URLS_MAX));
  });
});

// PBI-241: options save merges boot→draft diff into the store's current
// content: final = (current ∪ draft-additions) − draft-removals.
describe('mergeExcludedEntries', () => {
  it('keeps a registration another writer added after boot', () => {
    const merged = mergeExcludedEntries({
      boot: ['https://a.example/'],
      draft: ['https://a.example/', 'https://draft.example/'],
      current: ['https://a.example/', 'https://quick.example/'],
    });
    expect(merged).toEqual(['https://a.example/', 'https://quick.example/', 'https://draft.example/']);
  });

  it('removes a draft-deleted entry even when current still has it', () => {
    const merged = mergeExcludedEntries({
      boot: ['https://a.example/', 'https://gone.example/'],
      draft: ['https://a.example/'],
      current: ['https://a.example/', 'https://gone.example/', 'https://quick.example/'],
    });
    expect(merged).toEqual(['https://a.example/', 'https://quick.example/']);
  });

  it('does not resurrect an untouched entry that current no longer has', () => {
    const merged = mergeExcludedEntries({
      boot: ['https://a.example/', 'https://dropped.example/'],
      draft: ['https://a.example/', 'https://dropped.example/'],
      current: ['https://a.example/'],
    });
    expect(merged).toEqual(['https://a.example/']);
  });

  it('treats case-insensitive duplicates as one entry, current first', () => {
    const merged = mergeExcludedEntries({
      boot: [],
      draft: ['HTTPS://A.EXAMPLE/'],
      current: ['https://a.example/'],
    });
    expect(merged).toEqual(['https://a.example/']);
  });

  it('applies the cap once after the merge, keeping the newest entries', () => {
    const current = Array.from({ length: EXCLUDED_URLS_MAX }, (_, i) => `https://example.com/${i}`);
    const merged = mergeExcludedEntries({
      boot: current.slice(0, 10),
      draft: [...current.slice(0, 10), 'https://example.com/new'],
      current,
    });
    expect(merged).toHaveLength(EXCLUDED_URLS_MAX);
    expect(merged[EXCLUDED_URLS_MAX - 1]).toBe('https://example.com/new');
  });

  it('merges into an empty boot after a failed page load', () => {
    const merged = mergeExcludedEntries({
      boot: [],
      draft: ['https://draft.example/'],
      current: ['https://quick.example/'],
    });
    expect(merged).toEqual(['https://quick.example/', 'https://draft.example/']);
  });
});

describe('removeExclusionEntry', () => {
  it('removes the exact entry and leaves the rest in order', () => {
    const entries = ['https://a.example/', 'https://b.example/'];
    expect(removeExclusionEntry(entries, 'https://a.example/')).toEqual(['https://b.example/']);
  });

  it('is a no-op for an unknown value', () => {
    expect(removeExclusionEntry(['https://a.example/'], 'https://c.example/')).toEqual(['https://a.example/']);
  });

  it('removes one entry from a full list without a cap check, keeping the rest in order (PBI-244)', () => {
    const full = Array.from({ length: EXCLUDED_URLS_MAX }, (_, i) => `https://example.com/${i}`);
    const next = removeExclusionEntry(full, 'https://example.com/50');
    expect(next).toHaveLength(EXCLUDED_URLS_MAX - 1);
    expect(next).not.toContain('https://example.com/50');
    expect(next[0]).toBe('https://example.com/0');
    expect(next[EXCLUDED_URLS_MAX - 2]).toBe(`https://example.com/${EXCLUDED_URLS_MAX - 1}`);
  });
});

describe('parseExcludedUrls', () => {
  it('keeps only valid string entries and drops duplicates', () => {
    expect(parseExcludedUrls([
      'https://a.example/',
      'not-a-url',
      42,
      null,
      'HTTPS://A.EXAMPLE/',
      'https://b.example/',
    ])).toEqual(['https://a.example/', 'https://b.example/']);
  });

  it('reads a non-array as an empty list so a corrupted store cannot break start-up', () => {
    for (const raw of [undefined, null, 'https://a.example/', { 0: 'https://a.example/' }]) {
      expect(parseExcludedUrls(raw)).toEqual([]);
    }
  });

  it('caps the list at the maximum', () => {
    const raw = Array.from({ length: EXCLUDED_URLS_MAX + 5 }, (_, i) => `https://example.com/${i}`);
    expect(parseExcludedUrls(raw)).toHaveLength(EXCLUDED_URLS_MAX);
  });

  it('drops the fragment from stored entries so legacy registrations read under the current rule (PBI-239)', () => {
    expect(parseExcludedUrls(['https://shared-host/form?a=1#top'])).toEqual(['https://shared-host/form?a=1']);
    expect(parseExcludedUrls(['https://x/form?a=1#top', 'https://x/form?a=1'])).toEqual(['https://x/form?a=1']);
  });

  it('keeps legacy shapes excluding their pages (v0.1.29-0.1.37 compatibility)', () => {
    const stored = parseExcludedUrls(['https://Shared-Host/pay', 'https://docs.google.com']);
    expect(stored).toEqual(['https://shared-host/pay', 'https://docs.google.com/']);
    expect(isExcludedUrl('https://shared-host/pay', stored)).toBe(true);
    expect(isExcludedUrl('https://shared-host/pay/detail', stored)).toBe(true);
    expect(isExcludedUrl('https://shared-host/payment', stored)).toBe(false);
    expect(isExcludedUrl('https://docs.google.com/spreadsheets/x', stored)).toBe(true);
  });
});
