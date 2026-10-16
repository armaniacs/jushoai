// Locks the current NFKC split (finding D): rule matchers case-fold through
// literals.norm, while option/profile matchers only trim (plus width-fold).
// The two must not be silently unified — lowercasing profile romaji or
// case-sensitive rule matching would both be regressions. Green by design:
// these pin behavior, they do not demand a fix.
import { describe, expect, it } from 'vitest';
import { classifyField } from '../../src/core/classify-rules';
import { matchEraOption, matchNumberOption } from '../../src/core/eras';
import { matchGenderOption } from '../../src/core/genders';
import { norm } from '../../src/core/literals';
import { matchPrefectureOption } from '../../src/core/prefectures';
import { normalizeProfile } from '../../src/core/profile';
import { EMPTY_PROFILE } from '../../src/core/types';
import { makeMeta } from '../helpers';

describe('normalize parity (case-fold vs trim)', () => {
  it('norm case-folds without trimming', () => {
    expect(norm('　ＡＢＣ　')).toBe(' abc ');
    expect(norm('YAMADA')).toBe('yamada');
  });

  it('rule matching stays case-insensitive through norm', () => {
    expect(classifyField(makeMeta({ label: 'EMAIL' }))?.category).toBe('email');
    expect(classifyField(makeMeta({ label: 'Phone' }))?.category).toBe('tel');
  });

  it('profile romaji width-folds but keeps case (no case-fold)', () => {
    const p = normalizeProfile({ ...EMPTY_PROFILE, lastNameRomaji: 'Ｙａｍａｄａ ' });
    expect(p.lastNameRomaji).toBe('Yamada');
    expect(norm('Ｙａｍａｄａ')).toBe('yamada');
  });

  it('option matchers trim ideographic spaces', () => {
    expect(matchGenderOption([{ value: '1', text: '男性' }], '　男性　')?.text).toBe('男性');
    expect(matchEraOption([{ value: 'r', text: '令和' }], ' 令和 ')?.text).toBe('令和');
  });

  it('option matchers width-fold digits without lowercasing semantics', () => {
    expect(matchNumberOption([{ value: '5', text: '５月' }], 5)?.value).toBe('5');
  });

  it('prefecture matching strips the suffix after trimming', () => {
    expect(matchPrefectureOption([{ value: '13', text: '東京都' }], ' 東京 ')?.value).toBe('13');
  });
});
