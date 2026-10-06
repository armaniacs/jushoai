import { describe, it, expect } from 'vitest';
import {
  toKatakana, toHiragana, toHalfKatakana, formatKana,
  detectNameSeparator, joinName, splitTel, splitZip, wantsHyphen,
} from '../../src/core/formatters';

describe('kana conversion', () => {
  it('katakana <-> hiragana', () => {
    expect(toHiragana('ヤマダ')).toBe('やまだ');
    expect(toKatakana('やまだ')).toBe('ヤマダ');
    expect(toHiragana('ラーメン')).toBe('らーめん');
  });

  it('full-width katakana to half-width with voiced marks', () => {
    expect(toHalfKatakana('ヤマダ')).toBe('ﾔﾏﾀﾞ');
    expect(toHalfKatakana('タロウ')).toBe('ﾀﾛｳ');
    expect(toHalfKatakana('パピプ')).toBe('ﾊﾟﾋﾟﾌﾟ');
    expect(toHalfKatakana('ヴ')).toBe('ｳﾞ');
    expect(toHalfKatakana('ー')).toBe('ｰ');
  });

  it('formatKana dispatches by kind', () => {
    expect(formatKana('ヤマダ', 'katakana')).toBe('ヤマダ');
    expect(formatKana('ヤマダ', 'hiragana')).toBe('やまだ');
    expect(formatKana('ヤマダ', 'halfKatakana')).toBe('ﾔﾏﾀﾞ');
  });
});

describe('name separator', () => {
  it('detects from placeholder', () => {
    expect(detectNameSeparator('山田　太郎')).toBe('　');
    expect(detectNameSeparator('山田 太郎')).toBe(' ');
    expect(detectNameSeparator('例）山田太郎')).toBe('');
    expect(detectNameSeparator('')).toBe(' ');
    expect(detectNameSeparator('Yamada Taro')).toBe(' ');
  });

  it('joins last and first', () => {
    expect(joinName('山田', '太郎', '　')).toBe('山田　太郎');
    expect(joinName('山田', '太郎', '')).toBe('山田太郎');
  });
});

describe('tel / zip', () => {
  it('splits phone numbers by Japanese numbering', () => {
    expect(splitTel('09012345678')).toEqual(['090', '1234', '5678']);
    expect(splitTel('0312345678')).toEqual(['03', '1234', '5678']);
    expect(splitTel('0451234567')).toEqual(['045', '123', '4567']);
    expect(splitTel('0120123456')).toEqual(['0120', '123', '456']);
  });

  it('splits 10-digit numbers with 4-digit area codes as 4-2-4', () => {
    expect(splitTel('0134321234')).toEqual(['0134', '32', '1234']);
    expect(splitTel('0166231234')).toEqual(['0166', '23', '1234']);
    // Codes from the MIC list (2026-03-01) missing from the old table.
    expect(splitTel('0422121234')).toEqual(['0422', '12', '1234']);
    expect(splitTel('0439121234')).toEqual(['0439', '12', '1234']);
    expect(splitTel('0533121234')).toEqual(['0533', '12', '1234']);
    expect(splitTel('0743121234')).toEqual(['0743', '12', '1234']);
    expect(splitTel('0798121234')).toEqual(['0798', '12', '1234']);
    expect(splitTel('0848121234')).toEqual(['0848', '12', '1234']);
  });

  it('splits 10-digit numbers with 5-digit area codes as 5-1-4', () => {
    expect(splitTel('0126711234')).toEqual(['01267', '1', '1234']);
    expect(splitTel('0499811234')).toEqual(['04998', '1', '1234']);
  });

  it('splits zip', () => {
    expect(splitZip('1000001')).toEqual(['100', '0001']);
  });

  it('decides hyphen usage from placeholder and maxlength', () => {
    expect(wantsHyphen('例：090-1234-5678', null, 'tel')).toBe(true);
    expect(wantsHyphen('09012345678', 11, 'tel')).toBe(false);
    expect(wantsHyphen('', 13, 'tel')).toBe(true);
    expect(wantsHyphen('', null, 'tel')).toBe(false);
    expect(wantsHyphen('123-4567', null, 'zip')).toBe(true);
    expect(wantsHyphen('', 8, 'zip')).toBe(true);
    expect(wantsHyphen('', 7, 'zip')).toBe(false);
  });
});
