import { describe, it, expect } from 'vitest';
import { buildPlan, applyAbbrevApprovals, VALUE_ROWS } from '../../src/core/planner';
import type { Address, Category, FieldMeta, Item, KanaKind, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '女性',
  birthday: '1990-05-07', school: '都立日比谷高校', department: '普通科',
  companyName: '株式会社サンプル', companyDepartment: '開発部', jobTitle: '課長',
  companyNameKana: 'カブシキガイシャサンプル',
  email: 'yamada@example.com', tel: '09012345678',
};
const address: Address = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都',
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

  it('keeps romaji fields as warn-no-value when no romaji is registered', () => {
    const bare = { ...profile, lastNameRomaji: '', firstNameRomaji: '' };
    const plan = buildPlan([item('fullNameRomaji')], { profile: bare, address });
    expect(plan).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
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

  it('warns when no option matches and when gender is empty', () => {
    const other = { ...profile, gender: '回答しない' };
    const warn = buildPlan(
      [item('gender', { tag: 'select', options: [{ value: '', text: '-' }, { value: 'x', text: '男性' }] })],
      { profile: other, address },
    )[0]!;
    expect(warn.status).toBe('warn-no-option');
    const bare = { ...profile, gender: '' };
    expect(buildPlan([item('gender', { tag: 'select', options })], { profile: bare, address })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
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

  it('marks address fields warn-no-value when no address is selected', () => {
    const plan = buildPlan([item('prefecture'), item('lastName')], { profile, address: null });
    expect(plan.map((p) => [p.category, p.value, p.status])).toEqual([
      ['prefecture', '', 'warn-no-value'],
      ['lastName', '山田', 'ok'],
    ]);
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

  it('warns when the decade option is missing and when birthday is empty', () => {
    const missing = buildPlan(
      [item('ageDecade', { tag: 'select', options: [{ value: '', text: '-' }, { value: '0', text: '20代' }] })],
      { profile, address, today },
    )[0]!;
    expect(missing.status).toBe('warn-no-option');
    const bare = { ...profile, birthday: '' };
    expect(buildPlan([item('ageDecade', { tag: 'select', options })], { profile: bare, address, today })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
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

  it('marks overseas fields warn-no-value when nothing is registered', () => {
    const plan = buildPlan([item('country'), item('address1'), item('postalCode')], { profile, address });
    expect(plan.map((p) => [p.category, p.value, p.status])).toEqual([
      ['country', '', 'warn-no-value'],
      ['address1', '', 'warn-no-value'],
      ['postalCode', '', 'warn-no-value'],
    ]);
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

  it('marks birth fields warn-no-value when the birthday is empty or malformed', () => {
    for (const birthday of ['', '1990/5/7']) {
      const plan = buildPlan([item('birthYear')], { profile: { ...profile, birthday }, address });
      expect(plan).toEqual([
        expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
      ]);
    }
  });

  it('fills a single birthday field with ISO and warns on uninterpretable values (PBI-118)', () => {
    expect(datedValues([item('birthday')])).toEqual(['1990-05-07']);
    const plan = buildPlan([item('birthday')], { profile: { ...profile, birthday: '1990/5/7' }, address });
    expect(plan).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });

  // レビュー指摘の再現 fixture: rollover 日付が birthday case に混入しないこと。
  it('keeps a rollover birthday out of every birth case (warn-no-value)', () => {
    const plan = buildPlan(
      [item('birthday'), item('birthYear'), item('birthMonth'), item('birthDay')],
      { profile: { ...profile, birthday: '1990-02-30' }, address },
    );
    expect(plan.map((p) => p.status)).toEqual([
      'warn-no-value', 'warn-no-value', 'warn-no-value', 'warn-no-value',
    ]);
  });
});

// PBI-210: the value-pattern-fit axis. The planner checks the value against the
// page's own pattern attribute (anchored full match, HTML spec) at the same
// position as the maxlength axis: a violating value becomes a warn row with an
// empty value (never injected, even on approval), a matching one stays ok.
describe('value pattern fit (PBI-210)', () => {
  // The nishimachi Date of Birth field's own pattern (samples/nishimachi-inquiry.html).
  const mmdd = '[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';

  it('warns on a pattern-violating value instead of injecting it', () => {
    const plan = buildPlan([item('birthday', { pattern: mmdd, maxLength: 10 })], { profile, address });
    expect(plan).toEqual([
      expect.objectContaining({ value: '', display: '1990-05-07', status: 'warn-pattern' }),
    ]);
  });

  // Both axes fire on one value: the maxlength branch runs first (the branch
  // order in buildPlan), so the row keeps warn-maxlength and never shifts to
  // warn-pattern (review Minor: implemented by branch order but untested).
  it('keeps maxlength ahead when a value both overflows and violates the pattern (warn-maxlength)', () => {
    const plan = buildPlan([item('birthday', { pattern: mmdd, maxLength: 5 })], { profile, address });
    expect(plan).toEqual([
      expect.objectContaining({ value: '', display: '1990-05-07', status: 'warn-maxlength' }),
    ]);
  });

  it('keeps a pattern-matching value ok', () => {
    const plan = buildPlan(
      [item('birthday', { pattern: '[0-9]{4}-[0-9]{2}-[0-9]{2}', maxLength: 10 })],
      { profile, address },
    );
    expect(plan).toEqual([expect.objectContaining({ value: '1990-05-07', status: 'ok' })]);
  });

  it('keeps fields without a pattern conventional', () => {
    expect(buildPlan([item('birthday')], { profile, address })).toEqual([
      expect.objectContaining({ value: '1990-05-07', status: 'ok' }),
    ]);
  });

  it('skips an unparseable pattern (fail-open, like the browser)', () => {
    const plan = buildPlan([item('birthday', { pattern: '([0-9]{4}' })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '1990-05-07', status: 'ok' })]);
  });

  // form-mailer.jp pages ship pattern="1"/"5"/"6" as internal check-type codes on
  // novalidate forms (the real pages do not enforce them): a bare literal with no
  // regex structure is page noise, so the fit check skips it and the fill keeps working.
  // fail-open は意図（PBI-213 で B 採択、2026-11-01）
  it('skips a bare-literal pattern with no regex structure (fail-open)', () => {
    const plan = buildPlan([item('lastName', { pattern: '1' })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '山田', status: 'ok' })]);
  });

  // PBI-213: the same fail-open intent for the other shipped codes. "5"/"6" are
  // the bare literals the form-mailer.jp fixtures carry (12fc22bc297429 /
  // 2dd1c663300469), pinned so the no-structure skip covers every shipped
  // variant instead of "1" only.
  it('skips bare-literal patterns "5" and "6" with no regex structure (fail-open)', () => {
    expect(buildPlan([item('lastName', { pattern: '5' })], { profile, address })).toEqual([
      expect.objectContaining({ value: '山田', status: 'ok' }),
    ]);
    expect(buildPlan([item('lastName', { pattern: '6' })], { profile, address })).toEqual([
      expect.objectContaining({ value: '山田', status: 'ok' }),
    ]);
  });

  // PBI-213: the tel fields on the form-mailer.jp fixtures carry pattern="^\d+$"
  // (structural, so the fit check runs on them even though the novalidate pages
  // never enforce it). A hyphenated tel violates it, which pins the checked side
  // of the gate for tel — none of the PBI-210 tests above cover the tel type.
  it('checks a tel field with a structural pattern (warns on a violating value)', () => {
    const plan = buildPlan(
      [item('tel', { type: 'tel', pattern: '^\\d+$' })],
      { profile: { ...profile, tel: '090-1234-5678' }, address },
    );
    expect(plan).toEqual([expect.objectContaining({ value: '', display: '090-1234-5678', status: 'warn-pattern' })]);
  });

  // The pattern attribute governs text/search/url/tel/email/password only; a
  // type=date value must stay ISO or it stops being a date (the width axis's
  // own rule), and the browser never enforces a date input's pattern.
  it('skips a date input whose pattern the browser never enforces', () => {
    const plan = buildPlan([item('birthday', { type: 'date', pattern: '[０-９]{4}' })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '1990-05-07', status: 'ok' })]);
  });
});

// The pattern attribute is page-controlled, so a crafted nested-quantifier
// pattern must fall open (check skipped, no warn) instead of being compiled
// and tested against profile values.
describe('value pattern fall-open (PBI-243)', () => {
  // The BDD crafted pattern. Without the fall-open lint this value exhausts
  // exponentially against the anchored `^(?:a|aa)+$` (every split of the 40
  // a's into 1s and 2s is retried before the b fails the match). The RED run
  // cannot fail at the configured 5s testTimeout — a timer cannot fire inside
  // a synchronous backtracking freeze — and the observed kill was ~48s.
  it('skips a nested-quantifier crafted pattern (fall open, completes synchronously)', () => {
    const value = 'a'.repeat(40) + 'b';
    const plan = buildPlan(
      [item('lastName', { pattern: '(a|aa)+' })],
      { profile: { ...profile, lastName: value }, address },
    );
    expect(plan).toEqual([expect.objectContaining({ value, status: 'ok' })]);
  });

  // BDD scenario 2: an ordinary pattern keeps the PBI-210 warn judgment.
  it('keeps warning on an ordinary pattern (\\d{3}-\\d{4})', () => {
    const plan = buildPlan([item('zip', { pattern: '\\d{3}-\\d{4}' })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '', display: '1000001', status: 'warn-pattern' })]);
  });

  // Length caps: at the cap the check still runs, over it the
  // check falls open. The corpus's longest real pattern is ~70 chars and
  // profile values are short, so the bounds never fire on ordinary forms.
  it('still checks a pattern at the length cap', () => {
    const at = '0'.repeat(197) + '{3}';
    expect(at.length).toBe(200);
    const plan = buildPlan([item('lastName', { pattern: at })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '', display: '山田', status: 'warn-pattern' })]);
  });

  it('skips a pattern over the length cap (fall open)', () => {
    const over = '0'.repeat(198) + '{3}';
    expect(over.length).toBe(201);
    const plan = buildPlan([item('lastName', { pattern: over })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '山田', status: 'ok' })]);
  });

  it('still checks a value at the length cap', () => {
    const at = 'a'.repeat(999) + 'b';
    expect(at.length).toBe(1000);
    const plan = buildPlan([item('lastName', { pattern: '\\d{3}-\\d{4}' })], { profile: { ...profile, lastName: at }, address });
    expect(plan).toEqual([expect.objectContaining({ value: '', display: at, status: 'warn-pattern' })]);
  });

  it('skips the check on a value over the length cap (fall open)', () => {
    const over = 'a'.repeat(1001);
    const plan = buildPlan([item('lastName', { pattern: '\\d{3}-\\d{4}' })], { profile: { ...profile, lastName: over }, address });
    expect(plan).toEqual([expect.objectContaining({ value: over, status: 'ok' })]);
  });

  // Group-free blowup: each extra unbounded quantifier multiplies the ways the
  // value can be carved up, so a run of ten freezes the engine on a 30-char
  // value (probed: still running at 3s) — far under the value-length cap,
  // which therefore cannot backstop this shape. The lint counts the run
  // across the whole pattern and falls open past the threshold.
  it('skips a run of unbounded quantifiers with no groups (fall open)', () => {
    const pattern = 'a*'.repeat(10) + 'b';
    const value = 'a'.repeat(30);
    const plan = buildPlan(
      [item('lastName', { pattern })],
      { profile: { ...profile, lastName: value }, address },
    );
    expect(plan).toEqual([expect.objectContaining({ value, status: 'ok' })]);
  });

  // Threshold edge: a short run stays checked (six unbounded quantifiers take
  // ~50ms against 30 chars; ordinary patterns carry a few), a longer one
  // falls open.
  it('still checks six unbounded quantifiers and falls open on seven', () => {
    const value = 'a'.repeat(30);
    const checked = buildPlan(
      [item('lastName', { pattern: 'a*'.repeat(6) + 'b' })],
      { profile: { ...profile, lastName: value }, address },
    );
    expect(checked).toEqual([expect.objectContaining({ value: '', display: value, status: 'warn-pattern' })]);
    const opened = buildPlan(
      [item('lastName', { pattern: 'a*'.repeat(7) + 'b' })],
      { profile: { ...profile, lastName: value }, address },
    );
    expect(opened).toEqual([expect.objectContaining({ value, status: 'ok' })]);
  });

  // (?:X) ≡ X: the non-capturing marker's ? is syntax, not a nested
  // quantifier, so a plausible postal pattern keeps its warning instead of
  // falling open.
  it('keeps warning on a quantified non-capturing group (postal pattern)', () => {
    const plan = buildPlan([item('zip', { pattern: '\\d{3}(?:-\\d{4})?' })], { profile, address });
    expect(plan).toEqual([expect.objectContaining({ value: '', display: '1000001', status: 'warn-pattern' })]);
  });
});

