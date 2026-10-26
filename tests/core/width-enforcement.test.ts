import { describe, it, expect } from 'vitest';
import { buildPlan } from '../../src/core/planner';
import {
  detectWidthKind, toFullWidth, toHalfWidth,
} from '../../src/core/formatters';
import type { Address, Category, FieldMeta, Item, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '女性', birthday: '1990-05-07', school: '', department: '',
  companyName: '', companyDepartment: '', companyNameKana: '',
  email: 'yamada@example.com', tel: '09012345678',
};
const address: Address = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都',
  city: '千代田区', street: '千代田1-1', building: '千代田ビル101',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

let seq = 0;
const item = (category: Category, meta: Partial<FieldMeta> = {}): Item => ({
  meta: makeMeta({ id: `f${seq++}`, ...meta }),
  cls: { category, confidence: 0.8, source: 'rule' },
});

describe('width claim detection (PBI-120)', () => {
  it('reads a full-width claim from the pattern attribute', () => {
    expect(detectWidthKind('[０-９]{7}')).toBe('full');
    expect(detectWidthKind('[Ａ-Ｚａ-ｚ]+')).toBe('full');
    // Escaped forms decode first: the attribute holds \uFF10 as text.
    expect(detectWidthKind('[\\uFF10-\\uFF19]{7}')).toBe('full');
    // The formmailer kana pattern (samples/formmailer-raijo-age.html).
    expect(detectWidthKind('^[\\u2015\\u3000\\u30A1-\\u30F6\\u30FB-\\u30FE]+$')).toBe('full');
  });

  it('reads a half-width claim from the pattern attribute', () => {
    expect(detectWidthKind('[0-9]{7}')).toBe('half');
    expect(detectWidthKind('[a-zA-Z]+')).toBe('half');
    expect(detectWidthKind('^\\d{3}-\\d{4}$')).toBe('half');
    expect(detectWidthKind('[ｦ-ﾟ]+')).toBe('half');
  });

  it('leaves a mixed or absent claim unconverted', () => {
    expect(detectWidthKind('[0-9０-９]+')).toBe(null);
    expect(detectWidthKind('')).toBe(null);
    expect(detectWidthKind('.+')).toBe(null);
  });

  it('never reads a quantifier bound as a half-width claim', () => {
    // [ぁ-ん]{2,10} asks for 2-10 hiragana, not for the digits 2 and 10.
    expect(detectWidthKind('[ぁ-ん]{2,10}')).toBe('full');
    expect(detectWidthKind('[ア-ヶ]{2}')).toBe('full');
    expect(detectWidthKind('[0-9]{4}')).toBe('half');
  });
});

// レビュー指摘の再現 fixture: pattern の形（文字クラスの内側）を読まず、正規表現
// 構文の ASCII 文字を根拠にして変換方向を誤る。fixture 先行（CLAUDE.md）。
describe('width claim detection: class-interior scan (review)', () => {
  it('never reads a negated class as a direction (the page forbids, not requires)', () => {
    expect(detectWidthKind('[^０-９]{7}')).toBe(null);
    expect(detectWidthKind('[^0-9]')).toBe(null);
  });

  it('never reads regex syntax as half-width evidence', () => {
    expect(detectWidthKind('\\p{Katakana}+')).toBe(null);
    expect(detectWidthKind('[\\p{Katakana}]+')).toBe(null);
    expect(detectWidthKind('[[:alpha:]]')).toBe(null);
    expect(detectWidthKind('\\u{1F600}')).toBe(null);
    expect(detectWidthKind('[\\u{1F600}]')).toBe(null);
  });

  it('reads an ASCII printable range as half-width evidence', () => {
    expect(detectWidthKind('[ -~]+')).toBe('half');
  });

  it('reads the whole half-width kana block as half-width evidence', () => {
    expect(detectWidthKind('[｡｢｣]')).toBe('half');
  });
});

