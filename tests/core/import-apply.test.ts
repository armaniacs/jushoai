import { describe, it, expect } from 'vitest';
import { applyImportDraft, applyImportToState } from '../../src/core/import-apply';
import { draftFromPage } from '../../src/core/import-draft';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import type { Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const base = (): Profile => ({ ...EMPTY_PROFILE, id: 'p1', label: '' });

describe('applyImportDraft (PBI-127)', () => {
  it('takes valid draft values through normalizeProfile', () => {
    const result = applyImportDraft(base(), { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }, {
      profile: { lastName: ' 山田 ', firstName: '太郎', lastNameKana: 'やまだ', tel: '09012345678' },
      address: {},
    });
    expect(result.profile).toMatchObject({ lastName: '山田', lastNameKana: 'ヤマダ' });
    expect(result.taken).toBe(4);
    expect(result.dropped).toBe(0);
  });

  it('drops values that introduce a validation error beyond the baseline', () => {
    const result = applyImportDraft(base(), { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }, {
      profile: { lastName: '山田', tel: 'abc', email: 'no-at-mark' },
      address: {},
    });
    expect(result.profile).toMatchObject({ lastName: '山田' });
    expect(result.profile.tel).toBe('');
    expect(result.profile.email).toBe('');
    expect(result.taken).toBe(1);
    expect(result.dropped).toBe(2);
  });

  it('takes the kana fix (a filled kana row clears its baseline error)', () => {
    const result = applyImportDraft(base(), { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }, {
      profile: { lastNameKana: 'やまだ' },
      address: {},
    });
    expect(result.profile.lastNameKana).toBe('ヤマダ');
    expect(result.taken).toBe(1);
  });

  it('keeps the address draft on the address validators', () => {
    const result = applyImportDraft(base(), { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }, {
      profile: {},
      address: { zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1' },
    });
    expect(result.address).toMatchObject({ zip: '1000001', prefecture: '東京都' });
    expect(result.taken).toBe(4);
  });

  it('rides the page draft end to end (draftFromPage → applyImportDraft)', () => {
    const items = [
      { meta: makeMeta({ id: 'f1', value: '山田' }), cls: { category: 'lastName' as const, confidence: 0.8, source: 'rule' as const } },
      { meta: makeMeta({ id: 'f2', value: '太郎' }), cls: { category: 'firstName' as const, confidence: 0.8, source: 'rule' as const } },
      { meta: makeMeta({ id: 'f3', value: 'abc' }), cls: { category: 'tel' as const, confidence: 0.8, source: 'rule' as const } },
    ];
    const result = applyImportDraft(
      base(), { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' },
      draftFromPage(items),
    );
    expect(result.profile).toMatchObject({ lastName: '山田', firstName: '太郎' });
    expect(result.profile.tel).toBe('');
    expect(result.taken).toBe(2);
    expect(result.dropped).toBe(1);
  });
});

describe('applyImportToState (PBI-147)', () => {
  const targets = (blankProfile: boolean, blankAddress: boolean) => ({
    target: { ...EMPTY_PROFILE, id: 'p-new' },
    targetAddress: { ...EMPTY_ADDRESS, id: 'a-new', label: '新規' },
    blankProfile,
    blankAddress,
  });

  it('leaves the card composition untouched when nothing was taken', () => {
    const first = { ...EMPTY_PROFILE, id: 'p1', lastName: '山田' };
    const state = { profiles: [first], addresses: [{ ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }] };
    const next = applyImportToState(
      state,
      targets(false, false),
      { profile: { ...EMPTY_PROFILE, id: 'p-new' }, address: { ...EMPTY_ADDRESS, id: 'a-new' }, taken: 0 },
    );
    // A failed import never adds a forked new card (PBI-147).
    expect(next.profiles).toEqual(state.profiles);
    expect(next.addresses).toEqual(state.addresses);
    expect(next.profiles.length).toBe(1);
  });

  it('fills a blank first card in place', () => {
    const first = { ...EMPTY_PROFILE, id: 'p1' };
    const state = { profiles: [first], addresses: [{ ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }] };
    const imported = { ...EMPTY_PROFILE, id: 'p1', lastName: '山田' };
    const next = applyImportToState(
      state,
      targets(true, true),
      { profile: imported, address: { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }, taken: 2 },
    );
    expect(next.profiles).toEqual([imported]);
    expect(next.profiles.length).toBe(1);
  });

  it('forks a new card when the first already has values', () => {
    const first = { ...EMPTY_PROFILE, id: 'p1', lastName: '山田' };
    const state = { profiles: [first], addresses: [{ ...EMPTY_ADDRESS, id: 'a1', label: '自宅' }] };
    const forked = { ...EMPTY_PROFILE, id: 'p-new', firstName: '太郎' };
    const next = applyImportToState(
      state,
      targets(false, false),
      { profile: forked, address: { ...EMPTY_ADDRESS, id: 'a-new' }, taken: 3 },
    );
    expect(next.profiles).toEqual([first, forked]);
    expect(next.profiles[0]).toBe(first);
  });
});
