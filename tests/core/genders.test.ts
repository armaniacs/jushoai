import { describe, it, expect } from 'vitest';
import { GENDERS, matchGenderOption } from '../../src/core/genders';

describe('matchGenderOption', () => {
  it('matches exact text and value', () => {
    expect(matchGenderOption([{ value: '女性', text: '女性' }], '女性')?.value).toBe('女性');
    expect(matchGenderOption([{ value: '1', text: '女性' }], '女性')?.value).toBe('1');
  });

  it('matches abbreviated options by leading character', () => {
    expect(matchGenderOption([{ value: '0', text: '男' }], '男性')?.value).toBe('0');
  });

  it('returns null for blank gender or no match', () => {
    expect(matchGenderOption([{ value: 'x', text: '男性' }], '')).toBeNull();
    expect(matchGenderOption([{ value: 'x', text: '男性' }], '回答しない')).toBeNull();
  });

  it('exposes the four profile choices', () => {
    expect([...GENDERS]).toEqual(['男性', '女性', 'その他', '回答しない']);
  });
});