describe('school', () => {
  const schooled = { ...profile, school: '都立日比谷高校', department: '普通科' };

  it('fills school and department, marks warn-no-value when blank', () => {
    const vals = buildPlan([item('school'), item('department')], { profile: schooled, address }).map((p) => p.value);
    expect(vals).toEqual(['都立日比谷高校', '普通科']);
    expect(buildPlan([item('school')], { profile: { ...profile, school: '' }, address })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });
});

describe('company (PBI-119)', () => {
  it('fills company name and department, marks warn-no-value when blank', () => {
    const vals = buildPlan([item('company'), item('companyDepartment')], { profile, address }).map((p) => p.value);
    expect(vals).toEqual(['株式会社サンプル', '開発部']);
    expect(buildPlan([item('company')], { profile: { ...profile, companyName: '' }, address })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });
});

describe('company name kana (PBI-160)', () => {
  it('fills the company kana with formatKana, marks warn-no-value when blank', () => {
    expect(values([item('companyNameKana')])).toEqual(['カブシキガイシャサンプル']);
    expect(buildPlan([item('companyNameKana')], { profile: { ...profile, companyNameKana: '' }, address })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });

  it('formats by kanaKind like the person kana', () => {
    expect(buildPlan([item('companyNameKana', {}, 'hiragana')], { profile, address }).map((p) => p.value))
      .toEqual(['かぶしきがいしゃさんぷる']);
  });

  it('never assists company kana from the person-name dictionary', () => {
    const plan = buildPlan([item('companyNameKana')], { profile: { ...profile, companyNameKana: '' }, address });
    expect(plan).toEqual([expect.objectContaining({ status: 'warn-no-value', display: '' })]);
    expect('assist' in plan[0]!).toBe(false);
  });
});

describe('zip dictionary assist (PBI-125)', () => {
  const emptyAddress: Address = {
    ...address, id: 'a3', label: '郵便番号のみ',
    zip: '100-0001', prefecture: '', city: '', street: '', building: '',
  };

  it('rides the dictionary candidate onto an empty prefecture/city row', () => {
    const plan = buildPlan([item('prefecture'), item('city')], { profile, address: emptyAddress });
    expect(plan.map((p) => [p.status, p.assist, p.display])).toEqual([
      ['warn-no-value', '東京都', '候補: 東京都'],
      ['warn-no-value', '千代田区', '候補: 千代田区'],
    ]);
  });

  it('promotes an approved assist through the single approval seam', () => {
    const plan = buildPlan([item('prefecture')], { profile, address: emptyAddress });
    const approved = applyAbbrevApprovals(plan, new Set([plan[0]!.fieldId]));
    expect(approved[0]).toMatchObject({ value: '東京都', status: 'ok' });
    // unapproved keeps the plain warn-no-value with an empty value
    const unapproved = applyAbbrevApprovals(plan, new Set());
    expect(unapproved[0]).toMatchObject({ value: '', status: 'warn-no-value' });
  });

  it('keeps the plain warn-no-value when the zip is unknown or missing', () => {
    const unknownZip: Address = { ...emptyAddress, id: 'a4', zip: '601-8001' };
    expect(buildPlan([item('prefecture')], { profile, address: unknownZip })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
    expect(buildPlan([item('prefecture')], { profile, address: null })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });

  it('never assists categories outside the assistable set', () => {
    expect(buildPlan([item('street')], { profile, address: { ...emptyAddress, id: 'a5', street: '' } })).toEqual([
      expect.objectContaining({ value: '', status: 'warn-no-value' }),
    ]);
  });
});

describe('name reading assist (PBI-133)', () => {
  const noKana: Profile = { ...profile, lastNameKana: '', firstNameKana: '' };

  it('rides the reading candidate onto empty kana rows in the field width', () => {
    const plan = buildPlan(
      [item('lastNameKana', {}, 'katakana'), item('firstNameKana', {}, 'katakana')],
      { profile: noKana, address },
    );
    expect(plan.map((p) => [p.status, p.assist])).toEqual([
      ['warn-no-value', 'ヤマダ'], ['warn-no-value', 'タロウ'],
    ]);
  });

  it('converts the candidate through the deterministic kanaKind', () => {
    const plan = buildPlan([item('lastNameKana', {}, 'hiragana')], { profile: noKana, address });
    expect(plan[0]!.assist).toBe('やまだ');
  });

  it('joins the full kana candidate by the placeholder style', () => {
    const plan = buildPlan(
      [item('fullNameKana', { placeholder: 'セイメイ' }, 'katakana')],
      { profile: noKana, address },
    );
    expect(plan[0]!.assist).toBe('ヤマダタロウ');
  });

  it('stops with the plain warn-no-value for unknown readings', () => {
    const unknown: Profile = { ...noKana, lastName: '未知', firstName: '不明' };
    expect(buildPlan([item('lastNameKana', {}, 'katakana')], { profile: unknown, address })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
    // neither reading resolves → the full candidate stays empty
    expect(buildPlan([item('fullNameKana', {}, 'katakana')], { profile: unknown, address })).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });

  it('promotes an approved kana assist through the single approval seam', () => {
    const plan = buildPlan([item('lastNameKana', {}, 'katakana')], { profile: noKana, address });
    const approved = applyAbbrevApprovals(plan, new Set([plan[0]!.fieldId]));
    expect(approved[0]).toMatchObject({ value: 'ヤマダ', status: 'ok' });
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

describe('warn-no-value (PBI-10)', () => {
  it('keeps a missing-value row with the reason while normal values apply as before', () => {
    const bare = { ...profile, firstName: '' };
    const plan = buildPlan([item('firstName'), item('lastName')], { profile: bare, address });
    expect(plan.map((p) => [p.category, p.value, p.display, p.status])).toEqual([
      ['firstName', '', '', 'warn-no-value'],
      ['lastName', '山田', '山田', 'ok'],
    ]);
  });

  it('keeps a missing-value select row instead of dropping it', () => {
    const options = [
      { value: '', text: '選択してください' },
      { value: '男性', text: '男性' },
      { value: '女性', text: '女性' },
    ];
    const bare = { ...profile, gender: '' };
    const plan = buildPlan([item('gender', { tag: 'select', options })], { profile: bare, address });
    expect(plan).toEqual([
      expect.objectContaining({ value: '', display: '', status: 'warn-no-value' }),
    ]);
  });

  it('still drops unknown categories without a row, so classification failure stays distinct', () => {
    const plan = buildPlan(
      [{ meta: makeMeta({ id: 'u' }), cls: { category: 'unknown', confidence: 0.1, source: 'rule' } }],
      { profile, address },
    );
    expect(plan).toEqual([]);
  });
});

describe('carryover (PBI-142)', () => {
  const bare = { ...profile, firstName: '', email: '' };

  it('fills an empty profile field with the carried value', () => {
    const plan = buildPlan([item('firstName', { name: 'first' }), item('email', { name: 'mail' })], {
      profile: bare, address, carryover: { first: '太郎' },
    });
    expect(plan.map((p) => [p.category, p.value])).toEqual([
      ['firstName', '太郎'],
      ['email', ''],
    ]);
  });

  it('lets the profile value win over the carried value', () => {
    const plan = buildPlan([item('lastName', { name: 'last' })], {
      profile, address, carryover: { last: '鈴木' },
    });
    expect(plan.map((p) => p.value)).toEqual(['山田']);
  });

  it('never rides a select or a radio field', () => {
    const options = [
      { value: '', text: '選択してください' },
      { value: '男性', text: '男性' },
      { value: '女性', text: '女性' },
    ];
    const bareGender = { ...profile, gender: '' };
    const plan = buildPlan([item('gender', { tag: 'select', options, name: 'gender' })], {
      profile: bareGender, address, carryover: { gender: '男性' },
    });
    expect(plan).toEqual([
      expect.objectContaining({ value: '', status: 'warn-no-value' }),
    ]);
  });
});

// PBI-218: the value-row table pins. The golden test enumerates every row's
// resolved value for the shared domestic fixtures, so adding a row forces
// exactly one pin addition here; the structural test pins that the read,
// assist and abbreviatable columns drive the plan (not parallel switches).
describe('value row table (PBI-218)', () => {
  const goldenToday = new Date(2026, 9, 5);

  it('resolves the golden value for every row (pin; record a reason when changing it)', () => {
    const golden: Readonly<Record<string, string>> = {
      lastName: '山田',
      firstName: '太郎',
      fullName: '山田 太郎',
      lastNameKana: 'ヤマダ',
      firstNameKana: 'タロウ',
      fullNameKana: 'ヤマダ タロウ',
      lastNameRomaji: 'Yamada',
      firstNameRomaji: 'Taro',
      fullNameRomaji: 'Taro Yamada',
      email: 'yamada@example.com',
      tel: '09012345678',
      tel1: '090',
      tel2: '1234',
      tel3: '5678',
      fax: '09012345678',
      zip: '1000001',
      zip1: '100',
      zip2: '0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '千代田1-1 千代田ビル101',
      building: '千代田ビル101',
      addressNoPref: '千代田区千代田1-1 千代田ビル101',
      addressFull: '東京都千代田区千代田1-1 千代田ビル101',
      birthYear: '1990',
      birthMonth: '05',
      birthDay: '07',
      birthEra: '平成',
      birthday: '1990-05-07',
      school: '都立日比谷高校',
      department: '普通科',
      company: '株式会社サンプル',
      companyDepartment: '開発部',
      jobTitle: '課長',
      companyNameKana: 'カブシキガイシャサンプル',
      gender: '女性',
      ageDecade: '30代',
      country: '',
      address1: '',
      address2: '',
      address3: '',
      address4: '',
      postalCode: '',
    };
    const got: Record<string, string> = {};
    for (const row of VALUE_ROWS) {
      const plan = buildPlan([item(row.category)], { profile, address, today: goldenToday });
      expect(plan).toHaveLength(1);
      got[row.category] = plan[0]!.value;
    }
    expect(got).toEqual(golden);
  });

  it('covers every concrete category once and owns read/assist/abbreviatable columns', () => {
    const categories = VALUE_ROWS.map((r) => r.category);
    expect(new Set(categories).size).toBe(categories.length);
    expect([...categories].sort()).toEqual(
      ['lastName', 'firstName', 'fullName', 'lastNameKana', 'firstNameKana', 'fullNameKana',
        'lastNameRomaji', 'firstNameRomaji', 'fullNameRomaji', 'gender', 'ageDecade',
        'country', 'address1', 'address2', 'address3', 'address4', 'postalCode',
        'email', 'tel', 'tel1', 'tel2', 'tel3', 'fax', 'zip', 'zip1', 'zip2',
        'prefecture', 'city', 'street', 'building', 'addressFull', 'addressNoPref',
        'birthYear', 'birthMonth', 'birthDay', 'birthEra', 'birthday',
        'school', 'department', 'company', 'companyDepartment', 'jobTitle', 'companyNameKana'].sort(),
    );
    const byCat = new Map(VALUE_ROWS.map((r) => [r.category, r] as const));
    // The old ABBREVIATABLE set, now the abbreviatable column.
    expect(VALUE_ROWS.filter((r) => r.abbreviatable).map((r) => r.category).sort()).toEqual(
      ['addressFull', 'addressNoPref', 'building', 'street'],
    );
    // The old ASSISTABLE set, now the assist column (null = no assist).
    expect(VALUE_ROWS.filter((r) => r.assist !== null).map((r) => r.category).sort()).toEqual(
      ['city', 'firstNameKana', 'fullNameKana', 'lastNameKana', 'prefecture'],
    );
    expect(byCat.get('prefecture')!.assist).toBe('zipPrefecture');
    expect(byCat.get('city')!.assist).toBe('zipCity');
    expect(byCat.get('lastNameKana')!.assist).toBe('surname');
    // A new row is one table entry: read resolves through buildPlan with no
    // switch fallback even for a category the old code never assisted.
    expect(byCat.get('companyNameKana')!.assist).toBe(null);
  });
});

describe('role profiles', () => {
  // 児童・保護者で姓を違えて値の出どころを曖昧にしない(同一姓だと区別できない)。
  const childProfile: Profile = {
    ...profile, id: 'p-child', label: '児童',
    lastName: '鈴木', firstName: '一郎', lastNameKana: 'スズキ', firstNameKana: 'イチロウ',
  };
  const guardianProfile: Profile = {
    ...profile, id: 'p-guardian', label: '保護者',
    lastName: '田中', firstName: '花子', lastNameKana: 'タナカ', firstNameKana: 'ハナコ',
  };
  const roleItem = (category: Category, role: Item['role'], kanaKind?: KanaKind): Item => ({
    ...item(category, {}, kanaKind),
    ...(role !== undefined ? { role } : {}),
  });

  it('fills child rows with the child profile, guardian rows with the guardian profile, self rows with the default', () => {
    const plan = buildPlan(
      [
        roleItem('lastName', 'child'),
        roleItem('firstName', 'child'),
        roleItem('lastName', 'guardian'),
        roleItem('firstName', 'guardian'),
        roleItem('lastName', 'self'),
        roleItem('fullName', 'self'),
      ],
      { profile, address, roleProfiles: { child: childProfile, guardian: guardianProfile } },
    );
    expect(plan.map((p) => p.value)).toEqual(['鈴木', '一郎', '田中', '花子', '山田', '山田 太郎']);
  });

  it('formats role kana through the role profile kana kind', () => {
    const plan = buildPlan([roleItem('lastNameKana', 'child', 'hiragana')], {
      profile, address, roleProfiles: { child: childProfile },
    });
    expect(plan[0]!.value).toBe('すずき');
  });

  it('falls back to the default profile for roles the map does not carry', () => {
    const plan = buildPlan(
      [roleItem('lastName', 'child'), roleItem('lastName', 'guardian'), roleItem('lastName', undefined), roleItem('lastName', 'self')],
      { profile, address, roleProfiles: { child: childProfile } },
    );
    expect(plan.map((p) => p.value)).toEqual(['鈴木', '山田', '山田', '山田']);
  });

  it('lets an explicit self entry take over self rows (uniform role resolution)', () => {
    const plan = buildPlan([roleItem('lastName', 'self')], {
      profile, address, roleProfiles: { self: childProfile },
    });
    expect(plan.map((p) => p.value)).toEqual(['鈴木']);
  });

  it('stamps role and profileId on rows only when a role map is given', () => {
    const items = [roleItem('lastName', 'child'), roleItem('lastName', 'guardian'), roleItem('lastName', undefined)];
    const mapped = buildPlan(items, { profile, address, roleProfiles: { child: childProfile } });
    expect(mapped[0]).toMatchObject({ role: 'child', profileId: 'p-child' });
    // 未載の役割は既定プロファイルに倒れるので、出どころも既定の id を示す。
    expect(mapped[1]).toMatchObject({ role: 'guardian', profileId: 'p1' });
    expect(mapped[2]).toMatchObject({ role: 'self', profileId: 'p1' });
    const plain = buildPlan(items, { profile, address });
    for (const p of plain) {
      expect('role' in p).toBe(false);
      expect('profileId' in p).toBe(false);
    }
  });

  it('keeps the address common across roles', () => {
    const expected = buildPlan([item('addressFull')], { profile, address })[0]!.value;
    const plan = buildPlan([roleItem('addressFull', 'child')], {
      profile, address, roleProfiles: { child: childProfile, guardian: guardianProfile },
    });
    expect(plan[0]!.value).toBe(expected);
    expect(plan[0]!.value).toBe('東京都千代田区千代田1-1 千代田ビル101');
  });

  it('warns with warn-no-value when the role profile lacks the value', () => {
    const plan = buildPlan([roleItem('lastName', 'child')], {
      profile, address, roleProfiles: { child: { ...childProfile, lastName: '' } },
    });
    expect(plan[0]).toMatchObject({ value: '', status: 'warn-no-value', role: 'child', profileId: 'p-child' });
  });
});
