import { describe, it, expect } from 'vitest';
import { abbreviateBuilding } from '../../src/core/abbreviate';
import { applyAbbrevApprovals, buildPlan } from '../../src/core/planner';
import type { Address, Category, FieldMeta, Item, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: '', firstNameRomaji: '',
  gender: '', birthday: '', school: '', department: '',
  companyName: '', companyDepartment: '',
  email: 'yamada@example.com', tel: '',
};
const address: Address = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都',
  city: '千代田区', street: '千代田1-1', building: 'サンプルパークマンション',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

let seq = 0;
const item = (category: Category, meta: Partial<FieldMeta> = {}): Item => ({
  meta: makeMeta({ id: `f${seq++}`, ...meta }),
  cls: { category, confidence: 0.8, source: 'rule' },
});

describe('building abbreviation rules (PBI-122)', () => {
  it('shortens residence suffixes to 邸', () => {
    expect(abbreviateBuilding('サンプルパークマンション')).toBe('サンプルパーク邸');
    expect(abbreviateBuilding('グリーンハイツ')).toBe('グリーン邸');
    expect(abbreviateBuilding('サニーアパート')).toBe('サニー邸');
    expect(abbreviateBuilding('山手コーポラス')).toBe('山手邸');
    expect(abbreviateBuilding('富士見コーポ')).toBe('富士見邸');
    expect(abbreviateBuilding('中央レジデンス')).toBe('中央邸');
  });

  it('shortens ビルディング to ビル and never lengthens a name', () => {
    expect(abbreviateBuilding('サンプルビルディング')).toBe('サンプルビル');
    // No rule fires: ビル has no shorter replacement, so the name is unchanged.
    expect(abbreviateBuilding('千代田ビル101')).toBe('千代田ビル101');
  });

  it('removes full-width decorative spaces before the tail scan and keeps half-width gaps', () => {
    expect(abbreviateBuilding('サンプル　マンション')).toBe('サンプル邸');
    // 半角空白は英語表記の語間なので保持され、号室の前の接尾語は置換しない（末尾に一度だけ）。
    expect(abbreviateBuilding('グリーンハイツ 101号室')).toBe('グリーンハイツ 101号室');
    expect(abbreviateBuilding('サンプル　マンション　203号室')).toBe('サンプルマンション203号室');
  });

  it('is deterministic and keeps names without a rule untouched', () => {
    expect(abbreviateBuilding('山田邸')).toBe('山田邸');
    expect(abbreviateBuilding('101号室')).toBe('101号室');
    expect(abbreviateBuilding('サンプルパークマンション203号室')).toBe('サンプルパークマンション203号室');
  });

  // レビュー指摘の再現 fixture: グローバル置換が複合名を破壊する。
  it('replaces a suffix once at the end and keeps a compound name intact', () => {
    expect(abbreviateBuilding('コーポハイツ')).toBe('コーポ邸');
    expect(abbreviateBuilding('第2コーポハイツ101号室')).toBe('第2コーポハイツ101号室');
  });

  // レビュー指摘の再現 fixture: 全空白除去が半角英数名を破壊する。
  it('keeps half-width spaces (word gaps in an English name)', () => {
    expect(abbreviateBuilding('GREEN HEIGHTS 2')).toBe('GREEN HEIGHTS 2');
  });
});

