import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ZIP_PREFIX_RANGES } from '../../src/core/zip-dict-data';

// Budget: the prefix table ships inside the content script, so its growth
// lands on every page. The table itself must stay under 200KB, and the
// built content script under 350KB (seed baseline about 134KB measured
// 2026-11-24, plus the 200KB allowance rounded up).
const TABLE_BUDGET = 200 * 1024;
const CONTENT_BUDGET = 350 * 1024;
const DIRS = ['chrome-mv3', 'firefox-mv3'];

const contentScripts = (dir: string): string[] => {
  const d = join('dist', dir, 'content-scripts');
  return readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => join(d, f));
};

describe('zip dictionary size budget', () => {
  it('keeps the prefix table under 200KB of source JSON', () => {
    const bytes = Buffer.byteLength(JSON.stringify(ZIP_PREFIX_RANGES), 'utf8');
    expect(bytes).toBeLessThanOrEqual(TABLE_BUDGET);
  });

  it.each(DIRS)('keeps the %s content script under 350KB', (dir) => {
    const files = contentScripts(dir);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(statSync(f).size).toBeLessThanOrEqual(CONTENT_BUDGET);
    }
  });

  it('keeps the table in lookup shape', () => {
    expect(ZIP_PREFIX_RANGES.length).toBeGreaterThan(0);
    for (const r of ZIP_PREFIX_RANGES) {
      expect(r.lo).toMatch(/^[0-9]{3}$/);
      expect(r.hi).toMatch(/^[0-9]{3}$/);
      expect(r.lo <= r.hi).toBe(true);
      expect(r.prefecture.length).toBeGreaterThan(0);
      expect(typeof r.city).toBe('string');
    }
  });
});
