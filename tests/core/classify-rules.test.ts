import { describe, it, expect } from 'vitest';
import {
  ACCEPT_THRESHOLD, classifyField, detectKanaKind, refineClassifications,
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

  it('attaches kanaKind only to kana categories', () => {
    expect(classifyField(makeMeta({ label: 'フリガナ', placeholder: 'ヤマダ' }))?.kanaKind).toBe('katakana');
    expect(classifyField(makeMeta({ label: 'お名前' }))?.kanaKind).toBeUndefined();
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
    { label: 'お問い合わせ内容' }, { label: 'パスワード' }, { label: '生年月日' },
    { label: '性別' }, { name: 'user_name' }, { name: 'card_name' }, { name: 'subject' },
    { label: 'カード名義' },
  ];
  it.each(negatives)('leaves %j unclassified', (p) => {
    expect(cat(p)).toBeNull();
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
