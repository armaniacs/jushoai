import { describe, it, expect } from 'vitest';
import {
  normalizeProfile, normalizeAddress, validateProfile, validateAddress,
} from '../../src/core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';

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

  it('normalizes full-width romaji to half-width', () => {
    const p = normalizeProfile({ ...base, lastNameRomaji: 'Ｙａｍａｄａ ', firstNameRomaji: 'Taro' });
    expect(p.lastNameRomaji).toBe('Yamada');
    expect(p.firstNameRomaji).toBe('Taro');
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

  it('accepts blank romaji but rejects non-latin values', () => {
    expect(validateProfile({ ...EMPTY_PROFILE, lastNameRomaji: '', firstNameRomaji: '' })).not.toEqual(
      expect.arrayContaining([expect.stringContaining('ローマ字')]),
    );
    expect(validateProfile({ ...EMPTY_PROFILE, lastNameRomaji: '山田' })).toEqual(
      expect.arrayContaining([expect.stringContaining('ローマ字')]),
    );
  });

  it('trims gender', () => {
    expect(normalizeProfile({ ...base, gender: ' 女性 ' }).gender).toBe('女性');
  });

  it('accepts blank gender but rejects unknown values', () => {
    expect(validateProfile({ ...EMPTY_PROFILE, gender: '' })).not.toEqual(
      expect.arrayContaining([expect.stringContaining('性別')]),
    );
    expect(validateProfile({ ...EMPTY_PROFILE, gender: '不明' })).toEqual(
      expect.arrayContaining([expect.stringContaining('性別')]),
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
      ...EMPTY_ADDRESS,
      id: '1', label: '自宅', zip: '〒100-0001', prefecture: '東京都',
      city: '千代田区', street: '千代田1-1', building: '',
    });
    expect(a.zip).toBe('1000001');
  });

  it('normalizes overseas fields to half-width', () => {
    const a = normalizeAddress({
      id: '1', label: '海外', profileId: '', zip: '1000001', prefecture: '東京都',
      city: '千代田区', street: '千代田1-1', building: '',
      country: 'Ｕｎｉｔｅｄ　Ｓｔａｔｅｓ ', address1: '', address2: '',
      address3: '', address4: '', postalCode: ' 11375',
    });
    expect(a.country).toBe('United States');
    expect(a.postalCode).toBe('11375');
  });

  it('preserves the owner profile through normalization', () => {
    const a = normalizeAddress({ ...EMPTY_ADDRESS, id: '1', label: '自宅', profileId: 'p1' });
    expect(a.profileId).toBe('p1');
  });

  it('accepts an overseas address without domestic fields', () => {
    const errors = validateAddress({
      id: '1', label: '海外', profileId: '', zip: '', prefecture: '', city: '', street: '', building: '',
      country: 'United States', address1: '', address2: '25-15 M.G.Peterson Ave',
      address3: '', address4: '', postalCode: '11375',
    });
    expect(errors).toEqual([]);
  });

  it('rejects non-ascii overseas values and a missing country', () => {
    const errors = validateAddress({
      id: '1', label: '海外', profileId: '', zip: '', prefecture: '', city: '', street: '', building: '',
      country: '', address1: '', address2: '千代田1-1',
      address3: '', address4: '', postalCode: '',
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('国名'),
        expect.stringContaining('半角'),
      ]),
    );
  });

  it('validates zip and prefecture', () => {
    const errors = validateAddress({
      ...EMPTY_ADDRESS,
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
