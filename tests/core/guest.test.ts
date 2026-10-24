import { describe, it, expect } from 'vitest';
import { guestProfile, guestAddress } from '../../src/core/guest';
import type { GuestValues } from '../../src/core/guest';

const guest: GuestValues = {
  profile: { lastName: ' 山田 ', firstName: '太郎', lastNameKana: 'ヤマダ', email: 'yamada@example.com' },
  address: { zip: '1000001', prefecture: '東京都', city: '千代田区' },
};

describe('guestProfile (PBI-144)', () => {
  it('builds the one-shot profile from the typed values and trims them', () => {
    const profile = guestProfile(guest);
    expect(profile).toMatchObject({
      id: 'guest', label: 'ゲスト', lastName: '山田', firstName: '太郎',
      lastNameKana: 'ヤマダ', email: 'yamada@example.com',
    });
    // omitted rows stay empty: stored and guest values never mix
    expect(profile.tel).toBe('');
  });
});

describe('guestAddress (PBI-144)', () => {
  it('builds the one-shot address from the typed values', () => {
    const address = guestAddress(guest);
    expect(address).toMatchObject({
      id: 'guest', label: 'ゲスト', profileId: 'guest',
      zip: '1000001', prefecture: '東京都', city: '千代田区',
    });
    expect(address.street).toBe('');
  });
});