describe('half/full width conversion (PBI-120)', () => {
  it('converts half-width digits, letters, and symbols to full-width', () => {
    expect(toFullWidth('1000001')).toBe('１０００００１');
    expect(toFullWidth('100-0001')).toBe('１００－０００１');
    expect(toFullWidth('09012345678')).toBe('０９０１２３４５６７８');
    expect(toFullWidth('Taro')).toBe('Ｔａｒｏ');
    expect(toFullWidth('yamada@example.com')).toBe('ｙａｍａｄａ＠ｅｘａｍｐｌｅ．ｃｏｍ');
  });

  it('converts half-width kana to full-width and re-composes voiced marks', () => {
    expect(toFullWidth('ﾔﾏﾀﾞ')).toBe('ヤマダ');
    expect(toFullWidth('ﾀﾛｳ')).toBe('タロウ');
    expect(toFullWidth('ﾊﾟﾋﾟﾌﾟ')).toBe('パピプ');
    expect(toFullWidth('ｶﾞ')).toBe('ガ');
    expect(toFullWidth('ｰ')).toBe('ー');
    expect(toFullWidth('･')).toBe('・');
  });

  it('keeps spaces and non-convertible characters as-is', () => {
    expect(toFullWidth('山田 太郎')).toBe('山田 太郎');
    expect(toFullWidth('山田　太郎')).toBe('山田　太郎');
    expect(toFullWidth('ビル101')).toBe('ビル１０１');
  });

  it('converts full-width back to half-width (ASCII forms only)', () => {
    expect(toHalfWidth('１０００００１')).toBe('1000001');
    expect(toHalfWidth('１００－０００１')).toBe('100-0001');
    expect(toHalfWidth('Ｔａｒｏ')).toBe('Taro');
    expect(toHalfWidth('０９０－１２３４－５６７８')).toBe('090-1234-5678');
  });

  it('leaves kana to the kana module (no double rewrite)', () => {
    expect(toHalfWidth('ヤマダ')).toBe('ヤマダ');
    expect(toHalfWidth('タロウ')).toBe('タロウ');
  });
});

describe('planner width wiring (PBI-120)', () => {
  it('fills a full-width-forcing zip field with the converted value', () => {
    const plan = buildPlan([item('zip', { pattern: '[０-９]{7}' })], { profile, address });
    expect(plan[0]).toMatchObject({ value: '１０００００１', display: '１０００００１', status: 'ok' });
  });

  it('converts the hyphen wantsHyphen inserted together with the digits', () => {
    const plan = buildPlan(
      [item('tel', { pattern: '[０-９－]{13}', placeholder: '090-1234-5678' })],
      { profile, address },
    );
    expect(plan[0]!.value).toBe('０９０－１２３４－５６７８');
  });

  it('converts a full-width stored tel to half-width when the pattern demands half', () => {
    const fullTel = { ...profile, tel: '０９０１２３４５６７８' };
    const plan = buildPlan([item('tel', { pattern: '^\\d{11}$' })], { profile: fullTel, address });
    expect(plan[0]!.value).toBe('09012345678');
  });

  it('warns on maxlength overflow after conversion instead of truncating', () => {
    const plan = buildPlan([item('zip', { pattern: '[０-９]{7}', maxLength: 3 })], { profile, address });
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.value).toBe('');
  });

  it('leaves fields without a width claim untouched', () => {
    const mixed = buildPlan([item('zip', { pattern: '[0-9０-９]{7}' })], { profile, address });
    expect(mixed[0]!.value).toBe('1000001');
    const noPattern = buildPlan([item('lastName', { pattern: '' })], { profile, address });
    expect(noPattern[0]!.value).toBe('山田');
  });

  it('does not touch kana already shaped by kanaKind (half-width kana claim)', () => {
    const kana: Item = {
      meta: makeMeta({ id: 'fk', pattern: '[ｦ-ﾟ]+' }),
      cls: { category: 'lastNameKana', confidence: 0.8, source: 'rule', kanaKind: 'halfKatakana' },
    };
    const plan = buildPlan([kana], { profile, address });
    expect(plan[0]!.value).toBe('ﾔﾏﾀﾞ');
  });

  it('does not touch select/radio values and date inputs', () => {
    const select = buildPlan(
      [item('prefecture', {
        tag: 'select', pattern: '[０-９]+',
        options: [{ value: '', text: '-' }, { value: '13', text: '東京都' }],
      })], { profile, address });
    expect(select[0]!.value).toBe('13');
    const date = buildPlan([item('birthday', { type: 'date', pattern: '[０-９]{4}' })], { profile, address });
    expect(date[0]!.value).toBe('1990-05-07');
  });
});
