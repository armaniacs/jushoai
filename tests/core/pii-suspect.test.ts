import { describe, it, expect } from 'vitest';
import { suspectPii } from '../../src/core/pii-suspect';

describe('suspectPii', () => {
  it('flags email-like text', () => {
    expect(suspectPii('連絡先: yamada@example.com')).toBe(true);
    expect(suspectPii('mail@example.co.jp')).toBe(true);
  });

  it('flags phone-like text in common formats', () => {
    expect(suspectPii('TEL: 03-1234-5678')).toBe(true);
    expect(suspectPii('09012345678')).toBe(true);
    expect(suspectPii('090-1234-5678')).toBe(true);
  });

  it('flags postal-code-like text', () => {
    expect(suspectPii('〒100-0001')).toBe(true);
  });

  it('flags street-address-like text', () => {
    expect(suspectPii('東京都千代田区千代田1-1')).toBe(true);
    expect(suspectPii('丸の内2丁目4-1')).toBe(true);
  });

  it('flags full-name-like text', () => {
    expect(suspectPii('山田 太郎')).toBe(true);
    expect(suspectPii('山田\u3000太郎')).toBe(true);
  });

  it('flags katakana full-name-like text', () => {
    expect(suspectPii('フリガナ（ヤマダ タロウ）')).toBe(true);
    expect(suspectPii('ヤマダ\u3000タロウ')).toBe(true);
    expect(suspectPii('フリガナ')).toBe(false);
  });

  it('leaves plain field labels alone', () => {
    expect(suspectPii('お名前（全角）')).toBe(false);
    expect(suspectPii('フリガナ')).toBe(false);
    expect(suspectPii('郵便番号')).toBe(false);
    expect(suspectPii('電話番号')).toBe(false);
    expect(suspectPii('メールアドレス')).toBe(false);
    expect(suspectPii('都道府県')).toBe(false);
    expect(suspectPii('市区町村')).toBe(false);
  });

  it('flags suspects even when mixed into longer instruction text', () => {
    expect(suspectPii('例: 100-0001 と入力してください')).toBe(true);
  });
});
