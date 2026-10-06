import { describe, it, expect } from 'vitest';
import { ACCEPT_THRESHOLD, classifyField, isConfident } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';

const full = (p: Parameters<typeof makeMeta>[0]) => classifyField(makeMeta(p));

describe('dispatch parity: birth order and guard', () => {
  it('classifies month/day/year with 0.7', () => {
    expect(full({ label: '生年月日の月', nearby: '生年月日' })).toMatchObject({ category: 'birthMonth', confidence: 0.7, source: 'rule' });
    expect(full({ label: '生年月日の日', nearby: '生年月日' })).toMatchObject({ category: 'birthDay', confidence: 0.7, source: 'rule' });
    expect(full({ label: '生年月日の年', nearby: '生年月日' })).toMatchObject({ category: 'birthYear', confidence: 0.7, source: 'rule' });
    expect(full({ label: '年', nearby: '生年月日' })).toMatchObject({ category: 'birthYear', confidence: 0.7, source: 'rule' });
  });

  it('prefers month over year/day when both match (table order)', () => {
    expect(full({ label: '年の月', nearby: '生年月日' })?.category).toBe('birthMonth');
    expect(full({ label: '月の日', nearby: '生年月日' })?.category).toBe('birthMonth');
    expect(full({ label: '年の日', nearby: '生年月日' })?.category).toBe('birthDay');
  });

  it('leaves bare birth-phrase fields null', () => {
    expect(full({ label: '生年月日' })).toBeNull();
    expect(full({ label: '誕生日' })).toBeNull();
    expect(full({ label: 'Birthday' })).toBeNull();
  });
});

describe('dispatch parity: era', () => {
  it('classifies era by context and exact with 0.7', () => {
    expect(full({ label: '令和', nearby: '元号' })).toMatchObject({ category: 'birthEra', confidence: 0.7, source: 'rule' });
    expect(full({ label: '令和' })).toMatchObject({ category: 'birthEra', confidence: 0.7, source: 'rule' });
    expect(full({ label: '元号', nearby: '令和' })).toMatchObject({ category: 'birthEra', confidence: 0.7, source: 'rule' });
    expect(full({ label: '備考', nearby: '元号' })).toBeNull();
  });

  it('does not read place names as era', () => {
    expect(full({ label: '昭和区' })).toBeNull();
  });
});

describe('dispatch parity: school/department/gender gradient', () => {
  it('uses 0.7 for ownText and 0.65 for legendText', () => {
    expect(full({ label: '学校名' })).toMatchObject({ category: 'school', confidence: 0.7, source: 'rule' });
    expect(full({ label: '備考欄', nearby: '学校' })).toMatchObject({ category: 'school', confidence: 0.65, source: 'rule' });
    expect(full({ label: '学部・学科' })).toMatchObject({ category: 'department', confidence: 0.7, source: 'rule' });
    expect(full({ label: '備考欄', nearby: '学部' })).toMatchObject({ category: 'department', confidence: 0.65, source: 'rule' });
    expect(full({ label: '性別' })).toMatchObject({ category: 'gender', confidence: 0.7, source: 'rule' });
    expect(full({ nearby: '性別' })).toMatchObject({ category: 'gender', confidence: 0.65, source: 'rule' });
  });

  it('suppresses all of them for office fields', () => {
    expect(full({ label: 'Company Department' })).toBeNull();
    expect(full({ label: '会社の生年月日の月', nearby: '生年月日' })).toBeNull();
  });
});

describe('dispatch parity: overseas', () => {
  it('classifies country with gradient', () => {
    expect(full({ label: 'Country' })).toMatchObject({ category: 'country', confidence: 0.7, source: 'rule' });
    expect(full({ label: '備考', nearby: 'Country' })).toMatchObject({ category: 'country', confidence: 0.65, source: 'rule' });
    expect(full({ label: '国名' })).toBeNull();
  });

  it('gates address lines on overseas context', () => {
    expect(full({ name: 'address_1', label: 'Address-1', nearby: 'City' })).toMatchObject({ category: 'address1', confidence: 0.7, source: 'rule' });
    expect(full({ label: 'City案内', nearby: 'Address-3 (City)' })).toMatchObject({ category: 'address3', confidence: 0.65, source: 'rule' });
    expect(full({ name: 'address_1', label: 'Address-1' })).toMatchObject({ category: 'addressFull', confidence: 0.8, source: 'rule' });
  });

  it('gates postalCode on foreign mark', () => {
    expect(full({ name: 'postal_code', label: 'Postal code ※半角英数で入力' })).toMatchObject({ category: 'postalCode', confidence: 0.7, source: 'rule' });
    expect(full({ label: '案内', nearby: 'Postal code foreign' })).toMatchObject({ category: 'postalCode', confidence: 0.65, source: 'rule' });
    expect(full({ name: 'postal_code', label: 'Postal code' })?.category).not.toBe('postalCode');
  });
});

