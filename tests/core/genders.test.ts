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

  // PBI-212: English form vocabulary. The real page (nishimachi-inquiry.html)
  // ships value="Male" and label text "Male", so an English option resolves at
  // the exact text stage (stage 1) and the exact value stage (stage 2) of the
  // 3-stage fallback; the leading-character stage (stage 3) stays Japanese-only
  // (男/女). Fixtures pin the stage each label matches at before the alias lands.
  it('resolves English options at the exact text stage (PBI-212)', () => {
    // value 'x' cannot match, so only the text stage can resolve.
    expect(matchGenderOption([{ value: 'x', text: 'Male' }], '男性')?.value).toBe('x');
    expect(matchGenderOption([{ value: 'x', text: 'Female' }], '女性')?.value).toBe('x');
  });

  it('resolves English options at the exact value stage (PBI-212)', () => {
    // Empty text skips the text and leading-character stages, so only the
    // value stage can resolve.
    expect(matchGenderOption([{ value: 'Male', text: '' }], '男性')?.value).toBe('Male');
    expect(matchGenderOption([{ value: 'Female', text: '' }], '女性')?.value).toBe('Female');
  });

  it('resolves the real page shape where value and text are both English (PBI-212)', () => {
    const opts = [{ value: 'Male', text: 'Male' }, { value: 'Female', text: 'Female' }];
    expect(matchGenderOption(opts, '男性')?.value).toBe('Male');
    expect(matchGenderOption(opts, '女性')?.value).toBe('Female');
  });

  it('keeps the leading-character stage Japanese-only (PBI-212)', () => {
    // English abbreviations never resolve by leading char: stage 3 stays the
    // 男/女 vocabulary (the abbreviated-select pin above), so an English
    // initial does not fill a Japanese profile value.
    expect(matchGenderOption([{ value: 'x', text: 'M' }], '男性')).toBeNull();
    expect(matchGenderOption([{ value: 'x', text: 'F' }], '女性')).toBeNull();
  });
});
