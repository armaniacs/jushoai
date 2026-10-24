import { describe, it, expect } from 'vitest';
import { fillOneEntry, type FillOneEntryDeps } from '../../src/content/fill-one-entry';
import type { Address, Profile } from '../../src/core/types';
import { EMPTY_PROFILE, EMPTY_ADDRESS } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  ...EMPTY_PROFILE, id: 'p1', label: '自宅', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'taro@example.jp', tel: '0312345678',
};
const address: Address = {
  ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001',
  prefecture: '東京都', city: '千田', street: '千代田1-1',
};
const meta = makeMeta({ id: 'f-last', label: '氏名（姓）', name: 'last_name' });

const setup = (opts?: { excluded?: boolean }) => {
  const calls: { noData: number; blocked: string[]; confirmed: string[]; filled: [string, string][] } = {
    noData: 0, blocked: [], confirmed: [], filled: [],
  };
  const deps: FillOneEntryDeps = {
    isExcluded: () => opts?.excluded ?? false,
    scan: (target) => (target ? { el: target as HTMLInputElement, meta } : null),
    load: async () => ({
      data: { profiles: [profile], addresses: [address] },
      last: { profileId: 'p1', addressId: 'a1' },
      mappings: [],
    }),
    ready: () => true,
    carryover: () => ({}),
    domain: () => 'e.com',
    onNoData: () => { calls.noData += 1; },
    showBlocked: async (label, reason) => { calls.blocked.push(`${label}:${reason}`); },
    confirm: async (label, display) => {
      calls.confirmed.push(`${label}|${display}`);
      return { mode: 'fill' };
    },
    fill: (el, value) => { calls.filled.push([(el as HTMLInputElement).id ?? '', value]); },
  };
  return { deps, calls };
};

describe('fillOneEntry (PBI-137)', () => {
  it('fills nothing on an excluded URL — the gate rides the entry', async () => {
    const { deps, calls } = setup({ excluded: true });
    await fillOneEntry(document.createElement('input'), deps);
    expect(calls.filled).toEqual([]);
    expect(calls.confirmed).toEqual([]);
    expect(calls.noData).toBe(0);
  });

  it('fills nothing without a target', async () => {
    const { deps, calls } = setup();
    await fillOneEntry(null, deps);
    expect(calls.filled).toEqual([]);
  });

  it('confirms the value before injecting and fills the scanned control', async () => {
    const el = document.createElement('input');
    const { deps, calls } = setup();
    await fillOneEntry(el, deps);
    expect(calls.confirmed).toEqual(['氏名（姓）（text）|山田']);
    expect(calls.filled).toEqual([['', '山田']]);
  });

  it('honors the taught mapping so a fill-one matches the full preview', async () => {
    const el = document.createElement('input');
    const unknownMeta = makeMeta({ id: 'f-x', name: 'xyz' });
    const calls = { filled: [] as [string, string][] };
    const deps: FillOneEntryDeps = {
      isExcluded: () => false,
      scan: () => ({ el, meta: unknownMeta }),
      load: async () => ({
        data: { profiles: [{ ...profile, email: 'taro@example.jp' }], addresses: [address] },
        last: { profileId: 'p1' },
        mappings: [{ domain: 'e.com', fieldKey: 'xyz', category: 'email' }],
      }),
      ready: () => true,
      carryover: () => ({}),
      domain: () => 'e.com',
      onNoData: () => {},
      showBlocked: async () => {},
      confirm: async () => ({ mode: 'fill' }),
      fill: (c, v) => { calls.filled.push(['', v]); },
    };
    await fillOneEntry(el, deps);
    expect(calls.filled).toEqual([['', 'taro@example.jp']]);
  });

  it('shows the blocked notice for a non-fillable reason', async () => {
    const overflowMeta = makeMeta({ id: 'f-max', name: 'last_name', maxLength: 1 });
    const el = document.createElement('input');
    const { deps, calls } = setup();
    deps.scan = () => ({ el, meta: overflowMeta });
    await fillOneEntry(el, deps);
    // The overflow meta has no label, so the notice falls back to the name.
    expect(calls.blocked).toEqual(['last_name:warn-maxlength']);
    expect(calls.filled).toEqual([]);
  });
});