describe('dispatch parity: age', () => {
  const decadeOpts = [{ value: '0', text: '20代' }, { value: '1', text: '30代' }];
  it('classifies option fields with decade readings', () => {
    expect(full({ tag: 'select', label: '年齢', options: decadeOpts })).toMatchObject({ category: 'ageDecade', confidence: 0.7, source: 'rule' });
    expect(full({ tag: 'select', label: '案内', nearby: '年齢', options: decadeOpts })).toMatchObject({ category: 'ageDecade', confidence: 0.65, source: 'rule' });
  });

  it('rejects numeric boxes and non-decade options', () => {
    expect(full({ label: '年齢', placeholder: '30' })).toBeNull();
    expect(full({ tag: 'select', label: '年齢', options: [{ value: '0', text: '東京' }] })).toBeNull();
  });
});

describe('dispatch parity: romaji', () => {
  it('classifies latin-name signals with 0.7', () => {
    expect(full({ label: '氏名（ローマ字）' })).toMatchObject({ category: 'fullNameRomaji', confidence: 0.7, source: 'rule' });
    expect(full({ label: '姓（ローマ字・半角英字）', name: 'sei_romaji' })).toMatchObject({ category: 'lastNameRomaji', confidence: 0.7, source: 'rule' });
    expect(full({ label: '名（ローマ字）' })).toMatchObject({ category: 'firstNameRomaji', confidence: 0.7, source: 'rule' });
  });

  it('does not misread mail/user/company as romaji', () => {
    expect((full({ label: 'メールアドレス ※半角英数で入力' })?.category ?? '')).not.toMatch(/Romaji$/);
    expect((full({ label: 'ユーザー名 ※半角英数' })?.category ?? '')).not.toMatch(/Romaji$/);
    expect((full({ label: '会社名（英文）' })?.category ?? '')).not.toMatch(/Romaji$/);
  });
});

describe('dispatch parity: kana sources, tel fallback, null', () => {
  it('keeps the 0.8/0.7/0.65 source gradient', () => {
    expect(full({ name: 'kana_sei' })).toMatchObject({ category: 'lastNameKana', confidence: 0.8, source: 'rule', kanaKind: 'katakana' });
    expect(full({ label: 'フリガナ' })).toMatchObject({ category: 'fullNameKana', confidence: 0.7, source: 'rule', kanaKind: 'katakana' });
    expect(full({ label: '備考', nearby: 'お名前' })).toMatchObject({ category: 'fullName', confidence: 0.65, source: 'rule' });
    expect(full({ label: '備考', nearby: 'お名前' })?.kanaKind).toBeUndefined();
  });

  it('attaches kanaKind only to kana categories', () => {
    expect(full({ label: 'フリガナ', placeholder: 'ヤマダ' })?.kanaKind).toBe('katakana');
    expect(full({ label: 'ふりがな', placeholder: 'やまだ' })?.kanaKind).toBe('hiragana');
    expect(full({ label: 'お名前' })?.kanaKind).toBeUndefined();
  });

  it('falls back to tel 0.5 below the threshold', () => {
    const c = full({ type: 'tel', label: '連絡先' });
    expect(c).toMatchObject({ category: 'tel', confidence: 0.5, source: 'rule' });
    expect(isConfident(c)).toBe(false);
  });

  it('returns null for unrelated fields', () => {
    expect(full({ label: '備考' })).toBeNull();
    expect(full({ label: '会社名' })).toBeNull();
  });

  it('keeps threshold semantics', () => {
    expect(ACCEPT_THRESHOLD).toBe(0.6);
    expect(isConfident(full({ label: '学校名' }))).toBe(true);
    expect(isConfident(null)).toBe(false);
  });
});
