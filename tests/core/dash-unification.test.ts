// PBI-121: dash-kind unification, fixed by fixture before the dash table
// existed. The hyphen family has 7 kinds (U+002D / ‐ U+2010 / – U+2013 /
// — U+2014 / ― U+2015 / − U+2212 / － U+FF0D); NFKC folds only U+FF0D, so the
// typographic kinds left the zip/tel formatting unfired (the old /[-‐－−]/
// never saw them) and dash-kind-only word variants classified differently.
// Dash-likes outside the family (wave dash, middle dot) keep the current path.
// Fixtures use tests/helpers makeMeta per project policy.
import { describe, expect, it } from 'vitest';
import { classifyField } from '../../src/core/classify-rules';
import { unifyDashes } from '../../src/core/dashes';
import { wantsHyphen } from '../../src/core/formatters';
import { buildPlan } from '../../src/core/planner';
import type { Address, Category, FieldMeta, Item, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

// The 7 hyphen kinds the fixture pins, in codepoint order.
const DASH_KINDS = ['-', '‐', '–', '—', '―', '−', '－'] as const;

const kindLabel = (d: string) => `U+${d.codePointAt(0)!.toString(16).padStart(4, '0')}`;

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: '', firstNameRomaji: '',
  gender: '女性', birthday: '1990-05-07', school: '', department: '',
  companyName: '', companyDepartment: '',
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

describe('dash-kind unification (PBI-121)', () => {
  it('formats a zip field hyphenated for every hyphen kind in the placeholder', () => {
    for (const d of DASH_KINDS) {
      const plan = buildPlan([item('zip', { placeholder: `100${d}0001` })], { profile, address });
      expect(plan[0]!.value, `zip placeholder dash ${kindLabel(d)}`).toBe('100-0001');
    }
  });

  it('formats a tel field hyphenated for every hyphen kind in the placeholder', () => {
    for (const d of DASH_KINDS) {
      const plan = buildPlan([item('tel', { placeholder: `090${d}1234${d}5678` })], { profile, address });
      expect(plan[0]!.value, `tel placeholder dash ${kindLabel(d)}`).toBe('090-1234-5678');
    }
  });

  it('keeps dash-likes outside the family on the current path', () => {
    // 〜 (U+301C wave dash) and ・ (U+30FB middle dot) are not hyphen kinds:
    // with no maxlength signal the value stays digits-only, as today.
    for (const d of ['〜', '・'] as const) {
      const plan = buildPlan([item('zip', { placeholder: `100${d}0001` })], { profile, address });
      expect(plan[0]!.value, `non-family dash ${kindLabel(d)}`).toBe('1000001');
    }
  });

  it('reads the family from the placeholder regardless of kind (wantsHyphen)', () => {
    for (const d of DASH_KINDS) {
      expect(wantsHyphen(`100${d}0001`, null, 'zip'), `dash ${kindLabel(d)}`).toBe(true);
    }
    expect(wantsHyphen('100〜0001', null, 'zip')).toBe(false);
  });

  it('classifies dash-kind-only word variants the same', () => {
    // The same word with a different dash kind must reach the same category
    // (the kana-token normalization direction).
    expect(classifyField(makeMeta({ label: 'e-mail' }))?.category).toBe('email');
    expect(classifyField(makeMeta({ label: 'e–mail' }))?.category).toBe('email');
    expect(classifyField(makeMeta({ label: 'e―mail' }))?.category).toBe('email');
  });

  // FOLD_KINDS（HYPHEN_KINDS からの減算で導出された 4種）すべての pin。
  it('folds every FOLD_KINDS member in matched text (unifyDashes)', () => {
    for (const d of ['‐', '–', '—', '―'] as const) {
      expect(unifyDashes(`e${d}mail`), `fold dash ${kindLabel(d)}`).toBe('e-mail');
    }
  });

  it('leaves the no-fold kinds of the subtraction untouched in matched text', () => {
    // ASCII '-' は同一文字への fold（無操作）, － U+FF0D は NFKC の own fold,
    // − U+2212 は minus（数値意味）: いずれも unifyDashes は書き換えない。
    expect(unifyDashes('e-mail')).toBe('e-mail');
    expect(unifyDashes('e－mail')).toBe('e－mail');
    expect(unifyDashes('e−mail')).toBe('e−mail');
  });
});
