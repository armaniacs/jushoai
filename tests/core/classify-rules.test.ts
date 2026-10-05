import { describe, it, expect } from 'vitest';
import {
  ACCEPT_THRESHOLD, classifyField, detectKanaKind, isConfident, refineClassifications, wantsKana,
} from '../../src/core/classify-rules';
import type { Category, Classification } from '../../src/core/types';
import { makeMeta } from '../helpers';

const cat = (p: Parameters<typeof makeMeta>[0]) => classifyField(makeMeta(p))?.category ?? null;

describe('classifyField: signals', () => {
  it('uses autocomplete with highest confidence', () => {
    const c = classifyField(makeMeta({ autocomplete: 'section-a shipping family-name' }));
    expect(c).toMatchObject({ category: 'lastName', confidence: 0.95, source: 'rule' });
  });

  it('uses name/id before label', () => {
    expect(cat({ name: 'sei', label: '姓' })).toBe('lastName');
    expect(cat({ name: 'mei', label: '名' })).toBe('firstName');
  });

  it('uses nearby heading above the accept threshold', () => {
    const c = classifyField(makeMeta({ nearby: 'お名前' }));
    expect(c?.category).toBe('fullName');
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
  });

  it('keeps type=tel as a weak hint only', () => {
    const c = classifyField(makeMeta({ type: 'tel' }));
    expect(c?.category).toBe('tel');
    expect(c!.confidence).toBeLessThan(ACCEPT_THRESHOLD);
  });

  it('returns null for unrelated or excluded fields', () => {
    expect(cat({ label: '備考' })).toBeNull();
    expect(cat({ label: '会社名' })).toBeNull();
    expect(cat({ name: 'hotel' })).toBeNull();
  });
});

describe('isConfident', () => {
  const cls = (confidence: number): Classification =>
    ({ category: 'fullName', confidence, source: 'rule' });

  it('accepts a classification at or above the threshold', () => {
    expect(isConfident(cls(0.7))).toBe(true);
    expect(isConfident(cls(ACCEPT_THRESHOLD))).toBe(true);
  });

  it('rejects a classification below the threshold', () => {
    expect(isConfident(cls(0.5))).toBe(false);
  });

  it('rejects null', () => {
    expect(isConfident(null)).toBe(false);
  });
});

describe('classifyField: names', () => {
  it('classifies full and split names', () => {
    expect(cat({ label: 'お名前' })).toBe('fullName');
    expect(cat({ label: '氏名' })).toBe('fullName');
    expect(cat({ name: 'last_name' })).toBe('lastName');
    expect(cat({ name: 'firstname' })).toBe('firstName');
  });

  it('classifies kana fields', () => {
    expect(cat({ label: 'フリガナ' })).toBe('fullNameKana');
    expect(cat({ label: 'セイ', placeholder: 'ヤマダ' })).toBe('lastNameKana');
    expect(cat({ label: 'メイ', placeholder: 'タロウ' })).toBe('firstNameKana');
    expect(cat({ name: 'kana_sei' })).toBe('lastNameKana');
    expect(cat({ placeholder: 'ヤマダ タロウ', label: 'お名前（フリガナ）' })).toBe('fullNameKana');
  });
});

describe('classifyField: contact and address', () => {
  it('classifies contact fields', () => {
    expect(cat({ type: 'email' })).toBe('email');
    expect(cat({ label: 'メールアドレス' })).toBe('email');
    expect(cat({ label: '電話番号' })).toBe('tel');
    expect(cat({ name: 'zip' })).toBe('zip');
    expect(cat({ label: '郵便番号' })).toBe('zip');
  });

  it('classifies address parts', () => {
    expect(cat({ tag: 'select', label: '都道府県' })).toBe('prefecture');
    expect(cat({ label: '市区町村' })).toBe('city');
    expect(cat({ label: '番地' })).toBe('street');
    expect(cat({ label: '市区町村・番地' })).toBe('addressNoPref');
    expect(cat({ label: '建物名・部屋番号' })).toBe('building');
    expect(cat({ name: 'address1' })).toBe('addressFull');
    expect(cat({ name: 'address2' })).toBe('building');
    expect(cat({ label: 'ご住所' })).toBe('addressFull');
  });
});

