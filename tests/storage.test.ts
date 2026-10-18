import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageSaveError, isQuotaExceededError, isReady, loadData, loadLastUsed, migrateData, resolveAddressId, resolveLastId, saveData, saveLastUsed } from '../src/storage';
import { EMPTY_ADDRESS, EMPTY_PROFILE, type StoredData } from '../src/core/types';

let store: Record<string, unknown>;
let uuid = 0;

beforeEach(() => {
  store = {};
  uuid = 0;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
      },
    },
  });
  vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuid}` });
});

const profile = {
  ...EMPTY_PROFILE, id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
};
const ready: StoredData = {
  profiles: [profile],
  addresses: [{
    id: '1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都', city: '千代田区',
    street: '千代田1-1', building: '',
    country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
  }],
};

describe('migrateData', () => {
  it('migrates a legacy single profile to メイン with a stable id', () => {
    const out = migrateData({ profile: { lastName: '山田' }, addresses: [] });
    expect(out.profiles).toHaveLength(1);
    expect(out.profiles[0]).toMatchObject({ label: 'メイン', lastName: '山田' });
    expect(out.profiles[0]?.id).toMatch(/^mig-profile-[0-9a-f]{8}(-[0-9]+)?$/);
    // Deterministic: the same input yields the same id without randomUUID.
    expect(migrateData({ profile: { lastName: '山田' }, addresses: [] }).profiles[0]?.id)
      .toBe(out.profiles[0]?.id);
    expect(out.addresses).toEqual([]);
  });

  it('keeps the new shape as-is with defaults for missing keys', () => {
    const out = migrateData({ profiles: [{ id: 'p9', label: '仕事用', lastName: '山田' }], addresses: [] });
    expect(out.profiles).toEqual([{ ...EMPTY_PROFILE, id: 'p9', label: '仕事用', lastName: '山田' }]);
  });

  it('returns empty lists when nothing is stored', () => {
    expect(migrateData(undefined)).toEqual({ profiles: [], addresses: [] });
  });

  it('falls back mistyped string fields to defaults instead of injecting them', () => {
    const corrupted = JSON.parse(
      '{"profiles":[{"id":"p1","label":"自宅","lastName":42,"tel":["09012345678"],"email":null}],"addresses":[{"id":"a1","label":{},"zip":1000001}]}',
    );
    const out = migrateData(corrupted);
    expect(out.profiles).toEqual([{ ...EMPTY_PROFILE, id: 'p1', label: '自宅' }]);
    expect(out.addresses).toEqual([{ ...EMPTY_ADDRESS, id: 'a1' }]);
  });

  it('reads malformed containers as empty lists without throwing', () => {
    expect(migrateData(JSON.parse('{"profiles":"oops","addresses":{"a":1}}')))
      .toEqual({ profiles: [], addresses: [] });
    expect(migrateData(JSON.parse('{"profile":"oops","addresses":[]}')))
      .toEqual({ profiles: [], addresses: [] });
    expect(migrateData(JSON.parse('{"profiles":[null,42],"addresses":[]}')))
      .toEqual({ profiles: [], addresses: [] });
  });

  it('fills overseas defaults for legacy addresses', () => {
    const out = migrateData({
      addresses: [{
        id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
        city: '千代田区', street: '千代田1-1', building: '',
      }],
    });
    expect(out.addresses).toEqual([{
      ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
      city: '千代田区', street: '千代田1-1', building: '',
    }]);
  });

  it('defaults missing address owner to shared', () => {
    const out = migrateData({
      profiles: [{ id: 'p1', label: '本人' }],
      addresses: [{ id: 'a1', label: '自宅' }],
    });
    expect(out.addresses[0]?.profileId).toBe('');
  });

  it('unlinks addresses of deleted profiles to shared', () => {
    const out = migrateData({
      profiles: [{ id: 'p1', label: '本人' }],
      addresses: [
        { id: 'a1', label: '自宅', profileId: 'p1' },
        { id: 'a2', label: '旧宅', profileId: 'gone' },
      ],
    });
    expect(out.addresses[0]?.profileId).toBe('p1');
    expect(out.addresses[1]?.profileId).toBe('');
  });

  it('derives stable ids for entries missing them instead of random UUIDs (PBI-35)', () => {
    const input = {
      profile: { lastName: '山田' },
      addresses: [{ label: '自宅' }],
    };
    const first = migrateData(input);
    const second = migrateData(input);
    expect(first.profiles[0]?.label).toBe('メイン');
    expect(first.profiles[0]?.id).toBe(second.profiles[0]?.id);
    expect(first.addresses[0]?.id).toBe(second.addresses[0]?.id);
    expect(first.profiles[0]?.id).not.toBe('uuid-1');
    expect(first.addresses[0]?.id).not.toBe('uuid-2');
    expect(first.profiles[0]?.id).not.toBe(first.addresses[0]?.id);
  });

  describe('without crypto.randomUUID', () => {
    it('completes migration with unique ids', () => {
      vi.stubGlobal('crypto', {});
      const out = migrateData({
        profile: { lastName: '山田' },
        addresses: [{ label: '自宅' }, { label: '会社' }],
      });
      expect(out.profiles[0]?.label).toBe('メイン');
      const ids = [out.profiles[0]?.id, ...out.addresses.map((a) => a.id)];
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps existing ids and links', () => {
      vi.stubGlobal('crypto', {});
      const out = migrateData({
        profiles: [{ id: 'p1', label: '本人' }],
        addresses: [
          { id: 'a1', label: '自宅', profileId: 'p1' },
          { id: 'a2', label: '旧宅', profileId: 'gone' },
        ],
      });
      expect(out.profiles[0]?.id).toBe('p1');
      expect(out.addresses[0]?.id).toBe('a1');
      expect(out.addresses[0]?.profileId).toBe('p1');
      expect(out.addresses[1]?.id).toBe('a2');
      expect(out.addresses[1]?.profileId).toBe('');
    });
  });
});

describe('migration id stability (PBI-35)', () => {
  const legacy = {
    profile: { lastName: '山田', firstName: '太郎' },
    addresses: [{ label: '自宅', zip: '1000001' }],
  };

  it('returns the same ids on two consecutive loads without an intermediate save', async () => {
    store['jushoai:data'] = legacy;
    const first = await loadData();
    const second = await loadData();
    expect(first.profiles[0]?.id).not.toBe('');
    expect(first.addresses[0]?.id).not.toBe('');
    expect(second).toEqual(first);
  });

  it('keeps ids stable across save and reload so the last selection still resolves', async () => {
    store['jushoai:data'] = legacy;
    const first = await loadData();
    await saveData(first);
    const reloaded = await loadData();
    expect(reloaded.profiles.map((p) => p.id)).toEqual(first.profiles.map((p) => p.id));
    expect(reloaded.addresses.map((a) => a.id)).toEqual(first.addresses.map((a) => a.id));
    const ids = reloaded.profiles.map((p) => p.id);
    expect(resolveLastId(ids[0], ids)).toBe(ids[0]);
    // An unknown stored id falls back the same way on every load.
    expect(resolveLastId('gone', reloaded.profiles.map((p) => p.id))).toBeUndefined();
    expect(resolveLastId('gone', (await loadData()).profiles.map((p) => p.id))).toBeUndefined();
  });

  it('leaves existing ids untouched across repeated loads', async () => {
    await saveData(ready);
    expect(await loadData()).toEqual(ready);
    expect(await loadData()).toEqual(ready);
  });
});

describe('resolveAddressId', () => {
  const shared = { ...EMPTY_ADDRESS, id: 'shared', label: '共通' };
  const home = { ...EMPTY_ADDRESS, id: 'home', label: '自宅', profileId: 'p1' };
  const office = { ...EMPTY_ADDRESS, id: 'office', label: '会社', profileId: 'p2' };

  it('keeps the preferred address when shared or linked', () => {
    expect(resolveAddressId([shared, home], 'p1', 'shared')).toBe('shared');
    expect(resolveAddressId([shared, home], 'p1', 'home')).toBe('home');
  });

  it('falls back to a linked address when preferred belongs elsewhere', () => {
    expect(resolveAddressId([office, home], 'p1', 'office')).toBe('home');
  });

  it('falls back to the first address when nothing is linked', () => {
    expect(resolveAddressId([office, home], 'p9')).toBe('office');
  });
});

describe('storage', () => {
  it('round-trips data', async () => {
    await saveData(ready);
    expect(await loadData()).toEqual(ready);
  });
});

describe('lastUsed', () => {
  it('round-trips the last used ids', async () => {
    await saveLastUsed({ profileId: 'p2', addressId: 'a2' });
    expect(await loadLastUsed()).toEqual({ profileId: 'p2', addressId: 'a2' });
  });

  it('returns empty when nothing is stored', async () => {
    expect(await loadLastUsed()).toEqual({});
  });

  it('drops non-string ids', async () => {
    store['jushoai:last'] = { profileId: 42, addressId: '' };
    expect(await loadLastUsed()).toEqual({});
  });
});

describe('resolveLastId', () => {
  it('prefers the stored id when it still exists', () => {
    expect(resolveLastId('p2', ['p1', 'p2'])).toBe('p2');
  });

  it('returns undefined when the stored profile was deleted', () => {
    expect(resolveLastId('p9', ['p1', 'p2'])).toBeUndefined();
    expect(resolveLastId(undefined, ['p1'])).toBeUndefined();
  });
});

describe('saveData guard (PBI-23)', () => {
  it('propagates QUOTA failures as StorageSaveError instead of succeeding silently', async () => {
    const quota = new Error('QUOTA_BYTES quota exceeded');
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          set: async () => { throw quota; },
        },
      },
    });
    const err = await saveData(ready).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(StorageSaveError);
    expect((err as StorageSaveError).cause).toBe(quota);
    expect(isQuotaExceededError(err)).toBe(true);
    expect(isQuotaExceededError(quota)).toBe(true);
    expect(isQuotaExceededError(new Error('boom'))).toBe(false);
  });

  it('propagates saveLastUsed failures as StorageSaveError', async () => {
    const failure = new Error('QUOTA_BYTES quota exceeded');
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          set: async () => { throw failure; },
        },
      },
    });
    await expect(saveLastUsed({ profileId: 'p1' })).rejects.toBeInstanceOf(StorageSaveError);
  });

  it('keeps both additions when two contexts save concurrently', async () => {
    const base = await loadData();
    const ctxA: StoredData = {
      ...base,
      profiles: [...base.profiles, { ...EMPTY_PROFILE, id: 'pA', label: 'A' }],
    };
    const ctxB: StoredData = {
      ...base,
      profiles: [...base.profiles, { ...EMPTY_PROFILE, id: 'pB', label: 'B' }],
    };
    await saveData(ctxA);
    await saveData(ctxB);
    const reloaded = await loadData();
    expect(reloaded.profiles.map((p) => p.id).sort()).toEqual(['pA', 'pB']);
  });

  it('merges concurrent address additions as well', async () => {
    const base = await loadData();
    const addrA = { ...EMPTY_ADDRESS, id: 'aA', label: '実家' };
    const addrB = { ...EMPTY_ADDRESS, id: 'aB', label: '会社' };
    await saveData({ ...base, addresses: [...base.addresses, addrA] });
    await saveData({ ...base, addresses: [...base.addresses, addrB] });
    const reloaded = await loadData();
    expect(reloaded.addresses.map((a) => a.id).sort()).toEqual(['aA', 'aB']);
  });

  it('lets the incoming entry win when both sides edit the same id', async () => {
    await saveData({ profiles: [{ ...profile, lastName: '旧' }], addresses: [] });
    await saveData({ profiles: [{ ...profile, lastName: '新' }], addresses: [] });
    const reloaded = await loadData();
    expect(reloaded.profiles).toHaveLength(1);
    expect(reloaded.profiles[0]?.lastName).toBe('新');
  });

  it('still saves when the pre-write re-read fails', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async () => { throw new Error('read failed'); },
          set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
        },
      },
    });
    await saveData(ready);
    expect(store['jushoai:data']).toEqual(ready);
  });
});

describe('coerceStrings warn (PBI-29)', () => {
  it('warns the coerced keys when mistyped values fall back to defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const corrupted = JSON.parse(
        '{"profiles":[{"id":"p1","label":"自宅","lastName":42,"tel":["09012345678"],"email":null}],"addresses":[{"id":"a1","label":{},"zip":1000001}]}',
      );
      const out = migrateData(corrupted);
      // 矯正の振る舞いは維持: 既定値に戻り、起動は壊れない。
      expect(out.profiles).toEqual([{ ...EMPTY_PROFILE, id: 'p1', label: '自宅' }]);
      expect(out.addresses).toEqual([{ ...EMPTY_ADDRESS, id: 'a1' }]);
      // 矯正キー一覧がwarnで通知される。
      expect(warn).toHaveBeenCalled();
      const messages = warn.mock.calls.map((args) => String(args[0]).length > 0 ? String(args[0]) : '').join('\n');
      expect(messages).toMatch(/lastName/);
      expect(messages).toMatch(/zip/);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('stays silent on a clean load without coercion', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = migrateData({ profiles: [{ id: 'p9', label: '仕事用', lastName: '山田' }], addresses: [] });
      expect(out.profiles).toEqual([{ ...EMPTY_PROFILE, id: 'p9', label: '仕事用', lastName: '山田' }]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe('isReady', () => {
  it('requires a valid profile and at least one address', () => {
    expect(isReady(ready)).toBe(true);
    expect(isReady({ ...ready, addresses: [] })).toBe(false);
    expect(isReady({ ...ready, profiles: [EMPTY_PROFILE] })).toBe(false);
    expect(isReady({ ...ready, profiles: [] })).toBe(false);
  });
});
