import { describe, it, expect } from 'vitest';
import { normalizeAddress, normalizeProfile } from '../../src/core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import {
  addressErrorsFor, hasValidAddress, hasValidProfile, profileErrorsFor, trialToastText,
} from '../../src/entrypoints/options/save-guide';

const validProfile = normalizeProfile({
  ...EMPTY_PROFILE, id: 'p1', label: '個人用', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'yamada@example.com', tel: '09012345678',
});

const blankAddress = normalizeAddress({ ...EMPTY_ADDRESS, id: 'a1', label: '自宅' });

describe('save-guide', () => {
  it('sees a valid profile even when the address is blank', () => {
    expect(hasValidProfile([validProfile])).toBe(true);
    expect(hasValidAddress([blankAddress])).toBe(false);
  });

  it('scopes profile errors to profiles only', () => {
    const bad = normalizeProfile({ ...EMPTY_PROFILE, id: 'p2', label: '' });
    const errors = profileErrorsFor([bad]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => e.startsWith('プロファイル1:'))).toBe(true);
  });

  it('scopes address errors to addresses only', () => {
    const errors = addressErrorsFor([blankAddress]);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('自宅:')]));
  });
});

describe('trialToastText', () => {
  it('names the generated person and residence', () => {
    const p = normalizeProfile({
      ...EMPTY_PROFILE, id: 'p1', label: 'お試し', lastName: '山田', firstName: '太郎',
      lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    });
    const a = normalizeAddress({
      ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
      city: '千代田区', street: '千代田1-1',
    });
    expect(trialToastText(p, a)).toBe(
      '架空の名前として山田 太郎さん（東京都千代田区在住）を作りました',
    );
  });
});