describe('planner abbreviation candidate (PBI-122)', () => {
  it('offers a fitting abbreviation on an overflowing building field', () => {
    // raw is 12 chars, the shortened form 8: overflow at 10, candidate fits.
    const plan = buildPlan([item('building', { maxLength: 10 })], { profile, address });
    expect(plan[0]).toMatchObject({
      value: '',
      status: 'warn-maxlength',
      abbrev: 'サンプルパーク邸',
      display: 'サンプルパークマンション → サンプルパーク邸',
    });
  });

  it('keeps the plain warn-maxlength row when no abbreviation fits', () => {
    const plan = buildPlan([item('building', { maxLength: 3 })], { profile, address });
    expect(plan[0]).toMatchObject({ value: '', status: 'warn-maxlength' });
    expect(plan[0]!.abbrev).toBeUndefined();
    expect(plan[0]!.display).toBe('サンプルパークマンション');
  });

  it('does not offer an abbreviation without an overflow', () => {
    const plan = buildPlan([item('building', { maxLength: 20 })], { profile, address });
    expect(plan[0]).toMatchObject({ value: 'サンプルパークマンション', status: 'ok' });
    expect(plan[0]!.abbrev).toBeUndefined();
  });

  it('shortens only the appended building tail of composed fields', () => {
    // street composes 千代田1-1 + ' ' + building (19 chars); the tail shortens
    // to 8, so the candidate fits the 16-char budget.
    const plan = buildPlan([item('street', { maxLength: 16 })], { profile, address });
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.abbrev).toBe('千代田1-1 サンプルパーク邸');
  });

  it('keeps composed fields plain when the base already overflows', () => {
    const plan = buildPlan([item('addressFull', { maxLength: 10 })], { profile, address });
    // The prefecture+city+street base alone exceeds the budget: no rescue.
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.abbrev).toBeUndefined();
  });

  it('keeps street plain when a dedicated building field exists', () => {
    const plan = buildPlan([item('street', { maxLength: 5 }), item('building')], { profile, address });
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.abbrev).toBeUndefined();
  });

  // レビュー指摘の再現 fixture: raw は幅変換済みなのに対し a.building は未変換の
  // profile 値のため、full/half 強制下で endsWith が必ず失敗し候補が無音に消える。
  const wide: Address = { ...address, id: 'a2', label: '自宅', building: 'グリーン2ハイツ' };
  it('offers an abbreviation under a width-forcing pattern (tail enforced like the raw)', () => {
    const plan = buildPlan(
      [item('street', { maxLength: 13, pattern: '[０-９]' })],
      { profile, address: wide },
    );
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.abbrev).toBe('千代田１－１ グリーン２邸');
  });

  // レビュー指摘の再現 fixture: fitting が空文字を返すと abbrev が空のまま行に
  // 乗り、承認判定次第で flip する。
  const blank: Address = { ...address, id: 'a3', label: '自宅', street: '千代田', building: '　　' };
  it('never offers an empty shortening for a whitespace-only building tail', () => {
    const plan = buildPlan([item('street', { maxLength: 5 })], { profile, address: blank });
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.abbrev).toBeUndefined();
  });

  it('never offers an empty candidate on an overflowing whitespace-only building', () => {
    const plan = buildPlan(
      [item('building', { maxLength: 1 })],
      { profile, address: { ...address, building: '　　' } },
    );
    expect(plan[0]!.status).toBe('warn-maxlength');
    expect(plan[0]!.abbrev).toBeUndefined();
  });
});

describe('abbreviation approval boundary (PBI-122)', () => {
  const overflowing = () => buildPlan([item('building', { maxLength: 10 })], { profile, address });

  it('injects nothing without approval: the row keeps its empty value', () => {
    const plan = overflowing();
    const untouched = applyAbbrevApprovals(plan, new Set());
    expect(untouched[0]).toMatchObject({ value: '', status: 'warn-maxlength' });
    expect(untouched).toEqual(plan);
  });

  it('flips the row only for the approved field id', () => {
    const plan = overflowing();
    const approved = applyAbbrevApprovals(plan, new Set([plan[0]!.fieldId]));
    expect(approved[0]).toMatchObject({
      value: 'サンプルパーク邸', status: 'ok',
    });
    const other = applyAbbrevApprovals(plan, new Set(['f-other']));
    expect(other[0]).toMatchObject({ value: '', status: 'warn-maxlength' });
  });

  it('never flips a row without a candidate even if its id is approved', () => {
    const plan = [
      ...overflowing(),
      ...buildPlan([item('lastName')], { profile, address }),
    ];
    const approved = applyAbbrevApprovals(plan, new Set([plan[1]!.fieldId]));
    expect(approved[1]).toEqual(plan[1]);
    expect(approved[0]).toMatchObject({ value: '', status: 'warn-maxlength' });
  });
});
