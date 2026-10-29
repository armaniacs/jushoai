import { describe, it, expect } from 'vitest';
import { PREFECTURES } from '../../src/core/prefectures';
import { normalizeAddress, normalizeProfile, validateAddress, validateProfile } from '../../src/core/profile';
import type { Address, Profile } from '../../src/core/types';
import { makeSampleAddress, makeSampleProfile } from '../../src/core/sample-data';

const asProfile = (s: Omit<Profile, 'id'>): Profile => ({ ...s, id: 'test' });
const asAddress = (s: Omit<Address, 'id' | 'profileId'>): Address => ({ ...s, id: 'test', profileId: '' });

describe('sample-data', () => {
  it('always passes save validation', () => {
    for (let i = 0; i < 50; i++) {
      const p = normalizeProfile(asProfile(makeSampleProfile()));
      const a = normalizeAddress(asAddress(makeSampleAddress()));
      expect(validateProfile(p)).toEqual([]);
      expect(validateAddress(a)).toEqual([]);
    }
  });

  it('uses katakana kana, a formal prefecture name, and safe formats', () => {
    const p = makeSampleProfile();
    const a = makeSampleAddress();
    expect(p.lastNameKana).toMatch(/^[ァ-ヶー]+$/);
    expect(p.firstNameKana).toMatch(/^[ァ-ヶー]+$/);
    expect((PREFECTURES as readonly string[])).toContain(a.prefecture);
    expect(a.zip).toMatch(/^\d{7}$/);
    expect(p.tel).toMatch(/^\d{10,11}$/);
    expect(p.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(p.birthday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('produces different people on repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const p = makeSampleProfile();
      seen.add(`${p.lastName}-${p.firstName}-${p.birthday}-${p.tel}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
