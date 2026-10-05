import { describe, it, expect } from 'vitest';
import {
  matchEraOption, matchNumberOption, splitBirthday, toEraDate,
} from '../../src/core/eras';
import type { SelectOption } from '../../src/core/types';

const opts = (pairs: [string, string][]): SelectOption[] =>
  pairs.map(([value, text]) => ({ value, text }));

describe('toEraDate', () => {
  it.each([
    ['2019-04-30', '平成', 31],
    ['2019-05-01', '令和', 1],
    ['1989-01-07', '昭和', 64],
    ['1989-01-08', '平成', 1],
    ['1926-12-24', '大正', 15],
    ['1926-12-25', '昭和', 1],
    ['1990-05-07', '平成', 2],
  ])('converts %s to %s %s', (iso, era, year) => {
    expect(toEraDate(iso)).toEqual({ era, year });
  });

  it('returns null outside the table and for garbage', () => {
    expect(toEraDate('1868-09-07')).toBeNull();
    expect(toEraDate('')).toBeNull();
    expect(toEraDate('1990/5/7')).toBeNull();
  });
});

describe('splitBirthday', () => {
  it('splits a normalized ISO date', () => {
    expect(splitBirthday('1990-05-07')).toEqual({ y: '1990', m: '05', d: '07' });
  });

  it('returns null for blank and unnormalized input', () => {
    expect(splitBirthday('')).toBeNull();
    expect(splitBirthday('1990/5/7')).toBeNull();
  });
});

describe('matchNumberOption', () => {
  const options = opts([['', '--'], ['04', '4'], ['05', '5月']]);

  it('matches by value or text across notations', () => {
    expect(matchNumberOption(options, 5)).toEqual({ value: '05', text: '5月' });
    expect(matchNumberOption(options, 4)).toEqual({ value: '04', text: '4' });
  });

  it('returns null when nothing matches', () => {
    expect(matchNumberOption(options, 7)).toBeNull();
    expect(matchNumberOption(options, NaN)).toBeNull();
  });
});

describe('matchEraOption', () => {
  const options = opts([['', '--'], ['平成', '平成'], ['令和', '令和']]);

  it('prefers text equality, then value equality', () => {
    expect(matchEraOption(options, '平成')).toEqual({ value: '平成', text: '平成' });
    expect(matchEraOption(opts([['h', '平成']]), '平成')).toEqual({ value: 'h', text: '平成' });
  });

  it('returns null for blank or unknown eras', () => {
    expect(matchEraOption(options, '')).toBeNull();
    expect(matchEraOption(options, '昭和')).toBeNull();
  });
});
