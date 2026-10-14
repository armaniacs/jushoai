import { describe, it, expect } from 'vitest';
import { matchOption } from '../../src/core/match-option';
import type { Category, SelectOption } from '../../src/core/types';

const opts = (texts: string[]): SelectOption[] =>
  texts.map((text, i) => ({ value: String(i), text }));

describe('matchOption', () => {
  it.each([
    ['prefecture', '東京都', ['大阪府', '東京都'], '東京都'],
    ['birthEra', '令和', ['平成', '令和'], '令和'],
    ['gender', '男性', ['女性', '男性'], '男性'],
    ['ageDecade', '20代', ['10代', '20代'], '20代'],
    ['birthMonth', '5', ['1', '5'], '5'],
    ['birthDay', '7', ['3', '7'], '7'],
  ] as [Category, string, string[], string][])('resolves %s %s to %s', (category, raw, texts, expected) => {
    expect(matchOption(category, opts(texts), raw)?.text).toBe(expected);
  });

  it.each([
    ['prefecture', '火星都', ['東京都']],
    ['gender', '不明', ['男性', '女性']],
    ['ageDecade', '5歳', ['10代', '20代']],
    ['birthMonth', 'なし', ['1', '5']],
    ['email', 'a@b.c', ['a@b.c']],
  ] as [Category, string, string[]][])('returns null for %s %s', (category, raw, texts) => {
    expect(matchOption(category, opts(texts), raw)).toBeNull();
  });
});
