import { describe, it, expect } from 'vitest';
import {
  EXCLUDED_URLS_MAX, EXCLUSION_ENTRY_MAX_LENGTH, addExclusionEntry, isExcludedUrl,
  normalizeExclusionEntry, parseExcludedUrls, removeExclusionEntry,
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

describe('removeExclusionEntry', () => {
  it('removes the exact entry and leaves the rest in order', () => {
    const entries = ['https://a.example/', 'https://b.example/'];
    expect(removeExclusionEntry(entries, 'https://a.example/')).toEqual(['https://b.example/']);
  });

  it('is a no-op for an unknown value', () => {
    expect(removeExclusionEntry(['https://a.example/'], 'https://c.example/')).toEqual(['https://a.example/']);
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
});
