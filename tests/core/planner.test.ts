import { describe, it, expect } from 'vitest';
import { buildPlan } from '../../src/core/planner';
import type { Item } from '../../src/core/classify-rules';
import type { Address, Category, FieldMeta, KanaKind, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '女性',
  birthday: '1990-05-07', school: '都立日比谷高校', department: '普通科',
  email: 'yamada@example.com', tel: '09012345678',
};
const address: Address = {
  id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
  city: '千代田区', street: '千代田1-1', building: '千代田ビル101',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};
const overseas: Address = {
  ...address, id: 'a2', label: '海外',
  country: 'United States', address1: '#123 Central Apartment',
  address2: '25-15 M.G.Peterson Ave', address3: 'Long Island City',
  address4: 'NEW YORK', postalCode: '11375',
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

  it('fills romaji names in western order', () => {
    expect(values([item('lastNameRomaji'), item('firstNameRomaji')])).toEqual(['Yamada', 'Taro']);
    expect(values([item('fullNameRomaji')])).toEqual(['Taro Yamada']);
  });

  it('skips romaji fields when no romaji is registered', () => {
    const bare = { ...profile, lastNameRomaji: '', firstNameRomaji: '' };
    const plan = buildPlan([item('fullNameRomaji')], { profile: bare, address });
    expect(plan).toEqual([]);
  });
});

