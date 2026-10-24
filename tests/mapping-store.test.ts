import { describe, it, expect } from 'vitest';
import { parseMappings } from '../src/mapping-store';

describe('parseMappings (PBI-138)', () => {
  it('reads valid pairs and drops junk', () => {
    expect(parseMappings([
      { domain: 'e.com', fieldKey: 'xyz', category: 'email' },
      { domain: '', fieldKey: 'xyz', category: 'email' },
      { domain: 'e.com', fieldKey: '', category: 'email' },
      { domain: 'e.com', fieldKey: 'xyz', category: 'unknown' },
      { domain: 'e.com', fieldKey: 'xyz', category: 'not-a-category' },
      'junk',
      null,
    ])).toEqual([{ domain: 'e.com', fieldKey: 'xyz', category: 'email' }]);
  });

  it('reads a missing, corrupted or hand-edited value as an empty list', () => {
    expect(parseMappings(undefined)).toEqual([]);
    expect(parseMappings(null)).toEqual([]);
    expect(parseMappings({ domain: 'e.com' })).toEqual([]);
    expect(parseMappings('junk')).toEqual([]);
  });

  // PBI-153: a failed write must surface as a typed error the caller can
  // identify, not a raw chrome.storage rejection.
  describe('upsertMapping write failure (PBI-153)', () => {
    it('reports a failed write as a typed error, not a raw rejection', async () => {
      globalThis.chrome = {
        storage: {
          local: {
            get: async () => ({}),
            set: async () => { throw new Error('quota exceeded'); },
          },
        },
      } as unknown as typeof chrome;
      const { upsertMapping } = await import('../src/mapping-store');
      const { KvStoreSaveError } = await import('../src/kv-store');
      await expect(upsertMapping({ domain: 'd.com', fieldKey: 'k', category: 'email' }))
        .rejects.toBeInstanceOf(KvStoreSaveError);
    });
  });
});
