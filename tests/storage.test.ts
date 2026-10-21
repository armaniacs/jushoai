import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageReadError, StorageSaveError, isQuotaExceededError, isReady, loadData, loadLastUsed, migrateData, resolveAddressId, resolveLastId, saveData, saveImported, saveLastUsed } from '../src/storage';
import { exportTransferFile, importTransferFile } from '../src/transfer';
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

  it('keeps links when an owner-set override supplies storage profile ids', () => {
    const out = migrateData(
      { profiles: [], addresses: [{ id: 'a1', label: '自宅', profileId: 'p1' }] },
      new Set(['p1']),
    );
    expect(out.addresses[0]?.profileId).toBe('p1');
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

const validProfile = (n: number) => ({
  ...EMPTY_PROFILE, id: `p${n}`, label: `P${n}`,
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
});
const validAddress = (n: number) => ({
  ...EMPTY_ADDRESS, id: `a${n}`, label: '自宅', zip: '1000001', prefecture: '東京都',
  city: '千代田区', street: '千代田1-1',
});

describe('transfer (PBI-117)', () => {
  it('round-trips an export into an empty storage', async () => {
    await saveData(ready);
    const json = await exportTransferFile();
    store = {};
    const result = await importTransferFile(json);
    expect(result).toEqual({
      ok: true, profilesAdded: 1, profilesUpdated: 0, addressesAdded: 1, addressesUpdated: 0,
    });
    expect(await loadData()).toEqual(ready);
  });

  it('exports profiles and addresses only, without the last-used state', async () => {
    await saveData(ready);
    await saveLastUsed({ profileId: 'p1', addressId: '1' });
    const parsed = JSON.parse(await exportTransferFile()) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['addresses', 'profiles']);
  });

  it('rejects broken JSON without touching storage', async () => {
    await saveData(ready);
    const result = await importTransferFile('{broken');
    expect(result.ok).toBe(false);
    expect(await loadData()).toEqual(ready);
  });

  it('rejects files without profiles/addresses arrays', async () => {
    await saveData(ready);
    const result = await importTransferFile(JSON.stringify({ foo: [1] }));
    expect(result.ok).toBe(false);
    expect(await loadData()).toEqual(ready);
  });

  it('rejects a file with no entries', async () => {
    await saveData(ready);
    const result = await importTransferFile(JSON.stringify({ profiles: [], addresses: [] }));
    expect(result.ok).toBe(false);
    expect(await loadData()).toEqual(ready);
  });

  it('rejects the whole file when one entry fails validation', async () => {
    await saveData(ready);
    const json = JSON.stringify({
      profiles: [validProfile(1), { ...EMPTY_PROFILE, id: 'pX', label: '壊れた' }],
      addresses: [],
    });
    const result = await importTransferFile(json);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('姓');
    expect(await loadData()).toEqual(ready);
  });

  it('rejects an import that would exceed the cap of 10', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => validProfile(i));
    await saveData({ profiles: ten, addresses: [validAddress(0)] });
    const result = await importTransferFile(JSON.stringify({ profiles: [validProfile(99)], addresses: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('10');
    expect((await loadData()).profiles).toHaveLength(10);
  });

  it('allows an import that updates existing entries at the cap', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => validProfile(i));
    await saveData({ profiles: ten, addresses: [validAddress(0)] });
    const result = await importTransferFile(JSON.stringify({
      profiles: [{ ...validProfile(3), label: '更新' }],
      addresses: [],
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 0, profilesUpdated: 1, addressesAdded: 0, addressesUpdated: 0,
    });
    const reloaded = await loadData();
    expect(reloaded.profiles).toHaveLength(10);
    expect(reloaded.profiles.find((p) => p.id === 'p3')?.label).toBe('更新');
  });

  it('fills missing fields with defaults like the load boundary', async () => {
    const result = await importTransferFile(JSON.stringify({
      profiles: [{
        id: 'pX', label: '最小', lastName: '山田', firstName: '太郎',
        lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
      }],
      addresses: [],
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 1, profilesUpdated: 0, addressesAdded: 0, addressesUpdated: 0,
    });
    expect((await loadData()).profiles[0]).toEqual({
      ...EMPTY_PROFILE, id: 'pX', label: '最小', lastName: '山田', firstName: '太郎',
      lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    });
  });

  it('falls mistyped fields back to defaults and rejects the entry', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await saveData(ready);
      const result = await importTransferFile(JSON.stringify({
        profiles: [{ id: 'pX', label: '矯正', lastName: 42 }],
        addresses: [],
      }));
      expect(result.ok).toBe(false);
      expect(await loadData()).toEqual(ready);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('assigns deterministic ids to entries missing one and re-imports as an update', async () => {
    const json = JSON.stringify({
      profiles: [{ label: 'id なし', lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ' }],
      addresses: [],
    });
    const result = await importTransferFile(json);
    expect(result).toEqual({
      ok: true, profilesAdded: 1, profilesUpdated: 0, addressesAdded: 0, addressesUpdated: 0,
    });
    const firstId = (await loadData()).profiles[0]?.id;
    expect(firstId).toMatch(/^mig-profile-[0-9a-f]{8}(-[0-9]+)?$/);
    await importTransferFile(json);
    const reloaded = await loadData();
    expect(reloaded.profiles).toHaveLength(1);
    expect(reloaded.profiles[0]?.id).toBe(firstId);
  });

  it('unlinks imported addresses whose owner is not in the file', async () => {
    const result = await importTransferFile(JSON.stringify({
      profiles: [],
      addresses: [{
        id: 'aX', label: '自宅', profileId: 'gone', zip: '1000001', prefecture: '東京都',
        city: '千代田区', street: '千代田1-1',
      }],
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 0, profilesUpdated: 0, addressesAdded: 1, addressesUpdated: 0,
    });
    expect((await loadData()).addresses[0]?.profileId).toBe('');
  });

  it('normalizes hand-edited values before validating', async () => {
    const result = await importTransferFile(JSON.stringify({
      profiles: [{
        id: 'pX', label: '整形', lastName: ' 山田 ', firstName: '太郎',
        lastNameKana: 'やまだ', firstNameKana: 'たろう', birthday: '1990/5/7',
      }],
      addresses: [],
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 1, profilesUpdated: 0, addressesAdded: 0, addressesUpdated: 0,
    });
    const p = (await loadData()).profiles[0];
    expect(p?.birthday).toBe('1990-05-07');
    expect(p?.lastNameKana).toBe('ヤマダ');
    expect(p?.lastName).toBe('山田');
  });

  it('drops non-object entries like the load boundary', async () => {
    const result = await importTransferFile(JSON.stringify({
      profiles: [42, null],
      addresses: [validAddress(0)],
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 0, profilesUpdated: 0, addressesAdded: 1, addressesUpdated: 0,
    });
    const reloaded = await loadData();
    expect(reloaded.profiles).toHaveLength(0);
    expect(reloaded.addresses).toHaveLength(1);
  });

  it('ignores stray keys outside profiles/addresses', async () => {
    const result = await importTransferFile(JSON.stringify({
      profiles: [], addresses: [validAddress(0)],
      profile: { lastName: '山田' }, exportedAt: '2026-10-21',
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 0, profilesUpdated: 0, addressesAdded: 1, addressesUpdated: 0,
    });
    expect((await loadData()).profiles).toHaveLength(0);
  });

  it('aborts the import when the stored data cannot be read instead of treating it as empty', async () => {
    await saveData(ready);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async () => { throw new Error('read failed'); },
          set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
        },
      },
    });
    const result = await importTransferFile(JSON.stringify({ profiles: [validProfile(1)], addresses: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('読み込め');
    // A failed read must never turn the import into a full replacement of
    // storage: the stored data survives once reads work again.
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
        },
      },
    });
    expect(await loadData()).toEqual(ready);
  });

  it('checks the cap against the pre-write merge result when storage grew between reads', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => validProfile(i));
    await saveData({ profiles: ten, addresses: [validAddress(0)] });
    let reads = 0;
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => {
            reads += 1;
            // First read (the import's pre-read) still sees the empty
            // snapshot; by the second read another context has filled the cap.
            if (reads === 1) return {};
            return key in store ? { [key]: store[key] } : {};
          },
          set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
        },
      },
    });
    const result = await importTransferFile(JSON.stringify({ profiles: [validProfile(99)], addresses: [] }));
    expect(result.ok).toBe(false);
    // The unchecked merge must not land: storage keeps the other context's 10.
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          set: async () => {},
        },
      },
    });
    expect((await loadData()).profiles).toHaveLength(10);
  });

  it('keeps a link to a profile that lives only in storage when importing addresses', async () => {
    await saveData(ready);
    const result = await importTransferFile(JSON.stringify({
      profiles: [],
      addresses: [{
        id: 'aX', label: '自宅', profileId: 'p1', zip: '1000001', prefecture: '東京都',
        city: '千代田区', street: '千代田1-1',
      }],
    }));
    expect(result.ok).toBe(true);
    const imported = (await loadData()).addresses.find((a) => a.id === 'aX');
    expect(imported?.profileId).toBe('p1');
  });

  it('reports capacity shortage only for quota failures', async () => {
    const readableGet = async (key: string) => (key in store ? { [key]: store[key] } : {});
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: readableGet,
          set: async () => { throw new Error('QUOTA_BYTES quota exceeded'); },
        },
      },
    });
    const quota = await importTransferFile(JSON.stringify({
      profiles: [validProfile(1)], addresses: [validAddress(0)],
    }));
    expect(quota.ok).toBe(false);
    if (!quota.ok) expect(quota.errors.join('\n')).toContain('容量');
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: readableGet,
          set: async () => { throw new Error('boom'); },
        },
      },
    });
    const other = await importTransferFile(JSON.stringify({
      profiles: [validProfile(1)], addresses: [validAddress(0)],
    }));
    expect(other.ok).toBe(false);
    if (!other.ok) {
      expect(other.errors.join('\n')).toContain('保存に失敗');
      expect(other.errors.join('\n')).not.toContain('容量');
    }
  });

  it('reports the added/updated breakdown against the stored data', async () => {
    await saveData(ready);
    const result = await importTransferFile(JSON.stringify({
      profiles: [validProfile(1), validProfile(2)],
      addresses: [validAddress(0)],
    }));
    expect(result).toEqual({
      ok: true, profilesAdded: 1, profilesUpdated: 1, addressesAdded: 1, addressesUpdated: 0,
    });
  });

  it('drops unknown keys from exported entries', async () => {
    store['jushoai:data'] = {
      profiles: [{ ...ready.profiles[0], junk: 'hand-edit' }],
      addresses: [{ ...ready.addresses[0], exportedAt: '2026-10-21' }],
    };
    const parsed = JSON.parse(await exportTransferFile()) as {
      profiles: Record<string, unknown>[]; addresses: Record<string, unknown>[];
    };
    expect(Object.keys(parsed.profiles[0] ?? {}).sort()).toEqual(Object.keys(EMPTY_PROFILE).sort());
    expect(Object.keys(parsed.addresses[0] ?? {}).sort()).toEqual(Object.keys(EMPTY_ADDRESS).sort());
  });
});

