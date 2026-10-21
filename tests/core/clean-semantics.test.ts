// PBI-116 fixture: pins the trim-bearing semantics of the option/profile
// matchers BEFORE promoting the shared clean helper, so the consolidation is
// behavior-neutral. Green before AND after; must not duplicate
// normalize-parity.test.ts, which locks the norm side (case-fold, no trim).
// Pinned per matcher kind:
// - option matchers (eras/genders/prefectures): NFKC + trim of U+0020/U+3000,
//   case preserved (no toLowerCase), on text AND value paths
// - profile values: NFKC + trim through kana/gender/email/birthday; tel digits
//   drop whitespace wherever it sits (no trim ordering dependency)
// - prefectures strip: trim + 都道府県 suffix removal after it
import { describe, expect, it } from 'vitest';
import { matchDecadeOption, matchEraOption, matchNumberOption } from '../../src/core/eras';
import { matchGenderOption } from '../../src/core/genders';
import { matchPrefectureOption } from '../../src/core/prefectures';
import { normalizeAddress, normalizeProfile } from '../../src/core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';

describe('PBI-116 clean semantics (trim-bearing matchers, pinned before promotion)', () => {
  it('gender option matches by NFKC+trim value with the prefix fallback intact', () => {
    expect(matchGenderOption([{ value: ' 男性 ', text: 'male' }], '男性')?.value).toBe(' 男性 ');
    expect(matchGenderOption([{ value: '1', text: '男' }], '　男性　')?.text).toBe('男');
  });

  it('era option matches the value path and never lowercases option text', () => {
    expect(matchEraOption([{ value: ' 令和 ', text: 'Ｒ' }], '令和')?.value).toBe(' 令和 ');
    // clean('Ｒ') stays 'R': a toLowerCase here would be a norm leak.
    expect(matchEraOption([{ value: 'Ｒ', text: '令和' }], 'r')).toBeNull();
  });

  it('decade option width-folds full-width option text and falls back to leading digits', () => {
    expect(matchDecadeOption([{ value: '２０', text: '２０代' }], '20代')?.value).toBe('２０');
    expect(matchDecadeOption([{ value: '20', text: '２０歳以上' }], '２０代 ')?.value).toBe('20');
  });

  it('number option reads leading digits from a full-width value', () => {
    expect(matchNumberOption([{ value: '０５', text: '五月' }], 5)?.value).toBe('０５');
  });

  it('prefecture strip removes the suffix on the value path too', () => {
    expect(matchPrefectureOption([{ value: ' 東京都 ', text: 'Tokyo' }], '東京')?.value).toBe(' 東京都 ');
  });

  it('profile values canonicalize through NFKC+trim with case kept', () => {
    const p = normalizeProfile({
      ...EMPTY_PROFILE,
      gender: '　女性　',
      email: '　ＹＡＭＡＤＡ＠ＥＸＡＭＰＬＥ.ＣＯＭ　',
      birthday: '１９９０年５月７日',
      lastNameKana: '　やまだ　',
    });
    expect(p.gender).toBe('女性');
    expect(p.email).toBe('YAMADA@EXAMPLE.COM');
    expect(p.birthday).toBe('1990-05-07');
    expect(p.lastNameKana).toBe('ヤマダ');
  });

  it('tel digits drop whitespace wherever it sits (no trim ordering dependency)', () => {
    expect(normalizeProfile({ ...EMPTY_PROFILE, tel: '　０９０-１２３４-５６７８　' }).tel).toBe('09012345678');
  });

  it('address overseas lines width-fold and trim without changing case', () => {
    expect(normalizeAddress({ ...EMPTY_ADDRESS, country: '　Ｊａｐａｎ ' }).country).toBe('Japan');
  });
});
