import { describe, it, expect } from 'vitest';
import { parseAssignments } from '../src/assignment-store';

describe('parseAssignments (PBI-141)', () => {
  it('reads valid pairs and drops junk', () => {
    expect(parseAssignments({
      'e.com': 'p1',
      'empty.com': '',
      'junk.com': 3,
      'null.com': null,
    })).toEqual({ 'e.com': 'p1' });
  });

  it('reads a missing, corrupted or hand-edited value as an empty map', () => {
    expect(parseAssignments(undefined)).toEqual({});
    expect(parseAssignments(null)).toEqual({});
    expect(parseAssignments('junk')).toEqual({});
    expect(parseAssignments(['p1'])).toEqual({});
  });
});

describe('upsertAssignment (PBI-141)', () => {
  it('moves the host to the end and caps at ASSIGNMENTS_MAX', async () => {
    let store: Record<string, unknown> = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (obj: Record<string, unknown>) => { store = { ...store, ...obj }; },
        },
      },
    } as typeof chrome;
    const { upsertAssignment, saveAssignments, loadAssignments, ASSIGNMENTS_MAX } = await import('../src/assignment-store');
    for (let i = 0; i < ASSIGNMENTS_MAX + 3; i += 1) {
      await saveAssignments({ [`d${i}.com`]: 'p0' });
    }
    await upsertAssignment('d0.com', 'p1');
    const loaded = await loadAssignments();
    expect(Object.keys(loaded).length).toBeLessThanOrEqual(ASSIGNMENTS_MAX);
    expect(loaded['d0.com']).toBe('p1');
    expect(loaded['d1.com']).toBeUndefined();
    expect(Object.keys(loaded)[Object.keys(loaded).length - 1]).toBe('d0.com');
  });

  it('ignores an empty host', async () => {
    let setCalls = 0;
    globalThis.chrome = {
      storage: {
        local: {
          get: async () => ({}),
          set: async () => { setCalls += 1; },
        },
      },
    } as unknown as typeof chrome;
    const { upsertAssignment } = await import('../src/assignment-store');
    await upsertAssignment('', 'p1');
    expect(setCalls).toBe(0);
  });

  // PBI-153: a failed write must surface as a typed error the caller can
  // identify, not a raw chrome.storage rejection.
  describe('upsertAssignment write failure (PBI-153)', () => {
    it('reports a failed write as a typed error, not a raw rejection', async () => {
      globalThis.chrome = {
        storage: {
          local: {
            get: async () => ({}),
            set: async () => { throw new Error('quota exceeded'); },
          },
        },
      } as unknown as typeof chrome;
      const { upsertAssignment } = await import('../src/assignment-store');
      const { KvStoreSaveError } = await import('../src/kv-store');
      await expect(upsertAssignment('d.com', 'p1')).rejects.toBeInstanceOf(KvStoreSaveError);
    });
  });
});
