import { describe, it, expect } from 'vitest';
import { parseApprovals } from '../src/approval-store';

describe('parseApprovals (PBI-128)', () => {
  it('reads valid records and drops non-string junk', () => {
    expect(parseApprovals({
      'e.com': {
        domain: 'e.com', signature: '123', profileId: 'p1', addressId: 'a1',
        digests: { f1: 'ab7cd9' },
      },
      'broken.com': { domain: 'broken.com', signature: 3, profileId: 'p1', addressId: 'a1', digests: {} },
      'no-digests.com': { domain: 'x', signature: '1', profileId: 'p1', addressId: 'a1' },
      'junk-digest.com': {
        domain: 'j', signature: '1', profileId: 'p1', addressId: 'a1',
        digests: { f1: 'nope', f2: 2.5, f3: 0 },
      },
      'junk.com': 'not-a-record',
    })).toEqual({
      'e.com': {
        domain: 'e.com', signature: '123', profileId: 'p1', addressId: 'a1',
        digests: { f1: 'ab7cd9' },
      },
      'junk-digest.com': {
        domain: 'junk-digest.com', signature: '1', profileId: 'p1', addressId: 'a1',
        // A non-empty string digest is inert (it never matches, so the preview
        // just stays full); non-string junk still drops.
        digests: { f1: 'nope' },
      },
    });
  });

  it('caps at APPROVALS_MAX and upsert moves the record to the end', async () => {
    let store: Record<string, unknown> = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (obj: Record<string, unknown>) => { store = { ...store, ...obj }; },
        },
      },
    } as typeof chrome;
    const { upsertApproval, saveApprovals, loadApprovals, APPROVALS_MAX } = await import('../src/approval-store');
    const record = (domain: string) => ({
      domain, signature: '1', profileId: 'p1', addressId: 'a1', digests: {},
    });
    for (let i = 0; i < APPROVALS_MAX + 5; i += 1) {
      await saveApprovals({ [`d${i}.com`]: record(`d${i}.com`) });
    }
    await upsertApproval(record('d0.com'));
    const loaded = await loadApprovals();
    expect(Object.keys(loaded).length).toBeLessThanOrEqual(APPROVALS_MAX);
    expect(loaded['d0.com']).toBeDefined();
    // The oldest beyond the cap fell off; the refreshed record survived.
    expect(loaded['d1.com']).toBeUndefined();
    expect(Object.keys(loaded)[Object.keys(loaded).length - 1]).toBe('d0.com');
  });

  it('reads a missing, corrupted or hand-edited value as an empty map', () => {
    expect(parseApprovals(undefined)).toEqual({});
    expect(parseApprovals(null)).toEqual({});
    expect(parseApprovals('junk')).toEqual({});
    expect(parseApprovals(['array'])).toEqual({});
  });

  // PBI-153: a failed write must surface as a typed error the caller can
  // identify, not a raw chrome.storage rejection.
  describe('upsertApproval write failure (PBI-153)', () => {
    it('reports a failed write as a typed error, not a raw rejection', async () => {
      globalThis.chrome = {
        storage: {
          local: {
            get: async () => ({}),
            set: async () => { throw new Error('quota exceeded'); },
          },
        },
      } as unknown as typeof chrome;
      const { upsertApproval } = await import('../src/approval-store');
      const { KvStoreSaveError } = await import('../src/kv-store');
      await expect(upsertApproval({ domain: 'd.com', signature: '1', profileId: 'p1', addressId: 'a1', digests: {} }))
        .rejects.toBeInstanceOf(KvStoreSaveError);
    });
  });
});