describe('saveImported seam (PBI-117)', () => {
  const noCap = () => {};

  it('merges by id like saveData and writes the merged payload', async () => {
    await saveData(ready);
    await saveImported({ profiles: [{ ...profile, lastName: '更新' }], addresses: [] }, noCap);
    const reloaded = await loadData();
    expect(reloaded.profiles).toHaveLength(1);
    expect(reloaded.profiles[0]?.lastName).toBe('更新');
    expect(reloaded.addresses).toHaveLength(1);
  });

  it('throws StorageReadError instead of overwriting storage when the pre-write read fails', async () => {
    await saveData(ready);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async () => { throw new Error('read failed'); },
          set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
        },
      },
    });
    const err = await saveImported({ profiles: [validProfile(2)], addresses: [] }, noCap).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(StorageReadError);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
          set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
        },
      },
    });
    expect(await loadData()).toEqual(ready);
  });

  it('runs capCheck on the pre-write merge result and writes nothing on violation', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => validProfile(i));
    await saveData({ profiles: ten, addresses: [] });
    const seen: number[] = [];
    const err = await saveImported(
      { profiles: [validProfile(99)], addresses: [] },
      (payload) => {
        seen.push(payload.profiles.length);
        if (payload.profiles.length > 10) throw new Error('cap');
      },
    ).catch((e: unknown) => e);
    expect(seen).toEqual([11]);
    expect(err).toBeInstanceOf(Error);
    expect((await loadData()).profiles).toHaveLength(10);
  });
});