describe('gender select', () => {
  const options = [
    { value: '', text: '選択してください' },
    { value: '男性', text: '男性' },
    { value: '女性', text: '女性' },
    { value: 'その他', text: 'その他' },
  ];

  it('resolves a gender select to the matching option', () => {
    const p = buildPlan([item('gender', { tag: 'select', options })], { profile, address })[0]!;
    expect(p).toMatchObject({ value: '女性', display: '女性', status: 'ok' });
  });

  it('matches abbreviated options by leading character', () => {
    const opts = [{ value: '0', text: '男' }, { value: '1', text: '女' }];
    const p = buildPlan([item('gender', { tag: 'select', options: opts })], { profile, address })[0]!;
    expect(p).toMatchObject({ value: '1', status: 'ok' });
  });

  it('warns when no option matches and skips when gender is empty', () => {
    const other = { ...profile, gender: '回答しない' };
    const warn = buildPlan(
      [item('gender', { tag: 'select', options: [{ value: '', text: '-' }, { value: 'x', text: '男性' }] })],
      { profile: other, address },
    )[0]!;
    expect(warn.status).toBe('warn-no-option');
    const bare = { ...profile, gender: '' };
    expect(buildPlan([item('gender', { tag: 'select', options })], { profile: bare, address })).toEqual([]);
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

describe('age decade select', () => {
  const options = [
    { value: '', text: '-' },
    { value: '0', text: '20代' },
    { value: '1', text: '30代' },
  ];
  const today = new Date(2026, 9, 5);

  it('resolves the decade derived from the birthday', () => {
    const p = buildPlan([item('ageDecade', { tag: 'select', options })], { profile, address, today })[0]!;
    expect(p).toMatchObject({ value: '1', display: '30代', status: 'ok' });
  });

  it('warns when the decade option is missing and skips when birthday is empty', () => {
    const missing = buildPlan(
      [item('ageDecade', { tag: 'select', options: [{ value: '', text: '-' }, { value: '0', text: '20代' }] })],
      { profile, address, today },
    )[0]!;
    expect(missing.status).toBe('warn-no-option');
    const bare = { ...profile, birthday: '' };
    expect(buildPlan([item('ageDecade', { tag: 'select', options })], { profile: bare, address, today })).toEqual([]);
  });
});

describe('overseas address', () => {
  const abroad = (items: Item[]) =>
    buildPlan(items, { profile, address: overseas }).map((p) => p.value);

  it('fills country, address lines, and postal code', () => {
    expect(abroad([
      item('country'), item('address1'), item('address2'),
      item('address3'), item('address4'), item('postalCode'),
    ])).toEqual([
      'United States', '#123 Central Apartment', '25-15 M.G.Peterson Ave',
      'Long Island City', 'NEW YORK', '11375',
    ]);
  });

  it('skips overseas fields when nothing is registered', () => {
    expect(values([item('country'), item('address1'), item('postalCode')])).toEqual([]);
  });
});

describe('birthday', () => {
  const dated = { ...profile, birthday: '1990-05-07' };
  const datedValues = (items: Item[]) =>
    buildPlan(items, { profile: dated, address }).map((p) => p.value);

  it('splits an ISO birthday', () => {
    expect(datedValues([item('birthYear'), item('birthMonth'), item('birthDay')])).toEqual(['1990', '05', '07']);
  });

  it('uses the wareki year when the form has an era field', () => {
    const plan = buildPlan([item('birthEra'), item('birthYear')], { profile: dated, address });
    expect(plan.map((p) => p.value)).toEqual(['平成', '2']);
  });

  it('skips birth fields when the birthday is empty or malformed', () => {
    expect(buildPlan([item('birthYear')], { profile: { ...profile, birthday: '' }, address })).toEqual([]);
    expect(buildPlan([item('birthYear')], { profile: { ...dated, birthday: '1990/5/7' }, address })).toEqual([]);
  });
});

describe('school', () => {
  const schooled = { ...profile, school: '都立日比谷高校', department: '普通科' };

  it('fills school and department, skips when blank', () => {
    const vals = buildPlan([item('school'), item('department')], { profile: schooled, address }).map((p) => p.value);
    expect(vals).toEqual(['都立日比谷高校', '普通科']);
    expect(buildPlan([item('school')], { profile: { ...profile, school: '' }, address })).toEqual([]);
  });
});

describe('birth selects', () => {
  const dated = { ...profile, birthday: '1990-05-07' };
  const monthOpts = [{ value: '', text: '--' }, { value: '04', text: '4' }, { value: '05', text: '5' }];

  it('matches month options by number across notations', () => {
    const plan = buildPlan([item('birthMonth', { tag: 'select', options: monthOpts })], { profile: dated, address });
    expect(plan.map((p) => [p.value, p.display, p.status])).toEqual([[ '05', '5', 'ok' ]]);
  });

  it('warns when no option matches and keeps filled selects', () => {
    const noMatch = buildPlan(
      [item('birthMonth', { tag: 'select', options: [{ value: '', text: '--' }] })],
      { profile: dated, address },
    );
    expect(noMatch.map((p) => p.status)).toEqual(['warn-no-option']);
    const filled = buildPlan(
      [item('birthMonth', { tag: 'select', value: '04', options: monthOpts })],
      { profile: dated, address },
    );
    expect(filled.map((p) => p.status)).toEqual(['filled']);
  });

  it('matches an era option by text', () => {
    const plan = buildPlan(
      [item('birthEra', { tag: 'select', options: [{ value: '', text: '--' }, { value: '平成', text: '平成' }, { value: '令和', text: '令和' }] })],
      { profile: dated, address },
    );
    expect(plan.map((p) => [p.value, p.display, p.status])).toEqual([[ '平成', '平成', 'ok' ]]);
  });
});

describe('radio groups', () => {
  const genderMeta = (value = '') => makeMeta({
    tag: 'radio', type: 'radio', name: 'g', label: '性別', value,
    options: [{ value: '0', text: '男性' }, { value: '1', text: '女性' }],
  });
  it('resolves the gender option by text', () => {
    const plan = buildPlan([{ meta: genderMeta(), cls: { category: 'gender', confidence: 0.7, source: 'rule' } }], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '1', display: '女性', status: 'ok' })]);
  });
  it('marks a checked group filled and an unmatched value warn-no-option', () => {
    const checked = buildPlan([{ meta: genderMeta('0'), cls: { category: 'gender', confidence: 0.7, source: 'rule' } }], { profile, address });
    expect(checked[0]!.status).toBe('filled');
    const noMatch = buildPlan([{
      meta: makeMeta({ tag: 'radio', type: 'radio', name: 'g', label: '性別', options: [{ value: '0', text: '男' }] }),
      cls: { category: 'gender', confidence: 0.7, source: 'rule' },
    }], { profile: { ...profile, gender: 'X' }, address });
    expect(noMatch[0]!.status).toBe('warn-no-option');
  });
  it('resolves the decade from the birthday and rejects a disabled match', () => {
    const decade = makeMeta({
      tag: 'radio', type: 'radio', name: 'a', label: '年齢',
      options: [{ value: '0', text: '20代' }, { value: '1', text: '30代' }],
    });
    const plan = buildPlan(
      [{ meta: decade, cls: { category: 'ageDecade', confidence: 0.7, source: 'rule' } }],
      { profile, address, today: new Date('2026-10-05') },
    );
    expect(plan[0]).toEqual(expect.objectContaining({ value: '1', display: '30代', status: 'ok' }));
    const disabled = buildPlan(
      [{
        meta: makeMeta({ ...decade, options: [{ value: '1', text: '30代', disabled: true }] }),
        cls: { category: 'ageDecade', confidence: 0.7, source: 'rule' },
      }],
      { profile, address, today: new Date('2026-10-05') },
    );
    expect(disabled[0]!.status).toBe('warn-no-option');
  });
});
