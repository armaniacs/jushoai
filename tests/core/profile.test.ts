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

  it('normalizes birthday separators to zero-padded ISO', () => {
    expect(normalizeProfile({ ...base, birthday: '1990/5/7' }).birthday).toBe('1990-05-07');
    expect(normalizeProfile({ ...base, birthday: '1990年5月7日' }).birthday).toBe('1990-05-07');
    expect(normalizeProfile({ ...base, birthday: '1990-05-07' }).birthday).toBe('1990-05-07');
    expect(normalizeProfile({ ...base, birthday: '1990' }).birthday).toBe('1990');
  });

  it('keeps id and trims label, school, and department', () => {
    const p = normalizeProfile({
      ...base, id: 'p9', label: ' 仕事用 ', school: ' 都立日比谷高校 ', department: '普通科 ',
    });
    expect(p.id).toBe('p9');
    expect(p.label).toBe('仕事用');
    expect(p.school).toBe('都立日比谷高校');
    expect(p.department).toBe('普通科');
  });
});

describe('validateProfile', () => {
  it('accepts a valid profile', () => {
    const p = normalizeProfile({
      ...base, label: 'メイン', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
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

  it('requires a label', () => {
    expect(validateProfile({ ...EMPTY_PROFILE, label: '   ' })).toEqual(
      expect.arrayContaining([expect.stringContaining('プロファイルの名前')]),
    );
  });

  it('accepts a blank birthday but rejects malformed or unreal dates', () => {
    expect(validateProfile({ ...EMPTY_PROFILE, birthday: '' })).not.toEqual(
      expect.arrayContaining([expect.stringContaining('生年月日')]),
    );
    expect(validateProfile({ ...EMPTY_PROFILE, birthday: '1990/5/7' })).toEqual(
      expect.arrayContaining([expect.stringContaining('生年月日')]),
    );
    expect(validateProfile({ ...EMPTY_PROFILE, birthday: '1990-13-01' })).toEqual(
      expect.arrayContaining([expect.stringContaining('生年月日')]),
    );
    expect(validateProfile({ ...EMPTY_PROFILE, birthday: '1990-02-30' })).toEqual(
      expect.arrayContaining([expect.stringContaining('生年月日')]),
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