describe('detectKanaKind', () => {
  it('prefers the placeholder example', () => {
    expect(detectKanaKind(makeMeta({ placeholder: 'ﾔﾏﾀﾞ ﾀﾛｳ' }))).toBe('halfKatakana');
    expect(detectKanaKind(makeMeta({ placeholder: 'やまだ' }))).toBe('hiragana');
    expect(detectKanaKind(makeMeta({ placeholder: '例）ヤマダ' }))).toBe('katakana');
  });

  it('falls back to label hints, then katakana', () => {
    expect(detectKanaKind(makeMeta({ label: 'ふりがな' }))).toBe('hiragana');
    expect(detectKanaKind(makeMeta({ label: 'フリガナ（半角カナ）' }))).toBe('halfKatakana');
    expect(detectKanaKind(makeMeta({ label: 'フリガナ' }))).toBe('katakana');
    expect(detectKanaKind(makeMeta({ pattern: '[ぁ-ん]+' }))).toBe('hiragana');
  });

  it('reads kana ranges from a pattern written with \\uXXXX escapes', () => {
    expect(detectKanaKind(makeMeta({ pattern: '^[\\u2015\\u3000\\u3041-\\u3093\\u309B-\\u309E\\u30FC]+$' }))).toBe('hiragana');
    expect(detectKanaKind(makeMeta({ pattern: '^[\\u2015\\u3000\\u30A1-\\u30F6\\u30FB-\\u30FE]+$' }))).toBe('katakana');
  });

  it('attaches kanaKind only to kana categories', () => {
    expect(classifyField(makeMeta({ label: 'フリガナ', placeholder: 'ヤマダ' }))?.kanaKind).toBe('katakana');
    expect(classifyField(makeMeta({ label: 'お名前' }))?.kanaKind).toBeUndefined();
  });
});

describe('classifyField: birth, school, department', () => {
  it('uses bday autocomplete with highest confidence', () => {
    expect(classifyField(makeMeta({ autocomplete: 'bday-year' }))).toMatchObject({ category: 'birthYear', confidence: 0.95 });
    expect(classifyField(makeMeta({ autocomplete: 'bday-month' }))).toMatchObject({ category: 'birthMonth', confidence: 0.95 });
    expect(classifyField(makeMeta({ autocomplete: 'bday-day' }))).toMatchObject({ category: 'birthDay', confidence: 0.95 });
  });

  it.each([
    [{ label: '生年月日の年', nearby: '生年月日' }, 'birthYear'],
    [{ label: '生年月日の月', nearby: '生年月日' }, 'birthMonth'],
    [{ label: '生年月日の日', nearby: '生年月日' }, 'birthDay'],
    [{ label: '年', nearby: '生年月日' }, 'birthYear'],
    [{ label: '元号' }, 'birthEra'],
    [{ label: '令和' }, 'birthEra'],
    [{ label: '学校名' }, 'school'],
    [{ label: '学部・学科' }, 'department'],
  ])('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it('does not confuse 年月日 parts', () => {
    expect(cat({ label: '生年月日の月' })).toBe('birthMonth');
    expect(cat({ label: '生年月日の日' })).toBe('birthDay');
  });

  it('keeps company, division, and ward fields out', () => {
    expect(cat({ label: '会社名' })).toBeNull();
    expect(cat({ label: '部署' })).toBeNull();
    expect(cat({ label: '昭和区' })).toBeNull();
  });

  it('leaves bare birth-phrase fields unclassified', () => {
    expect(cat({ label: '生年月日' })).toBeNull();
    expect(cat({ label: '誕生日' })).toBeNull();
    expect(cat({ label: 'Birthday' })).toBeNull();
    expect(cat({ name: 'birthday' })).toBeNull();
  });

  it('still excludes company fields from the new categories', () => {
    expect(cat({ label: 'Company Department' })).toBeNull();
    expect(cat({ label: 'Department' })).toBe('department');
  });
});

