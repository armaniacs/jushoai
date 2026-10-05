import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isReady, loadData, saveData } from '../src/storage';
import { EMPTY_PROFILE, type StoredData } from '../src/core/types';

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
      },
    },
  });
});

const ready: StoredData = {
  profile: { ...EMPTY_PROFILE, label: 'メイン', lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ' },
  addresses: [{ id: '1', label: '自宅', zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1', building: '' }],
};

describe('storage', () => {
  it('returns empty defaults when nothing is stored', async () => {
    expect(await loadData()).toEqual({ profile: EMPTY_PROFILE, addresses: [] });
  });

  it('round-trips data', async () => {
    await saveData(ready);
    expect(await loadData()).toEqual(ready);
  });

  it('fills missing profile keys from defaults', async () => {
    store['jushoai:data'] = { profile: { lastName: '山田' }, addresses: [] };
    expect((await loadData()).profile).toEqual({ ...EMPTY_PROFILE, lastName: '山田' });
  });
});

describe('isReady', () => {
  it('requires a valid profile and at least one address', () => {
    expect(isReady(ready)).toBe(true);
    expect(isReady({ ...ready, addresses: [] })).toBe(false);
    expect(isReady({ ...ready, profile: EMPTY_PROFILE })).toBe(false);
  });
});
