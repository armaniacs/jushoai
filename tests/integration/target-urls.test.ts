import { describe, it, expect } from 'vitest';
import { parseRegistry } from '../../scripts/sync-target-urls.mjs';
import registry from '../target-url.md?raw';
import testSource from './samples.test.ts?raw';

// Every URL in the registry must resolve to a wired fixture: the mapping exists
// and samples.test.ts references the fixture file.
describe('target-url registry', () => {
  const entries = parseRegistry(registry);
  it('lists at least one URL', () => {
    expect(entries.length).toBeGreaterThan(0);
  });
  for (const { url, file } of entries) {
    it(`${url} has a wired fixture`, () => {
      expect(file, `run node scripts/sync-target-urls.mjs for ${url}`).toBeTruthy();
      expect(testSource).toContain(`from '../../samples/${file}?raw'`);
      expect(testSource).toContain(`'${file}'`);
    });
  }
});
