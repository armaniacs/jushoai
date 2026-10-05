import { describe, it, expect } from 'vitest';
import { buildPlan } from '../../src/core/planner';
import type { Item } from '../../src/core/classify-rules';
import type { Address, Category, FieldMeta, KanaKind, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  birthday: '1990-05-07', school: '都立日比谷高校', department: '普通科',
  email: 'yamada@example.com', tel: '09012345678',
};
const address: Address = {
  id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
  city: '千代田区', street: '千代田1-1', building: '千代田ビル101',
};

let seq = 0;
const item = (category: Category, meta: Partial<FieldMeta> = {}, kanaKind?: KanaKind): Item => ({
  meta: makeMeta({ id: `f${seq++}`, ...meta }),
  cls: { category, confidence: 0.8, source: 'rule', ...(kanaKind ? { kanaKind } : {}) },
});
const values = (items: Item[], address_: Address | null = address) =>
  buildPlan(items, { profile, address: address_ }).map((p) => p.value);

describe('names', () => {
  it('fills split names', () => {
    expect(values([item('lastName'), item('firstName')])).toEqual(['山田', '太郎']);
  });

  it('joins a single name field by placeholder style', () => {
    expect(values([item('fullName', { placeholder: '山田　太郎' })])).toEqual(['山田　太郎']);
    expect(values([item('fullName', { placeholder: '山田太郎' })])).toEqual(['山田太郎']);
    expect(values([item('fullName')])).toEqual(['山田 太郎']);
  });

  it('formats kana by kind', () => {
    expect(values([item('fullNameKana', {}, 'halfKatakana')])).toEqual(['ﾔﾏﾀﾞ ﾀﾛｳ']);
    expect(values([item('lastNameKana', {}, 'hiragana')])).toEqual(['やまだ']);
    expect(values([item('firstNameKana')])).toEqual(['タロウ']);
  });
});

describe('tel and zip', () => {
  it('formats a single tel field', () => {
    expect(values([item('tel')])).toEqual(['09012345678']);
    expect(values([item('tel', { placeholder: '090-1234-5678' })])).toEqual(['090-1234-5678']);
  });

  it('fills split tel and zip fields', () => {
    expect(values([item('tel1'), item('tel2'), item('tel3')])).toEqual(['090', '1234', '5678']);
    expect(values([item('zip1'), item('zip2')])).toEqual(['100', '0001']);
    expect(values([item('zip')])).toEqual(['1000001']);
    expect(values([item('zip', { maxLength: 8 })])).toEqual(['100-0001']);
  });
});

describe('address composition', () => {
  it('addressFull appends the building when there is no building field', () => {
    expect(values([item('addressFull')])).toEqual(['東京都千代田区千代田1-1 千代田ビル101']);
  });

  it('omits the building when a building field exists', () => {
    expect(values([item('addressNoPref'), item('building')])).toEqual([
      '千代田区千代田1-1', '千代田ビル101',
    ]);
  });

  it('fills fully split addresses', () => {
    const plan = values([item('prefecture'), item('city'), item('street'), item('building')]);
    expect(plan).toEqual(['東京都', '千代田区', '千代田1-1', '千代田ビル101']);
  });

  it('omits address fields when no address is selected', () => {
    expect(values([item('prefecture'), item('lastName')], null)).toEqual(['山田']);
  });
});

describe('select and states', () => {
  const options = [
    { value: '', text: '選択してください' },
    { value: '13', text: '東京都' },
  ];

  it('resolves a prefecture select to the option value', () => {
    const p = buildPlan([item('prefecture', { tag: 'select', options })], { profile, address })[0]!;
    expect(p).toMatchObject({ value: '13', display: '東京都', status: 'ok' });
  });

  it('treats a select resting on its first option as empty', () => {
    const opts = [{ value: '1', text: '北海道' }, { value: '13', text: '東京都' }];
    const p = buildPlan([item('prefecture', { tag: 'select', options: opts, value: '1' })], { profile, address })[0]!;
    expect(p.status).toBe('ok');
    expect(p.value).toBe('13');
  });

  it('marks a chosen select as filled', () => {
    const p = buildPlan([item('prefecture', { tag: 'select', options, value: '13' })], { profile, address })[0]!;
    expect(p.status).toBe('filled');
  });

  it('warns when no option matches', () => {
    const p = buildPlan(
      [item('prefecture', { tag: 'select', options: [{ value: '', text: '-' }, { value: 'x', text: '海外' }] })],
      { profile, address },
    )[0]!;
    expect(p.status).toBe('warn-no-option');
  });

  it('warns on maxlength overflow instead of truncating', () => {
    const p = buildPlan([item('addressFull', { maxLength: 10 })], { profile, address })[0]!;
    expect(p.status).toBe('warn-maxlength');
  });

  it('does not overwrite filled inputs and skips readonly/disabled', () => {
    const plan = buildPlan(
      [item('lastName', { value: '佐藤' }), item('firstName', { readOnly: true }), item('email', { disabled: true })],
      { profile, address },
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]!.status).toBe('filled');
  });

  it('keeps the classification source for the preview', () => {
    const llm: Item = { meta: makeMeta({ id: 'x' }), cls: { category: 'email', confidence: 0.5, source: 'llm' } };
    expect(buildPlan([llm], { profile, address })[0]!.source).toBe('llm');
  });
});
