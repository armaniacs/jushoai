import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isReady, loadData, loadLastUsed, migrateData, resolveAddressId, resolveLastId, saveData, saveLastUsed } from '../src/storage';
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
  it('migrates a legacy single profile to メイン', () => {
    const out = migrateData({ profile: { lastName: '山田' }, addresses: [] });
    expect(out.profiles).toEqual([{ ...EMPTY_PROFILE, id: 'uuid-1', label: 'メイン', lastName: '山田' }]);
    expect(out.addresses).toEqual([]);
  });

  it('keeps the new shape as-is with defaults for missing keys', () => {
    const out = migrateData({ profiles: [{ id: 'p9', label: '仕事用', lastName: '山田' }], addresses: [] });
    expect(out.profiles).toEqual([{ ...EMPTY_PROFILE, id: 'p9', label: '仕事用', lastName: '山田' }]);
  });

  it('returns empty lists when nothing is stored', () => {
    expect(migrateData(undefined)).toEqual({ profiles: [], addresses: [] });
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

  it('assigns UUIDs via randomUUID when available', () => {
    const out = migrateData({
      profile: { lastName: '山田' },
      addresses: [{ label: '自宅' }],
    });
    expect(out.profiles[0]?.id).toBe('uuid-1');
    expect(out.profiles[0]?.label).toBe('メイン');
    expect(out.addresses[0]?.id).toBe('uuid-2');
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

describe('isReady', () => {
  it('requires a valid profile and at least one address', () => {
    expect(isReady(ready)).toBe(true);
    expect(isReady({ ...ready, addresses: [] })).toBe(false);
    expect(isReady({ ...ready, profiles: [EMPTY_PROFILE] })).toBe(false);
    expect(isReady({ ...ready, profiles: [] })).toBe(false);
  });
});
