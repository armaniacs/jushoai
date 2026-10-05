import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isReady, loadData, loadLastUsed, migrateData, resolveLastId, saveData, saveLastUsed } from '../src/storage';
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
    id: '1', label: '自宅', zip: '1000001', prefecture: '東京都', city: '千代田区',
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
