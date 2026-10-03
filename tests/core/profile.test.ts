import { describe, it, expect } from 'vitest';
import {
  normalizeProfile, normalizeAddress, validateProfile, validateAddress,
} from '../../src/core/profile';
import { EMPTY_PROFILE } from '../../src/core/types';

const base = { ...EMPTY_PROFILE, lastName: '山田', firstName: '太郎' };

describe('normalizeProfile', () => {
  it('converts kana input to full-width katakana', () => {
    const p = normalizeProfile({ ...base, lastNameKana: 'やまだ', firstNameKana: 'ﾀﾛｳ' });
    expect(p.lastNameKana).toBe('ヤマダ');
    expect(p.firstNameKana).toBe('タロウ');
  });

  it('keeps only digits in tel', () => {
    expect(normalizeProfile({ ...base, tel: '０９０-1234-5678' }).tel).toBe('09012345678');
  });

  it('trims email', () => {
    expect(normalizeProfile({ ...base, email: ' a@example.com ' }).email).toBe('a@example.com');
  });
});

describe('validateProfile', () => {
  it('accepts a valid profile', () => {
    const p = normalizeProfile({
      ...base, lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
      email: 'a@example.com', tel: '09012345678',
    });
    expect(validateProfile(p)).toEqual([]);
  });

  it('reports invalid fields', () => {
    const errors = validateProfile({
      ...base, lastNameKana: 'abc', firstNameKana: '', email: 'x', tel: '123',
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('セイ'),
        expect.stringContaining('メールアドレス'),
        expect.stringContaining('電話番号'),
      ]),
    );
  });
});

describe('address', () => {
  it('normalizes zip to 7 digits', () => {
    const a = normalizeAddress({
      id: '1', label: '自宅', zip: '〒100-0001', prefecture: '東京都',
      city: '千代田区', street: '千代田1-1', building: '',
    });
    expect(a.zip).toBe('1000001');
  });

  it('validates zip and prefecture', () => {
    const errors = validateAddress({
      id: '1', label: '自宅', zip: '123', prefecture: '東京', city: '', street: '', building: '',
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('郵便番号'),
        expect.stringContaining('都道府県'),
      ]),
    );
  });
});