describe('refineClassifications', () => {
  const item = (category: Category, id: string) => ({
    meta: makeMeta({ id }),
    cls: { category, confidence: 0.8, source: 'rule' } as Classification,
  });
  const cats = (items: ReturnType<typeof refineClassifications>) => items.map((i) => i.cls.category);

  it('splits three tel fields and two zip fields', () => {
    expect(cats(refineClassifications([item('tel', 'a'), item('tel', 'b'), item('tel', 'c')])))
      .toEqual(['tel1', 'tel2', 'tel3']);
    expect(cats(refineClassifications([item('zip', 'a'), item('zip', 'b')])))
      .toEqual(['zip1', 'zip2']);
  });

  it('leaves a single tel alone', () => {
    expect(cats(refineClassifications([item('tel', 'a')]))).toEqual(['tel']);
  });

  it('splits two fullName fields into last and first', () => {
    expect(cats(refineClassifications([item('fullName', 'a'), item('fullName', 'b')])))
      .toEqual(['lastName', 'firstName']);
    expect(cats(refineClassifications([item('fullNameKana', 'a'), item('fullNameKana', 'b')])))
      .toEqual(['lastNameKana', 'firstNameKana']);
  });

  it('keeps fullName fields with different labels unsplit', () => {
    const a = { ...item('fullName', 'a'), meta: makeMeta({ id: 'a', label: '注文者氏名' }) };
    const b = { ...item('fullName', 'b'), meta: makeMeta({ id: 'b', label: 'お届け先氏名' }) };
    expect(cats(refineClassifications([a, b]))).toEqual(['fullName', 'fullName']);
  });

  it('keeps zip fields with different labels unsplit', () => {
    const a = { ...item('zip', 'a'), meta: makeMeta({ id: 'a', label: '注文者郵便番号' }) };
    const b = { ...item('zip', 'b'), meta: makeMeta({ id: 'b', label: 'お届け先郵便番号' }) };
    expect(cats(refineClassifications([a, b]))).toEqual(['zip', 'zip']);
  });

  it('keeps tel fields with different labels unsplit', () => {
    const items = ['a', 'b', 'c'].map((id, i) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: ['自宅電話', '携帯電話', '勤務先電話'][i] }),
    }));
    expect(cats(refineClassifications(items))).toEqual(['tel', 'tel', 'tel']);
  });

  it('drops ambiguous groups of more than two identical fullName fields', () => {
    const four = ['a', 'b', 'c', 'd'].map((id) => item('fullName', id));
    expect(refineClassifications([...four, item('email', 'e')]).map((i) => i.meta.id)).toEqual(['e']);
  });

  it('splits two fullName fields sharing the same nearby heading', () => {
    const mk = (id: string) => ({ ...item('fullName', id), meta: makeMeta({ id, nearby: 'お名前' }) });
    expect(cats(refineClassifications([mk('a'), mk('b')]))).toEqual(['lastName', 'firstName']);
  });

  it('narrows addressFull using sibling fields', () => {
    expect(cats(refineClassifications([item('prefecture', 'p'), item('addressFull', 'a')])))
      .toEqual(['prefecture', 'addressNoPref']);
    expect(cats(refineClassifications([item('city', 'c'), item('addressFull', 'a')])))
      .toEqual(['city', 'street']);
    expect(cats(refineClassifications([item('addressFull', 'a')]))).toEqual(['addressFull']);
  });

  it('does not mutate the input', () => {
    const input = [item('tel', 'a'), item('tel', 'b'), item('tel', 'c')];
    refineClassifications(input);
    expect(input[0]!.cls.category).toBe('tel');
  });
});

describe('classifyField: name boundaries', () => {
  it('does not read fullname as last name', () => {
    expect(cat({ name: 'fullname' })).toBe('fullName');
    expect(cat({ name: 'lname' })).toBe('lastName');
    expect(cat({ name: 'l_name' })).toBe('lastName');
    expect(cat({ name: 'fname' })).toBe('firstName');
    expect(cat({ name: 'billing_fname' })).toBe('firstName');
  });

  it('does not read ethnicity as city', () => {
    expect(cat({ name: 'ethnicity' })).toBeNull();
    expect(cat({ name: 'city' })).toBe('city');
  });
});

describe('classifyField: Japanese labels', () => {
  const positives: [Parameters<typeof makeMeta>[0], string][] = [
    [{ label: 'お名前' }, 'fullName'],
    [{ label: '氏名' }, 'fullName'],
    [{ label: '姓' }, 'lastName'],
    [{ label: '名' }, 'firstName'],
    [{ label: '名 *' }, 'firstName'],
    [{ label: '（名）' }, 'firstName'],
    [{ label: 'セイ' }, 'lastNameKana'],
    [{ label: 'メイ' }, 'firstNameKana'],
    [{ label: 'フリガナ' }, 'fullNameKana'],
    [{ label: 'ふりがな' }, 'fullNameKana'],
    [{ label: '郵便番号' }, 'zip'],
    [{ label: '〒' }, 'zip'],
    [{ label: '都道府県' }, 'prefecture'],
    [{ label: '市区町村' }, 'city'],
    [{ label: '番地' }, 'street'],
    [{ label: '建物名' }, 'building'],
    [{ label: 'マンション名' }, 'building'],
    [{ label: '電話番号' }, 'tel'],
    [{ label: '携帯電話' }, 'tel'],
    [{ label: 'メールアドレス' }, 'email'],
    [{ label: 'ご住所' }, 'addressFull'],
  ];
  it.each(positives)('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  const negatives: Parameters<typeof makeMeta>[0][] = [
    { label: '件名' }, { label: '題名' }, { label: '商品名' }, { label: '品名' },
    { label: '店名' }, { label: '国名' }, { label: 'ユーザー名' }, { label: 'お届け先名' },
    { label: 'ご担当者名' }, { label: '会社名' }, { label: '部署名' }, { label: '備考' },
    { label: 'お問い合わせ内容' }, { label: 'パスワード' },
    { label: '性別' }, { name: 'user_name' }, { name: 'card_name' }, { name: 'subject' },
    { label: 'カード名義' },
  ];
  it.each(negatives)('leaves %j unclassified', (p) => {
    expect(cat(p)).toBeNull();
  });
});

