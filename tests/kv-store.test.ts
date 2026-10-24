import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  capKeys, capTail, KvStoreReadError, KvStoreSaveError, readKv, upsertKv, writeKv,
  type KvSpec,
} from '../src/kv-store';

// PBI-153: the one store module for the small chrome.storage-backed stores.
// It owns key -> load/save/upsert/parse/cap and the typed error mode; the
// learning stores are adapters that supply key, cap, and parse.

let store: Record<string, unknown>;
let getShouldFail: Error | null;
let setShouldFail: Error | null;

const parseList = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((v) => typeof v === 'string') : []);
const parseMap = (raw: unknown): Record<string, string> => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
};

beforeEach(() => {
  store = {};
  getShouldFail = null;
  setShouldFail = null;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => {
          if (getShouldFail) throw getShouldFail;
          return key in store ? { [key]: store[key] } : {};
        },
        set: async (obj: Record<string, unknown>) => {
          if (setShouldFail) throw setShouldFail;
          Object.assign(store, obj);
        },
      },
    },
  });
});

describe('kv-store typed error mode (PBI-153)', () => {
  it('reports a failed read as KvStoreReadError, not a raw rejection', async () => {
    getShouldFail = new Error('storage unavailable');
    await expect(readKv({ key: 'k', parse: parseList })).rejects.toBeInstanceOf(KvStoreReadError);
  });

  it('reports a failed write as KvStoreSaveError, not a raw rejection', async () => {
    setShouldFail = new Error('quota exceeded');
    await expect(writeKv({ key: 'k', parse: parseList }, ['a'])).rejects.toBeInstanceOf(KvStoreSaveError);
  });

  it('keeps the raw failure as the cause of the typed error', async () => {
    setShouldFail = new Error('quota exceeded');
    const err: unknown = await writeKv({ key: 'k', parse: parseList }, ['a']).catch((e) => e);
    expect(err).toBeInstanceOf(KvStoreSaveError);
    expect((err as KvStoreSaveError).cause).toBe(setShouldFail);
  });

  it('parses the stored value at the load boundary', async () => {
    store['k'] = ['a', 42];
    expect(await readKv({ key: 'k', parse: parseList })).toEqual(['a']);
  });

  it('reports a failed upsert read through the typed read error', async () => {
    getShouldFail = new Error('storage unavailable');
    await expect(upsertKv({ key: 'k', parse: parseMap }, (all) => all)).rejects.toBeInstanceOf(KvStoreReadError);
  });
});

describe('kv-store cap ownership (PBI-153)', () => {
  it('applies the cap before every write', async () => {
    const spec: KvSpec<Record<string, string>> = {
      key: 'k', parse: parseMap, cap: (value) => capKeys(value, 2),
    };
    await writeKv(spec, { a: '1', b: '2', c: '3' });
    expect(store['k']).toEqual({ b: '2', c: '3' });
  });

  it('runs upsert as load -> merge -> write with the cap applied', async () => {
    const spec: KvSpec<Record<string, string>> = {
      key: 'k', parse: parseMap, cap: (value) => capKeys(value, 2),
    };
    await writeKv(spec, { a: '1', b: '2' });
    await upsertKv(spec, (all) => ({ ...all, c: '3' }));
    expect(store['k']).toEqual({ b: '2', c: '3' });
  });

  it('reports a failed upsert write through the typed save error', async () => {
    setShouldFail = new Error('quota exceeded');
    const spec: KvSpec<Record<string, string>> = {
      key: 'k', parse: parseMap, cap: (value) => capKeys(value, 2),
    };
    await expect(upsertKv(spec, (all) => ({ ...all, c: '3' }))).rejects.toBeInstanceOf(KvStoreSaveError);
  });
});

describe('cap helpers (PBI-153)', () => {
  it('capKeys keeps the last max keys in insertion order', () => {
    expect(capKeys({ a: 1, b: 2, c: 3 }, 2)).toEqual({ b: 2, c: 3 });
    expect(capKeys({ a: 1 }, 2)).toEqual({ a: 1 });
  });

  it('capTail keeps the last max entries in order', () => {
    expect(capTail([1, 2, 3], 2)).toEqual([2, 3]);
    expect(capTail([1], 2)).toEqual([1]);
  });
});
