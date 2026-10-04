import { describe, it, expect } from 'vitest';
import { kanaHiraganaHint } from '../../src/entrypoints/options/dom';

describe('kanaHiraganaHint', () => {
  it('converts stored katakana to hiragana like the fill path', () => {
    expect(kanaHiraganaHint('ヤマダ')).toBe('やまだ');
    expect(kanaHiraganaHint('タロウ')).toBe('たろう');
  });

  it('accepts hiragana and half-width input the same way saving does', () => {
    expect(kanaHiraganaHint('やまだ')).toBe('やまだ');
    expect(kanaHiraganaHint('ﾀﾛｳ')).toBe('たろう');
  });

  it('stays empty for blank input', () => {
    expect(kanaHiraganaHint('')).toBe('');
    expect(kanaHiraganaHint('   ')).toBe('');
  });
});