describe('classifyField: romaji names', () => {
  it.each([
    [{ label: '①Name（最大文字数：80） ※半角英数で入力', name: 'name_last' }, 'fullNameRomaji'],
    [{ label: 'Name ※半角英数で入力' }, 'fullNameRomaji'],
    [{ label: '氏名（ローマ字）' }, 'fullNameRomaji'],
    [{ label: '姓（ローマ字・半角英字）', name: 'sei_romaji' }, 'lastNameRomaji'],
    [{ label: '名（ローマ字）' }, 'firstNameRomaji'],
  ] as [Parameters<typeof makeMeta>[0], string][])('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it.each([
    { label: 'お名前' },
    { label: '氏名' },
    { label: 'メールアドレス ※半角英数で入力' },
    { label: 'ユーザー名 ※半角英数' },
    { label: '会社名（英文）' },
  ] as Parameters<typeof makeMeta>[0][])('does not misread %j as romaji', (p) => {
    expect(cat(p) ?? '').not.toMatch(/Romaji$/);
  });
});

describe('classifyField: kana source', () => {
  const four = [
    makeMeta({ id: 'a', placeholder: '山田', nearby: 'お名前・フリガナ' }),
    makeMeta({ id: 'b', placeholder: '太郎', nearby: 'お名前・フリガナ' }),
    makeMeta({ id: 'c', placeholder: 'ヤマダ', nearby: 'お名前・フリガナ' }),
    makeMeta({ id: 'd', placeholder: 'タロウ', nearby: 'お名前・フリガナ' }),
  ];
  it('does not let a shared legend turn kanji fields into kana', () => {
    const items = four.map((meta) => ({ meta, cls: classifyField(meta)! }));
    expect(refineClassifications(items).map((i) => i.cls.category)).toEqual([
      'lastName', 'firstName', 'lastNameKana', 'firstNameKana',
    ]);
  });
});

describe('classifyField: kana label with generic name', () => {
  const cases: [Parameters<typeof makeMeta>[0], string][] = [
    [{ name: 'name', label: 'フリガナ' }, 'fullNameKana'],
    [{ name: 'name1', label: 'フリガナ' }, 'fullNameKana'],
    [{ name: 'sei', label: 'セイ' }, 'lastNameKana'],
    [{ name: 'last_name', label: 'セイ' }, 'lastNameKana'],
    [{ name: 'last_name', label: '姓（フリガナ）' }, 'lastNameKana'],
    [{ name: 'lastname', label: '姓（カナ）' }, 'lastNameKana'],
    [{ name: 'name', nearby: 'お名前（フリガナ）', label: 'セイ' }, 'fullNameKana'],
  ];
  it.each(cases)('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });
});

describe('wantsKana', () => {
  it('accepts a kana-only placeholder', () => {
    expect(wantsKana(makeMeta({ placeholder: '例：みらい' }))).toBe(true);
    expect(wantsKana(makeMeta({ placeholder: 'セイ' }))).toBe(true);
  });

  it('rejects a kanji or latin placeholder even under a furigana legend', () => {
    expect(wantsKana(makeMeta({ placeholder: '例：未来', nearby: 'ふりがな' }))).toBe(false);
    expect(wantsKana(makeMeta({ placeholder: 'John', label: 'フリガナ' }))).toBe(false);
  });

  it('reads kana words from name, id, label, or legend', () => {
    expect(wantsKana(makeMeta({ nearby: 'ふりがな' }))).toBe(true);
    expect(wantsKana(makeMeta({ label: 'お名前（カタカナ）' }))).toBe(true);
    expect(wantsKana(makeMeta({ htmlId: 'furigana_sei' }))).toBe(true);
    expect(wantsKana(makeMeta({ name: 'field_1_sei', htmlId: 'field_1_sei' }))).toBe(false);
  });

  it('detects kana ranges in a pattern written with \\uXXXX escapes', () => {
    expect(wantsKana(makeMeta({ pattern: '^[\\u3041-\\u3093]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^[\\u30A1-\\u30F6]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^[ぁ-ん]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^\\d{4}$' }))).toBe(false);
    expect(wantsKana(makeMeta())).toBe(false);
  });
});
