import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KvStoreReadError } from '../../src/kv-store';
import { loadFillOneState, loadRunState } from '../../src/content/flow-state';
import { EMPTY_PROFILE } from '../../src/core/types';

// PBI-159: the flow-unit state bundles. Each entry used to hand-assemble its
// own read bundle (run(): 5 keys across 4 modules; fillOne: 3 keys). The
// loaders return one bundle per flow behind one batched get([keys...]) call.

let store: Record<string, unknown>;
let getCalls: string[][];
let getShouldFail: Error | null;

const setup = (): void => {
  store = {};
  getCalls = [];
  getShouldFail = null;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          getCalls.push([...list]);
          if (getShouldFail) throw getShouldFail;
          const out: Record<string, unknown> = {};
          for (const k of list) if (k in store) out[k] = store[k];
          return out;
        },
        set: async () => {},
      },
    },
  });
};

beforeEach(setup);

describe('loadRunState (PBI-159)', () => {
  it('returns the flow bundle from one batched get call', async () => {
    const profile = { ...EMPTY_PROFILE, id: 'p1', label: '自宅', lastName: '山田' };
    store['jushoai:data'] = { profiles: [profile], addresses: [] };
    store['jushoai:last'] = { profileId: 'p1', addressId: 'a1' };
    store['jushoai:site-approvals'] = {
      'e.jp': { domain: 'e.jp', signature: 'sig', profileId: 'p1', addressId: 'a1', digests: { f1: 'd1' } },
    };
    store['jushoai:site-profile-assignments'] = { 'e.jp': 'p1' };
    store['jushoai:field-mappings'] = [{ domain: 'e.jp', fieldKey: 'xyz', category: 'email' }];

    const got = await loadRunState();

    // One get call carrying the whole flow's keys — not one call per store.
    expect(getCalls.length).toBe(1);
    expect([...getCalls[0]!].sort()).toEqual([
      'jushoai:data',
      'jushoai:field-mappings',
      'jushoai:last',
      'jushoai:site-approvals',
      'jushoai:site-profile-assignments',
    ]);
    expect(got.data.profiles.map((p) => p.id)).toEqual(['p1']);
    expect(got.last).toEqual({ profileId: 'p1', addressId: 'a1' });
    expect(Object.keys(got.priorApprovals)).toEqual(['e.jp']);
    expect(got.assignments).toEqual({ 'e.jp': 'p1' });
    expect(got.activeMappings.map((m) => m.fieldKey)).toEqual(['xyz']);
    // The bundle is exactly the run flow's state: nothing else leaks through.
    expect(Object.keys(got).sort()).toEqual([
      'activeMappings', 'assignments', 'data', 'last', 'priorApprovals',
    ]);
  });

  it('reads corrupted stored values as empty instead of failing', async () => {
    store['jushoai:data'] = 'broken';
    store['jushoai:last'] = 'broken';
    store['jushoai:site-approvals'] = 'broken';
    store['jushoai:site-profile-assignments'] = 'broken';
    store['jushoai:field-mappings'] = 'broken';

    const got = await loadRunState();

    expect(got.data.profiles).toEqual([]);
    expect(got.last).toEqual({});
    expect(got.priorApprovals).toEqual({});
    expect(got.assignments).toEqual({});
    expect(got.activeMappings).toEqual([]);
  });

  it('reports a failed batch read as KvStoreReadError', async () => {
    getShouldFail = new Error('storage unavailable');
    await expect(loadRunState()).rejects.toBeInstanceOf(KvStoreReadError);
  });
});

describe('loadFillOneState (PBI-159)', () => {
  it('returns the fill-one bundle from one batched get call', async () => {
    store['jushoai:data'] = { profiles: [{ ...EMPTY_PROFILE, id: 'p1' }], addresses: [] };
    store['jushoai:last'] = { profileId: 'p1' };
    store['jushoai:field-mappings'] = [{ domain: 'e.jp', fieldKey: 'xyz', category: 'email' }];

    const got = await loadFillOneState();

    expect(getCalls.length).toBe(1);
    expect([...getCalls[0]!].sort()).toEqual([
      'jushoai:data', 'jushoai:field-mappings', 'jushoai:last',
    ]);
    expect(got.data.profiles.map((p) => p.id)).toEqual(['p1']);
    expect(got.last).toEqual({ profileId: 'p1' });
    expect(got.mappings.map((m) => m.fieldKey)).toEqual(['xyz']);
    // The bundle is exactly the fill-one flow's state.
    expect(Object.keys(got).sort()).toEqual(['data', 'last', 'mappings']);
  });

  it('reports a failed batch read as KvStoreReadError', async () => {
    getShouldFail = new Error('storage unavailable');
    await expect(loadFillOneState()).rejects.toBeInstanceOf(KvStoreReadError);
  });
});
