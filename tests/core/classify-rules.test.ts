import { describe, it, expect } from 'vitest';
import {
  ACCEPT_THRESHOLD, classifyField, classifyRulePipeline, classifyRulePipelineWithTrace,
  isConfident, refineClassifications,
} from '../../src/core/classify-rules';
import { detectKanaKind, matchFieldOwned, matchLegend, resolveKana, wantsKana } from '../../src/core/kana';
import { buildPlan } from '../../src/core/planner';
import type { Address, Category, Classification, Item, Profile } from '../../src/core/types';
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
    expect(cat({ name: 'hotel' })).toBeNull();
  });
});

describe('classifyField: autocomplete prototype names', () => {
  it.each([
    'constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'off', '',
  ])('leaves autocomplete=%j unclassified without throwing', (ac) => {
    expect(cat({ autocomplete: ac })).toBeNull();
  });

  it('keeps defined autocomplete keys at 0.95', () => {
    expect(classifyField(makeMeta({ autocomplete: 'email' }))).toMatchObject({ category: 'email', confidence: 0.95 });
    expect(classifyField(makeMeta({ autocomplete: 'family-name' }))).toMatchObject({ category: 'lastName', confidence: 0.95 });
    expect(classifyField(makeMeta({ autocomplete: 'postal-code' }))).toMatchObject({ category: 'zip', confidence: 0.95 });
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

  it('classifies kana fields to blind bases (resolveKana decides kana)', () => {
    expect(cat({ label: 'フリガナ' })).toBe('fullName');
    expect(cat({ label: 'セイ', placeholder: 'ヤマダ' })).toBe('lastName');
    expect(cat({ label: 'メイ', placeholder: 'タロウ' })).toBe('firstName');
    expect(cat({ name: 'kana_sei' })).toBe('lastName');
    expect(cat({ placeholder: 'ヤマダ タロウ', label: 'お名前（フリガナ）' })).toBe('fullName');
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

  it('never attaches kanaKind at the classifyField level (resolveKana owns it)', () => {
    expect(classifyField(makeMeta({ label: 'フリガナ', placeholder: 'ヤマダ' }))?.kanaKind).toBeUndefined();
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

  // PBI-119: 会社語は company/companyDepartment だけ EXCLUDE から通す。会社名 が
  // school に、部署 が department にならない既存ガードはこの positive と下の
  // negatives 拡張（Company Department・昭和区）で維持する。
  it('classifies company and office-department fields to the new categories', () => {
    expect(cat({ label: '会社名' })).toBe('company');
    expect(cat({ label: '法人・団体名（個人の方は不要）' })).toBe('company');
    expect(cat({ label: '部署' })).toBe('companyDepartment');
  });

  it('uses the organization autocomplete with highest confidence', () => {
    expect(classifyField(makeMeta({ autocomplete: 'organization' }))).toMatchObject({ category: 'company', confidence: 0.95 });
  });

  it('keeps ward fields out', () => {
    expect(cat({ label: '昭和区' })).toBeNull();
  });

  // PBI-118: 単一 birthday カテゴリ。1 欄型 text・type=date とも生年月日全体が注入対象になり、
  // 部分値（birthYear/Month/Day）を注入させない旧ガードの意図は planner の ISO 注入が引き継ぐ。
  it('classifies bare birth-phrase fields as the single birthday category', () => {
    expect(cat({ label: '生年月日' })).toBe('birthday');
    expect(cat({ label: '誕生日' })).toBe('birthday');
    expect(cat({ label: 'Birthday' })).toBe('birthday');
    expect(cat({ name: 'birthday' })).toBe('birthday');
  });

  it('classifies a type=date field with the birth phrase as birthday', () => {
    expect(cat({ type: 'date', label: '生年月日' })).toBe('birthday');
  });

  it('uses the bday autocomplete for a full birthdate with highest confidence', () => {
    expect(classifyField(makeMeta({ autocomplete: 'bday' }))).toMatchObject({ category: 'birthday', confidence: 0.95 });
  });

  it('still excludes company fields from the new categories', () => {
    expect(cat({ label: 'Company Department' })).toBeNull();
    expect(cat({ label: 'Department' })).toBe('department');
  });

  // PBI-119: 緩和境界。ご担当者名（名前系）・会社の生年月日（誕生文脈）、
  // そしてカナ欄（会社名（フリガナ））・会社電話・役職・店舗・法人種別は
  // 従来どおり company/companyDepartment にならない。T2: 単独の部署名は
  // companyDepartment の語彙になったため negatives から外す（T2 の positive
  // が所有する）。複合欄（会社名・部署名）は company のまま。
  it.each([
    { label: 'ご担当者名' },
    { label: '会社の生年月日' },
    { label: '会社名（フリガナ）' },
    { label: '会社電話' },
    { label: '役職' },
    { label: '店舗名' },
    { label: '法人種別' },
  ] as Parameters<typeof makeMeta>[0][])('leaves %j outside the company categories', (p) => {
    expect(cat(p) ?? '').not.toMatch(/^(company|companyDepartment)$/);
  });
});

// T2: standalone department wording resolves to the existing companyDepartment
// category (MS Forms q3 shape). The allowance is 部署名 as a standalone word:
// the 会社名・部署名 compound still reads as company (the COMPANY entry
// precedes the department entry, and the regex guard keeps the compound joint
// out of the department signal even if the order ever changes).
describe('classifyField: standalone department wording (T2)', () => {
  it.each([
    { label: '所属部署名' },
    { label: '3.所属部署名' },
    { label: '所属部署' },
    { label: '部署名' },
    { name: 'q3', label: '3.所属部署名', placeholder: '回答を入力してください' },
  ] as Parameters<typeof makeMeta>[0][])('classifies %j as companyDepartment', (p) => {
    expect(cat(p)).toBe('companyDepartment');
  });

  it.each([
    { label: '所属部署名' },
    { label: '部署名' },
  ] as Parameters<typeof makeMeta>[0][])('is confident (rule, >= 0.6) for %j', (p) => {
    const c = classifyField(makeMeta(p));
    expect(c).toMatchObject({ category: 'companyDepartment', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
  });

  it('reaches the legend-only department case without an own office word', () => {
    expect(classifyField(makeMeta({ name: 'team', nearby: '部署名' })))
      .toMatchObject({ category: 'companyDepartment', confidence: 0.65 });
  });

  it('keeps the 会社名・部署名 compound on company, never the department', () => {
    expect(cat({ label: '会社名・部署名' })).toBe('company');
  });

  // F1: sysmex shape (name=department + 所属部署名 label) reads as the
  // company department, not the school department. Bare 部署 keeps the
  // school reading, so the guard is 部署名-only.
  it('reads name=department with a 所属部署名 label as the company department', () => {
    expect(cat({ name: 'department', label: '所属部署名' })).toBe('companyDepartment');
    const c = classifyField(makeMeta({ name: 'department', label: '所属部署名' }));
    expect(c).toMatchObject({ category: 'companyDepartment', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
  });

  it('keeps bare-部署 English-token fields on the school reading', () => {
    expect(cat({ name: 'department', label: '部署' })).toBe('department');
    expect(cat({ name: 'department', label: '所属部署' })).toBe('department');
  });

  // F2: company-word department joints keep the company reading (never the
  // department), including a non-・ separator variant.
  it.each([
    { label: '企業名・部署名' },
    { label: '会社名/部署名' },
  ] as Parameters<typeof makeMeta>[0][])('keeps the joint %j on company, never the department', (p) => {
    expect(cat(p)).toBe('company');
    expect(cat(p)).not.toBe('companyDepartment');
  });

  it('reads a bare 企業名 label as the company', () => {
    expect(cat({ label: '企業名' })).toBe('company');
  });

  // F4: own 部署名 under a 会社名 heading reads as the company department.
  it('reads an own 部署名 under a 会社名 heading as the company department', () => {
    expect(classifyField(makeMeta({ label: '部署名', nearby: '会社名' })))
      .toMatchObject({ category: 'companyDepartment', confidence: 0.7 });
  });

  it.each([
    { label: '応募団体名' },
    { label: '申込団体名' },
    { label: '会社名（フリガナ）' },
    { label: '会社の生年月日' },
    { label: '役職' },
    { label: '役職名' },
    { label: '会社電話' },
    { label: '店舗名' },
    { label: '法人種別' },
    { label: 'ご担当者名' },
  ] as Parameters<typeof makeMeta>[0][])('leaves %j outside companyDepartment', (p) => {
    expect(cat(p) ?? null).not.toBe('companyDepartment');
  });

  it('keeps the 部署・役職 compound on the existing department reading', () => {
    expect(cat({ label: '部署・役職' })).toBe('companyDepartment');
  });
});

// T3: standalone role wording resolves to the new jobTitle category (MS Forms
// q4 shape). The allowance is 役職 as a standalone word: joints with a company
// or department word never read as the title (部署名・役職名 keeps the
// department reading, 部署・役職 keeps the existing companyDepartment pin, and
// company-word joints stay on company). Legend-only 役職 (tokyu-tenant job)
// stays unknown: the title has no legend entry on purpose.
describe('classifyField: standalone role wording (T3)', () => {
  it.each([
    { label: '役職名' },
    { label: '役職' },
    { label: '4.役職名' },
    { name: 'q4', label: '4.役職名', placeholder: '回答を入力してください' },
  ] as Parameters<typeof makeMeta>[0][])('classifies %j as jobTitle', (p) => {
    expect(cat(p)).toBe('jobTitle');
  });

  it.each([
    { label: '役職名' },
    { label: '役職' },
  ] as Parameters<typeof makeMeta>[0][])('is confident (rule, >= 0.6) for %j', (p) => {
    const c = classifyField(makeMeta(p));
    expect(c).toMatchObject({ category: 'jobTitle', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
  });

  it('reads an own 役職名 at 0.7', () => {
    expect(classifyField(makeMeta({ label: '4.役職名' })))
      .toMatchObject({ category: 'jobTitle', confidence: 0.7 });
  });

  it('keeps the 部署名・役職名 compound on the department reading, never the title', () => {
    expect(cat({ label: '部署名・役職名' })).toBe('companyDepartment');
    expect(cat({ label: '部署名・役職名' })).not.toBe('jobTitle');
  });

  it('keeps the 会社名・役職名 compound on company, never the title', () => {
    expect(cat({ label: '会社名・役職名' })).toBe('company');
    expect(cat({ label: '会社名・役職名' })).not.toBe('jobTitle');
  });

  // PBI-232 equivalence pin: the job joint guard must share the COMPANY_WORD
  // vocabulary, so company-word joints other than 会社名 keep the company
  // reading and never fall to jobTitle.
  it.each([
    { label: '法人名・役職名' },
    { label: '企業名・役職名' },
  ] as Parameters<typeof makeMeta>[0][])('keeps the %j compound on company, never the title', (p) => {
    expect(cat(p)).toBe('company');
    expect(cat(p)).not.toBe('jobTitle');
  });

  it('keeps the 部署・役職 compound on the existing department reading', () => {
    expect(cat({ label: '部署・役職' })).toBe('companyDepartment');
  });

  it('leaves legend-only 役職 (tokyu-tenant job shape) unknown', () => {
    expect(cat({ name: 'job', nearby: '役職' })).toBeNull();
  });

  it.each([
    { label: '役職（フリガナ）' },
    { label: 'ご担当者名' },
    { label: '会社の生年月日' },
    { label: '会社名（フリガナ）' },
    { label: '会社電話' },
    { label: '店舗名' },
    { label: '法人種別' },
  ] as Parameters<typeof makeMeta>[0][])('leaves %j outside jobTitle', (p) => {
    expect(cat(p) ?? null).not.toBe('jobTitle');
  });
});

// レビュー指摘の再現 fixture。fixture 先行（AGENTS.md）: 先に失敗させてから直す。
describe('classifyField: single birthday after the label-only anchor (review)', () => {
  it.each([
    // name/id 連結で anchored 一致が壊れ、同じ欄が birthYear (0.7) に落ちていた:
    // planner の birthYear は非 ISO の '1990' を返し、date input は無音で捨てて
    // fill-plan は「適用済み」と報告する。label のみのビューで判定する。
    { type: 'date', name: 'birthday', label: '生年月日' },
    { name: 'birthday', label: '生年月日' },
    { name: 'birthday', label: '生年月日', placeholder: '例）1990-05-07' },
  ] as Parameters<typeof makeMeta>[0][])('classifies %j as the single birthday', (p) => {
    expect(cat(p)).toBe('birthday');
  });

  it('routes a bday* autocomplete on a date input to the single birthday', () => {
    expect(classifyField(makeMeta({ type: 'date', autocomplete: 'bday-year', label: '生年' })))
      .toMatchObject({ category: 'birthday', confidence: 0.7 });
  });

  it('keeps a partial bday token on a date input from leaking a partial category', () => {
    // bday-year → birthYear のような部分カテゴリを date 欄に通さない: label が
    // 誕生日語でなく、autocomplete も bday で始まらない欄は unclassified。
    expect(cat({ type: 'date', name: 'bday-year', label: '生年' })).toBeNull();
  });

  it('reads お誕生日 through the widened prefix list', () => {
    expect(cat({ label: 'お誕生日' })).toBe('birthday');
  });

  it('keeps a date input away from every non-birthday category', () => {
    expect(cat({ type: 'date', label: '登録日' })).toBeNull();
    expect(cat({ type: 'date', name: 'start_date', label: '開始日' })).toBeNull();
  });
});

// なぜなぜ分析（2026-11-19 項目2/3）の再現 fixture。fixture 先行（AGENTS.md）:
// 先に失敗させてから直す。label が空で name/id/placeholder に誕生日語がある
// 1欄型は、ownText が name+htmlId+label+placeholder の連結 norm のため anchored
// 完全一致から漏れ、積水（name+id とも birthday）と ena（name=birthday +
// placeholder 例示）で生年月日だけが unknown だった。設計（profiles-design.md
// 追補「分類は欄自身の文言だけ」は label・name・id・placeholder を対象と規定）
// どおりに各ビューを判定対象にする。語彙追加ではなく対象拡張（BIRTH_PHRASE は
// 不変）。placeholder 例示（2002/04/02 等）の解析はしない設計は不変で、例示は
// 誕生日語の判定対象にならない値として join に乗るだけ。
describe('classifyField: single birthday on name/id/placeholder views (why-why 2026-11-19)', () => {
  it.each([
    // sekisui-catalog-request.html:35 — name+id 連結で anchored が壊れる形。
    { name: 'birthday', htmlId: 'birthday' },
    // ena-request-form.html:7 — placeholder 例示が join に乗る形。
    { name: 'birthday', placeholder: '2002/04/02' },
    { htmlId: 'birthday', placeholder: '2002/04/02' },
    // 日本語 name と例示 placeholder の併存形。
    { name: '生年月日', placeholder: '例）1990年5月7日' },
    // レビュー指摘追補: placeholder 単独ビュー（name・id・label に誕生日語なし）も
    // anchored 対象。placeholder だけが判定材料の欄が birthday に落ちない pin。
    { placeholder: '生年月日' },
    // date 欄でも name/id 単独の anchored 誕生日語は birthday（ゲート内の判定も広げる）。
    { type: 'date', name: 'birthday', htmlId: 'birthday' },
  ] as Parameters<typeof makeMeta>[0][])('classifies %j as the single birthday', (p) => {
    expect(cat(p)).toBe('birthday');
  });

  // 否定形: 3欄分割（legend 内 年/月/日）と非 anchored 語は従来どおり。
  // 誤って legend 近接・部分語まで birthday に広げていないことを pin する。
  it('keeps the 3-split year/month/day fields inside a 生年月日 legend on the split categories', () => {
    expect(cat({ name: 'year', nearby: '生年月日' })).toBe('birthYear');
    expect(cat({ name: 'month', nearby: '生年月日' })).toBe('birthMonth');
    expect(cat({ name: 'day', nearby: '生年月日' })).toBe('birthDay');
  });

  it('keeps non-anchored birth words away from birthday', () => {
    expect(cat({ label: '誕生石' })).toBeNull();
    expect(cat({ name: 'birthdayStone' })).toBeNull();
  });
});

// 足立の実ページは bare (label 空・見出しが生年月日のみ) の 3 select で、
// option 文言 (年/月/日) だけが手掛かり。fixture 先行: 先に失敗させてから直す。
describe('classifyField: bare birth tri-select by option wording', () => {
  const bare = (name: string, options: string[]) =>
    ({ tag: 'select', name, htmlId: name, label: '', nearby: '生年月日',
      options: options.map((text) => ({ value: text, text })) }) as Parameters<typeof makeMeta>[0];
  it.each([
    [bare('form:j_idt253', ['年', '2014年']), 'birthYear'],
    [bare('form:j_idt257', ['月', '5月', '11月']), 'birthMonth'],
    [bare('form:j_idt261', ['日', '7日', '11日']), 'birthDay'],
  ])('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });
  it('is confident (rule, >= 0.6) for the bare triple', () => {
    for (const p of [
      bare('form:j_idt253', ['年', '2014年']),
      bare('form:j_idt257', ['月', '5月']),
      bare('form:j_idt261', ['日', '7日']),
    ]) {
      const c = classifyField(makeMeta(p));
      expect(c).toMatchObject({ source: 'rule' });
      expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
    }
  });
  it('keeps the single birthday out of the split categories', () => {
    expect(cat({ label: '生年月日' })).toBe('birthday');
  });
  it('keeps non-birth option selects away from birth parts', () => {
    const nonBirth = { tag: 'select', name: 'season_year', htmlId: 'season_year', label: '', nearby: '学年',
      options: [{ value: '2024', text: '2024年' }] } as Parameters<typeof makeMeta>[0];
    expect(cat(nonBirth)).toBeNull();
  });
});

// レビュー指摘の再現 fixture: legend 専用ケースの到達不能と交差ケースの誤分類。
describe('classifyField: company legend and 応募文脈 (review)', () => {
  it('reaches the legend-only company case without an own office word', () => {
    expect(classifyField(makeMeta({ label: 'ご記入ください', nearby: '会社名' })))
      .toMatchObject({ category: 'company', confidence: 0.65 });
  });

  it('keeps the own office word above a crossing company legend', () => {
    expect(cat({ label: '部署', nearby: '会社名' })).toBe('companyDepartment');
  });

  it('pins 団体名 alone as company and 応募/申込団体名 outside it', () => {
    expect(cat({ label: '団体名' })).toBe('company');
    expect(cat({ label: '応募団体名' })).toBeNull();
    expect(cat({ label: '申込団体名' })).toBeNull();
  });
});

// PBI-160: 会社名フリガナは専用カテゴリ companyNameKana で開く。own-text の
// 連言（会社・法人系語彙 AND カナ注記）で tight に、誕生文脈は除外する。
// fixture 先行: 先に失敗させてから直す。
describe('classifyField: company name kana (PBI-160)', () => {
  it.each([
    // th ラベル（own 側 0.7）。全角括弧は norm で半角化されるため括弧に依存しない。
    { label: '会社名（フリガナ）' },
    { label: '会社名(フリガナ)' },
    // name + label。
    { name: 'company_kana', label: '会社名（フリガナ）' },
    // placeholder 変種（カナ注記が placeholder 側）。
    { label: '会社名', placeholder: 'フリガナ' },
    { name: 'company_kana', label: '会社名', placeholder: '例）カブシキガイシャサンプル' },
  ] as Parameters<typeof makeMeta>[0][])('classifies %j as companyNameKana', (p) => {
    expect(cat(p)).toBe('companyNameKana');
  });

  it('reaches the legend-only company-kana case (fixture shape: name + th heading)', () => {
    expect(classifyField(makeMeta({ name: 'company_kana', nearby: '会社名（フリガナ）' })))
      .toMatchObject({ category: 'companyNameKana', confidence: 0.65 });
  });

  it.each([
    // 素の会社名は company のまま。
    [{ label: '会社名' }, 'company'],
    // セイ/メイは人名カナ経路のまま（blind base）。
    [{ label: 'セイ', placeholder: 'ヤマダ' }, 'lastName'],
    [{ label: 'メイ', placeholder: 'タロウ' }, 'firstName'],
    // 素のフリガナは人名経路のまま。
    [{ label: 'フリガナ' }, 'fullName'],
    // 複合欄（会社名・部署名）は従来動作（company）のまま。
    [{ label: '会社名・部署名' }, 'company'],
  ] as [Parameters<typeof makeMeta>[0], Category][])('keeps %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it.each([
    // 誕生文脈は除外。
    { label: '会社の生年月日（フリガナ）' },
    // name のみ（ラベルなし）の company_kana は unknown のまま（誤注入より不注入）。
    { name: 'company_kana' },
  ] as Parameters<typeof makeMeta>[0][])('leaves %j unclassified', (p) => {
    expect(cat(p)).toBeNull();
  });
});

describe('companyNameKana pipeline guards (PBI-160)', () => {
  const fixturePair: Parameters<typeof makeMeta>[0][] = [
    { id: 'c1', name: 'company_kana', nearby: '会社名（フリガナ）' },
    { id: 's1', name: 'yomiSei', label: 'セイ', placeholder: 'ヤマダ', nearby: 'フリガナ' },
  ];

  it('never puts the company_kana field on a person-kana category', () => {
    const items = classifyRulePipeline(fixturePair.map((p) => makeMeta(p)));
    expect(items.find((i) => i.meta.id === 'c1')!.cls.category).toBe('companyNameKana');
  });

  it('never puts a person-kana field on companyNameKana', () => {
    const items = classifyRulePipeline(fixturePair.map((p) => makeMeta(p)));
    expect(items.find((i) => i.meta.id === 's1')!.cls.category).not.toBe('companyNameKana');
  });

  it('pins katakana kanaKind on the fixture field through the pipeline', () => {
    const items = classifyRulePipeline([makeMeta({ id: 'c1', name: 'company_kana', nearby: '会社名（フリガナ）' })]);
    expect(items[0]!.cls).toMatchObject({ category: 'companyNameKana', kanaKind: 'katakana' });
  });

  it('resolveKana never converts companyNameKana (terminal category)', () => {
    const items: Item[] = [{
      meta: makeMeta({ id: 'c1' }),
      cls: { category: 'companyNameKana', confidence: 0.65, source: 'rule' },
    }];
    expect(resolveKana(items).map((i) => i.cls.category)).toEqual(['companyNameKana']);
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

  it('splits tel fields with distinct part labels sharing a heading', () => {
    const labels = ['電話番号の市外局番', '電話番号の市内局番', '電話番号の加入者番号'];
    const items = ['a', 'b', 'c'].map((id, i) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: labels[i]!, nearby: '電話番号' }),
    }));
    expect(cats(refineClassifications(items))).toEqual(['tel1', 'tel2', 'tel3']);
  });

  it('splits zip fields with distinct part labels sharing a heading', () => {
    const items = ['a', 'b'].map((id, i) => ({
      ...item('zip', id),
      meta: makeMeta({
        id,
        label: ['郵便番号の上3桁', '郵便番号の下4桁'][i]!,
        nearby: '郵便番号',
      }),
    }));
    expect(cats(refineClassifications(items))).toEqual(['zip1', 'zip2']);
  });

  it('keeps part-labeled tel fields with different headings unsplit', () => {
    const labels = ['電話番号の市外局番', '電話番号の市内局番', '電話番号の加入者番号'];
    const items = ['a', 'b', 'c'].map((id, i) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: labels[i]!, nearby: `ブロック${i}` }),
    }));
    expect(cats(refineClassifications(items))).toEqual(['tel', 'tel', 'tel']);
  });

  it('keeps part-labeled fields unsplit when a part repeats', () => {    const items = ['a', 'b', 'c'].map((id, i) => ({
      ...item('tel', id),
      meta: makeMeta({
        id,
        label: ['電話番号の市外局番', '電話番号の市外局番', '電話番号の加入者番号'][i]!,
        nearby: '電話番号',
      }),
    }));
    // PBI-09: 同ラベル重複ペア（市外×2）はunknown化され、完全値の複製対象にならない。
    expect(cats(refineClassifications(items))).toEqual(['unknown', 'unknown', 'tel']);
  });

  it('keeps part-labeled tel fields unsplit when another field breaks consecutiveness', () => {
    const labels = ['電話番号の市外局番', '電話番号の市内局番', '電話番号の加入者番号'];
    const items = [
      { ...item('tel', 'a'), meta: makeMeta({ id: 'a', label: labels[0]!, nearby: '電話番号' }) },
      { ...item('email', 'x'), meta: makeMeta({ id: 'x', label: 'メールアドレス', nearby: '電話番号' }) },
      { ...item('tel', 'b'), meta: makeMeta({ id: 'b', label: labels[1]!, nearby: '電話番号' }) },
      { ...item('tel', 'c'), meta: makeMeta({ id: 'c', label: labels[2]!, nearby: '電話番号' }) },
    ];
    expect(cats(refineClassifications(items))).toEqual(['tel', 'email', 'tel', 'tel']);
  });

  it('drops ambiguous groups of more than two identical fullName fields', () => {
    const four = ['a', 'b', 'c', 'd'].map((id) => item('fullName', id));
    expect(refineClassifications([...four, item('email', 'e')]).map((i) => i.meta.id)).toEqual(['e']);
  });

  it('reports oversized drops through the pipeline trace', () => {
    // The per-field drop reason is module-private; the pipeline trace count
    // plus the survivors' absence is the public view of the same behavior.
    const four = ['a', 'b', 'c', 'd'].map((id) => makeMeta({ id, label: 'お名前', nearby: 'お名前' }));
    const trace = classifyRulePipelineWithTrace([...four, makeMeta({ id: 'e', type: 'email' })]);
    expect(trace.refineDropped).toBe(4);
    expect(trace.items.map((i) => i.meta.id)).toEqual(['e']);
  });

  it('reports oversized zip drops through the pipeline trace', () => {
    // tel and fullName oversized drops are pinned above and in
    // send-set.test.ts; the zip path had no trace pin. The trace count is the
    // only public evidence of a drop once the per-field reason went private.
    const three = ['a', 'b', 'c'].map((id) => makeMeta({ id, label: '郵便番号', nearby: 'ご住所' }));
    const trace = classifyRulePipelineWithTrace(three);
    expect(trace.refineDropped).toBe(3);
    expect(trace.items).toEqual([]);
  });

  it('counts only vanished fields as refineDropped, not retags', () => {
    // refineDropped is defined over ids that disappear during refine. Split
    // retags (zip pair -> zip1/zip2) and leftover unknown-ization (tel pair)
    // keep the field alive, so they must stay out of the drop count; otherwise
    // the trace silently widens into a "changed" counter.
    const telPair = ['a', 'b'].map((id) => makeMeta({ id, type: 'tel', label: '電話番号', nearby: '連絡先' }));
    const telTrace = classifyRulePipelineWithTrace(telPair);
    expect(telTrace.refineDropped).toBe(0);
    expect(telTrace.refineChanged).toBe(2);
    expect(telTrace.items.map((i) => i.cls.category)).toEqual(['unknown', 'unknown']);

    const zipPair = ['c', 'd'].map((id) => makeMeta({ id, label: '郵便番号', nearby: 'ご住所' }));
    const zipTrace = classifyRulePipelineWithTrace(zipPair);
    expect(zipTrace.refineDropped).toBe(0);
    expect(zipTrace.refineChanged).toBe(2);
    expect(zipTrace.items.map((i) => i.cls.category)).toEqual(['zip1', 'zip2']);
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

  it('narrows addressFull within the same nearby block only (PBI-12)', () => {
    const scoped = (category: Category, id: string, nearby: string) => ({
      meta: makeMeta({ id, nearby }),
      cls: { category, confidence: 0.8, source: 'rule' } as Classification,
    });
    // 注文者ブロックにprefecture/cityがあっても、届け先ブロックのaddressFullは維持される
    const twoBlocks = [
      scoped('prefecture', 'op', '注文者住所'),
      scoped('city', 'oc', '注文者住所'),
      scoped('addressFull', 'oa', '注文者住所'),
      scoped('addressFull', 'da', 'お届け先住所'),
    ];
    expect(cats(refineClassifications(twoBlocks))).toEqual([
      'prefecture', 'city', 'street', 'addressFull',
    ]);
  });

  it('keeps single-block narrowing (PBI-12 regression guard)', () => {
    const scoped = (category: Category, id: string, nearby: string) => ({
      meta: makeMeta({ id, nearby }),
      cls: { category, confidence: 0.8, source: 'rule' } as Classification,
    });
    expect(cats(refineClassifications([
      scoped('prefecture', 'p', 'ご住所'),
      scoped('addressFull', 'a', 'ご住所'),
    ]))).toEqual(['prefecture', 'addressNoPref']);
    expect(cats(refineClassifications([
      scoped('city', 'c', 'ご住所'),
      scoped('addressFull', 'a', 'ご住所'),
    ]))).toEqual(['city', 'street']);
  });

  it('does not mutate the input', () => {
    const input = [item('tel', 'a'), item('tel', 'b'), item('tel', 'c')];
    refineClassifications(input);
    expect(input[0]!.cls.category).toBe('tel');
  });
});

describe('refineClassifications: PBI-09 split-mismatchは複製しない', () => {
  const item = (category: Category, id: string) => ({
    meta: makeMeta({ id }),
    cls: { category, confidence: 0.8, source: 'rule' } as Classification,
  });
  const cats = (items: ReturnType<typeof refineClassifications>) => items.map((i) => i.cls.category);
  const profile: Profile = {
    id: 'p1', label: 'メイン',
    lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
    gender: '', birthday: '', school: '', department: '',
    companyName: '', companyDepartment: '', jobTitle: '', companyNameKana: '', email: '', tel: '09012345678',
  };
  const address: Address = {
    id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都',
    city: '千代田区', street: '千代田1-1', building: '',
    country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
  };

  it('同ラベルtel 2欄（3分割不一致）はunknown化される', () => {
    const items = ['a', 'b'].map((id) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: '電話番号', nearby: '連絡先' }),
    }));
    expect(cats(refineClassifications(items))).toEqual(['unknown', 'unknown']);
  });

  it('同ラベルzip 3欄（2分割不一致）はdroppedされ注入されない', () => {
    const items = ['a', 'b', 'c'].map((id) => ({
      ...item('zip', id),
      meta: makeMeta({ id, label: '郵便番号', nearby: 'ご住所' }),
    }));
    // dropped 欄は refine 後の item 列から消える（消失の不在で観測する）。
    const refined = refineClassifications(items);
    expect(refined).toEqual([]);
    expect(buildPlan(refined, { profile, address })).toEqual([]);
  });

  it('単独tel・単独zipはunknown化されない', () => {
    expect(cats(refineClassifications([item('tel', 'a')]))).toEqual(['tel']);
    expect(cats(refineClassifications([item('zip', 'z')]))).toEqual(['zip']);
  });

  it('classify〜plan経由で不一致群に完全値が複製されない', () => {
    const metas = [
      makeMeta({ id: 'a', label: '電話番号', nearby: '連絡先' }),
      makeMeta({ id: 'b', label: '電話番号', nearby: '連絡先' }),
      makeMeta({ id: 'c', label: '郵便番号', nearby: 'ご住所' }),
      makeMeta({ id: 'd', label: '郵便番号', nearby: 'ご住所' }),
      makeMeta({ id: 'e', label: '郵便番号', nearby: 'ご住所' }),
    ];
    const classified = metas.map((meta) => ({ meta, cls: classifyField(meta)! }));
    expect(classified.every(({ cls }) => cls !== null)).toBe(true);
    const refined = refineClassifications(classified);
    // tel 2欄はunknown化、zip 3欄はoversizedでdropped：いずれも注入対象外
    expect(refined.map((i) => i.cls.category)).toEqual(['unknown', 'unknown']);
    // 消失した c/d/e は item 列の不在として観測する。
    expect(refined.map((i) => i.meta.id)).toEqual(['a', 'b']);
    expect(buildPlan(refined, { profile, address })).toEqual([]);
  });

  it('正常分割は従来通り分割値が注入される', () => {
    const telItems = ['a', 'b', 'c'].map((id) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: '電話番号', nearby: '連絡先' }),
    }));
    const zipItems = ['d', 'e'].map((id) => ({
      ...item('zip', id),
      meta: makeMeta({ id, label: '郵便番号', nearby: 'ご住所' }),
    }));
    const refined = refineClassifications([...telItems, ...zipItems]);
    expect(refined.map((i) => i.cls.category)).toEqual(['tel1', 'tel2', 'tel3', 'zip1', 'zip2']);
    expect(buildPlan(refined, { profile, address }).map((p) => p.value))
      .toEqual(['090', '1234', '5678', '100', '0001']);
  });

  it('空キー群（label・nearbyとも空）も安全側でunknown化される', () => {
    // ブロック帰属を判定できないため、複製注入より不注入を選ぶ仕様の固定。
    const items = ['a', 'b'].map((id) => item('tel', id));
    expect(cats(refineClassifications(items))).toEqual(['unknown', 'unknown']);
  });
});

describe('refineClassifications: tel/zip leftover unknown-ization (PBI-219)', () => {
  const item = (category: Category, id: string) => ({
    meta: makeMeta({ id }),
    cls: { category, confidence: 0.8, source: 'rule' } as Classification,
  });
  const cats = (items: Item[]) => items.map((i) => i.cls.category);

  it('単独tel・単独zipは変えない', () => {
    expect(cats(refineClassifications([item('tel', 'a')]))).toEqual(['tel']);
    expect(cats(refineClassifications([item('zip', 'z')]))).toEqual(['zip']);
  });

  it('unknown-izes a same-key tel pair; a same-label zip pair is split-owned', () => {
    const tel = ['a', 'b'].map((id) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: '電話番号', nearby: '連絡先' }),
    }));
    expect(cats(refineClassifications(tel))).toEqual(['unknown', 'unknown']);
    // A same-label zip pair is exact-size for the zip split policy, so the
    // composition retags it before the leftover step runs: the leftover-only
    // zip unknown-ization is unreachable through the public interface.
    const zip = ['c', 'd'].map((id) => ({
      ...item('zip', id),
      meta: makeMeta({ id, label: '郵便番号', nearby: 'ご住所' }),
    }));
    expect(cats(refineClassifications(zip))).toEqual(['zip1', 'zip2']);
  });

  it('別キーのtel群は変えない', () => {
    const items = [
      { ...item('tel', 'a'), meta: makeMeta({ id: 'a', label: '自宅電話' }) },
      { ...item('tel', 'b'), meta: makeMeta({ id: 'b', label: '携帯電話' }) },
    ];
    expect(cats(refineClassifications(items))).toEqual(['tel', 'tel']);
  });

  it('正常分割済み・対象外カテゴリは触らない', () => {
    const items = [item('tel1', 'a'), item('tel2', 'b'), item('tel3', 'c'), item('email', 'e')];
    expect(cats(refineClassifications(items))).toEqual(['tel1', 'tel2', 'tel3', 'email']);
  });

  it('空キー群（label・nearbyとも空）もunknown化する', () => {
    const items = ['a', 'b'].map((id) => item('tel', id));
    expect(cats(refineClassifications(items))).toEqual(['unknown', 'unknown']);
  });

  it('分類の付帯情報（confidence・source）を保つ', () => {
    const items = ['a', 'b'].map((id) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: '電話番号', nearby: '連絡先' }),
    }));
    expect(refineClassifications(items).map((i) => i.cls)).toEqual([
      { category: 'unknown', confidence: 0.8, source: 'rule' },
      { category: 'unknown', confidence: 0.8, source: 'rule' },
    ]);
  });

  it('入力を変えない', () => {
    const input = ['a', 'b'].map((id) => ({
      ...item('tel', id),
      meta: makeMeta({ id, label: '電話番号', nearby: '連絡先' }),
    }));
    refineClassifications(input);
    expect(input.map((i) => i.cls.category)).toEqual(['tel', 'tel']);
  });
});

describe('refineClassifications: addressFull narrowing (PBI-219)', () => {
  const item = (category: Category, id: string) => ({
    meta: makeMeta({ id }),
    cls: { category, confidence: 0.8, source: 'rule' } as Classification,
  });
  const scoped = (category: Category, id: string, nearby: string) => ({
    meta: makeMeta({ id, nearby }),
    cls: { category, confidence: 0.8, source: 'rule' } as Classification,
  });
  const cats = (items: Item[]) => items.map((i) => i.cls.category);

  it('addressFull単独は維持する', () => {
    expect(cats(refineClassifications([item('addressFull', 'a')]))).toEqual(['addressFull']);
  });

  it('同一スコープのprefecture・cityで絞る（city優先）', () => {
    expect(cats(refineClassifications([
      scoped('prefecture', 'p', 'ご住所'),
      scoped('addressFull', 'a', 'ご住所'),
    ]))).toEqual(['prefecture', 'addressNoPref']);
    expect(cats(refineClassifications([
      scoped('city', 'c', 'ご住所'),
      scoped('addressFull', 'a', 'ご住所'),
    ]))).toEqual(['city', 'street']);
    expect(cats(refineClassifications([
      scoped('prefecture', 'p', 'ご住所'),
      scoped('city', 'c', 'ご住所'),
      scoped('addressFull', 'a', 'ご住所'),
    ]))).toEqual(['prefecture', 'city', 'street']);
  });

  it('別スコープのprefecture・cityでは絞らない', () => {
    expect(cats(refineClassifications([
      scoped('prefecture', 'op', '注文者住所'),
      scoped('city', 'oc', '注文者住所'),
      scoped('addressFull', 'oa', '注文者住所'),
      scoped('addressFull', 'da', 'お届け先住所'),
    ]))).toEqual(['prefecture', 'city', 'street', 'addressFull']);
  });

  it('city・prefecture自体は変えない', () => {
    expect(cats(refineClassifications([item('city', 'c'), item('prefecture', 'p')])))
      .toEqual(['city', 'prefecture']);
  });

  it('入力を変えない', () => {
    const input = [
      scoped('city', 'c', 'ご住所'),
      scoped('addressFull', 'a', 'ご住所'),
    ];
    refineClassifications(input);
    expect(input.map((i) => i.cls.category)).toEqual(['city', 'addressFull']);
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
    // PBI-203: (01)参加者名 は 名前 語彙に無い WPForms の参加者名ラベル。
    [{ label: '(01)参加者名 *' }, 'fullName'],
    [{ label: '姓' }, 'lastName'],
    [{ label: '名' }, 'firstName'],
    [{ label: '名 *' }, 'firstName'],
    [{ label: '（名）' }, 'firstName'],
    [{ label: 'セイ' }, 'lastName'],
    [{ label: 'メイ' }, 'firstName'],
    [{ label: 'フリガナ' }, 'fullName'],
    [{ label: 'ふりがな' }, 'fullName'],
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

  // PBI-203: 参加者名 を FULL_NAME に足しても、(02)参加者名フリガナ の kana 欄は
  // resolveKana の帰属で fullNameKana のまま残る（classifyField は kana-blind のため
  // pipeline 経由で確かめる）。
  it('keeps the participant-kana sibling on the fullNameKana route (PBI-203)', () => {
    const items = classifyRulePipeline([
      makeMeta({ id: 'a', label: '(01)参加者名 *' }),
      makeMeta({ id: 'b', label: '(02)参加者名フリガナ *' }),
    ]);
    expect(items.map((i) => i.cls.category)).toEqual(['fullName', 'fullNameKana']);
    expect(items[1]!.cls.kanaKind).toBe('katakana');
  });

  const negatives: Parameters<typeof makeMeta>[0][] = [
    { label: '件名' }, { label: '題名' }, { label: '商品名' }, { label: '品名' },
    { label: '店名' }, { label: '国名' }, { label: 'ユーザー名' }, { label: 'お届け先名' },
    // 会社名は PBI-119 で company に分類されるため negatives から外れ、
    // 単独の部署名は T2 で companyDepartment に分類されるため negatives から
    // 外れる（T2 の positive が所有する）。
    { label: 'ご担当者名' }, { label: '備考' },
    { label: 'お問い合わせ内容' }, { label: 'パスワード' },
    { name: 'user_name' }, { name: 'card_name' }, { name: 'subject' },
    { label: 'カード名義' },
  ];
  it.each(negatives)('leaves %j unclassified', (p) => {
    expect(cat(p)).toBeNull();
  });

  it('keeps contradictory kana signals unclassified (kanji/latin placeholder wins)', () => {
    expect(cat({ label: 'フリガナ', placeholder: '山田' })).toBeNull();
    expect(cat({ label: 'フリガナ', placeholder: 'John' })).toBeNull();
  });
});

describe('classifyField: gender', () => {
  it.each([
    [{ label: '性別' }, 'gender'],
    [{ label: '性別（任意）', name: 'sex' }, 'gender'],
    [{ label: 'Gender' }, 'gender'],
    [{ nearby: '性別' }, 'gender'],
  ] as [Parameters<typeof makeMeta>[0], string][])('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it.each([
    { label: '件名' }, { label: '会社名' }, { label: 'お問い合わせ内容' },
  ] as Parameters<typeof makeMeta>[0][])('does not misread %j as gender', (p) => {
    expect(cat(p)).not.toBe('gender');
  });

  it.each([
    { name: 'essex' }, { name: 'essex_county' }, { label: 'Essex' },
    { label: 'Essex address' }, { name: 'sussex' }, { nearby: 'Essex' },
  ] as Parameters<typeof makeMeta>[0][])('does not misread %j as gender (PBI-20 word boundary)', (p) => {
    expect(cat(p)).not.toBe('gender');
  });

  it.each([
    [{ label: 'sex' }, 'gender'],
    [{ name: 'sex' }, 'gender'],
    [{ label: 'Sex' }, 'gender'],
    [{ label: 'gender' }, 'gender'],
  ] as [Parameters<typeof makeMeta>[0], string][])('keeps %j as %s (PBI-20 standalone)', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });
});

describe('classifyField: age decade', () => {
  const decade = (label: string): Parameters<typeof makeMeta>[0] => ({
    tag: 'select', label,
    options: [{ value: '', text: '-' }, { value: '0', text: '20代' }, { value: '1', text: '30代' }],
  });
  it.each([
    '年齢', '年齢層', '年代', 'ねんだい', 'Age',
  ])('classifies select %s as ageDecade', (label) => {
    expect(cat(decade(label))).toBe('ageDecade');
  });

  it.each([
    { label: '年齢', placeholder: '30' },
    { label: 'ご来場予定人数' },
    { label: '学年' },
    { label: '年代物の家具' },
  ] as Parameters<typeof makeMeta>[0][])('does not misread %j as ageDecade', (p) => {
    expect(cat(p)).not.toBe('ageDecade');
  });
});

describe('classifyField: overseas address', () => {
  it.each([
    [{ label: '②Country　 ※半角英数で入力', name: 'country' }, 'country'],
    [{ label: 'Country' }, 'country'],
    [{ label: '③Address-1（Building or Apartment number）（最大文字数：80） ※半角英数で入力', name: 'address_1' }, 'address1'],
    [{ label: '④Address-2（Street number, Street name）', name: 'address_2' }, 'address2'],
    [{ label: '⑤Address-3（City）', name: 'address_3' }, 'address3'],
    [{ label: '⑥Address-4（State/Province/Region）', name: 'address_4' }, 'address4'],
    [{ label: '⑦Postal code（最大文字数：20） ※半角英数で入力', name: 'postal_code' }, 'postalCode'],
  ] as [Parameters<typeof makeMeta>[0], string][])('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it.each([
    { label: '住所' },
    { label: '郵便番号' },
    { label: '市区町村' },
    { label: '国名' },
    { label: 'メールアドレス' },
  ] as Parameters<typeof makeMeta>[0][])('does not misread %j as overseas', (p) => {
    expect(cat(p) ?? '').not.toMatch(/^(country|address[1-4]|postalCode)$/);
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
    const items = resolveKana(four.map((meta) => ({ meta, cls: classifyField(meta)! })));
    expect(refineClassifications(items).map((i) => i.cls.category)).toEqual([
      'lastName', 'firstName', 'lastNameKana', 'firstNameKana',
    ]);
  });
});

describe('classifyField: kana label with generic name', () => {
  const cases: [Parameters<typeof makeMeta>[0], string][] = [
    [{ name: 'name', label: 'フリガナ' }, 'fullName'],
    [{ name: 'name1', label: 'フリガナ' }, 'fullName'],
    [{ name: 'sei', label: 'セイ' }, 'lastName'],
    [{ name: 'last_name', label: 'セイ' }, 'lastName'],
    [{ name: 'last_name', label: '姓（フリガナ）' }, 'lastName'],
    [{ name: 'lastname', label: '姓（カナ）' }, 'lastName'],
    [{ name: 'name', nearby: 'お名前（フリガナ）', label: 'セイ' }, 'fullName'],
  ];
  it.each(cases)('classifies %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });
});

describe('kana vocabulary queries', () => {
  it('shares the genuine legends but keeps short readings field-owned', () => {
    for (const token of ['フリガナ', 'ふりがな', 'カナ', 'ひらがな', 'yomi']) {
      expect(matchFieldOwned(token)).toBe(true);
      expect(matchLegend(token)).toBe(true);
    }
    for (const token of ['読み', 'セイ', 'メイ', 'せい', 'めい']) {
      expect(matchFieldOwned(token)).toBe(true);
      expect(matchLegend(token)).toBe(false);
    }
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

  it('ignores bare 読み in a shared legend (notice boilerplate)', () => {
    expect(wantsKana(makeMeta({ nearby: '最後までお読みください' }))).toBe(false);
    expect(wantsKana(makeMeta({ nearby: '内容をよくお読みのうえご記入ください' }))).toBe(false);
    // Field-owned 読み still signals kana.
    expect(wantsKana(makeMeta({ label: 'お名前（読み）' }))).toBe(true);
    // Genuine kana legends still match.
    expect(wantsKana(makeMeta({ nearby: 'お名前（フリガナ）' }))).toBe(true);
  });

  it('ignores short readings in a shared legend (notice boilerplate)', () => {
    expect(wantsKana(makeMeta({ nearby: '作成してください' }))).toBe(false);
    expect(wantsKana(makeMeta({ nearby: '制度のご案内' }))).toBe(false);
    // Field-owned short readings still signal kana.
    expect(wantsKana(makeMeta({ label: 'セイ' }))).toBe(true);
    expect(wantsKana(makeMeta({ label: 'メイ' }))).toBe(true);
  });

  it('keeps a kanji name field with notice boilerplate out of kana attribution', () => {
    const meta = makeMeta({ name: 'your_name', label: '氏名', placeholder: '', nearby: '最後までお読みください' });
    const cls = classifyField(meta);
    expect(cls).not.toBeNull();
    const [item] = resolveKana([{ meta, cls: cls! }]);
    expect(item!.cls.category).not.toMatch(/Kana$/);
  });

  it('detects kana ranges in a pattern written with \\uXXXX escapes', () => {
    expect(wantsKana(makeMeta({ pattern: '^[\\u3041-\\u3093]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^[\\u30A1-\\u30F6]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^[ぁ-ん]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^\\d{4}$' }))).toBe(false);
    expect(wantsKana(makeMeta())).toBe(false);
  });
});

describe('classifyField: bounded input after scan cap', () => {
  it('classifies a capped 200-char label packed with address triggers quickly', () => {
    const label = '市区町村・番地'.repeat(28) + '市区町村';
    const start = performance.now();
    const c = classifyField(makeMeta({ id: 'a', label }));
    const elapsed = performance.now() - start;
    expect(c).toMatchObject({ category: 'addressNoPref', source: 'rule' });
    expect(elapsed).toBeLessThan(1000);
  });

  it('classifies short real-world labels the same as before the cap', () => {
    expect(cat({ label: '市区町村・番地' })).toBe('addressNoPref');
    expect(cat({ label: '市区町村' })).toBe('city');
    expect(cat({ label: 'フリガナ', placeholder: 'ヤマダ' })).toBe('fullName');
  });
});

// PBI-212: 英語フォームの語彙。教育機関名欄（Institution/Institute）は school 前処理の
// 語彙で先に判定し、氏名（FULL_NAME の name 語）に拾わせない。website 欄（School Website）は
// 学校名欄より先に判定して分類から外す（URL を入れたい欄に学校名が入る誤補完より不注入が
// 安全。PBI-208 実装記録の誤解釈候補）。fixture 先行: 先に失敗させてから語彙を足す。
describe('classifyField: English form vocabulary (PBI-212)', () => {
  it('classifies the English institution label as school, not fullName', () => {
    // gis-intl-admission.html:82-83 の [15] 欄（name="name-institution"）。
    expect(cat({
      name: 'name-institution',
      label: '[15]日本語を学習した教育機関名・学習期間 - / Name of Institution and Period of Japanese Study',
      placeholder: '該当する場合のみご記入ください。 / Please complete this section if applicable.',
    })).toBe('school');
  });

  it.each([
    { name: 'name-institution', label: 'Name of Institution' },
    { label: 'Institute Name' },
  ])('keeps %j on the school vocabulary and out of the person-name route', (p) => {
    expect(cat(p)).toBe('school');
  });

  it('removes the English website field from classification (School Website)', () => {
    // nishimachi-inquiry.html:28 の School Website 欄。URL を入れたい欄に
    // 学校名が入る誤補完より不注入が安全のため分類から外す。
    expect(cat({ name: 'field_976', label: 'School Website' })).toBeNull();
  });

  it.each([
    { label: 'Website' },
    { label: 'Website URL' },
  ])('keeps %j outside classification (website vocabulary)', (p) => {
    expect(cat(p)).toBeNull();
  });

  it('keeps the school-name vocabulary intact next to the website exclusion', () => {
    // website 語を持たない学校名欄は school のまま（読み順は変えない）。
    expect(cat({ label: 'Current or Most Recent School' })).toBe('school');
    expect(cat({ label: '学校名' })).toBe('school');
  });
});

describe('classifyField: juku vocabulary', () => {
  it.each([
    { label: '塾' },
    { label: '塾名' },
    { label: 'その他の塾' },
    { label: '塾を検索', placeholder: '塾を検索（入力検索可）' },
    { name: 'form:jukuShikuchosonCd', label: '塾の市区町村' },
    { name: 'form:jukuCd', label: '塾名' },
    { name: 'jukuStateCd', htmlId: 'combobox' },
  ] as Parameters<typeof makeMeta>[0][])('keeps %j off the school reading (unknown, never filled)', (p) => {
    expect(cat(p)).toBe('unknown');
  });

  it.each([
    { label: '塾' },
    { name: 'form:jukuCd', label: '塾名' },
  ] as Parameters<typeof makeMeta>[0][])('is confident for %j so the LLM fallback never sees it', (p) => {
    const c = classifyField(makeMeta(p));
    expect(c).toMatchObject({ category: 'unknown', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
    expect(isConfident(c)).toBe(true);
  });

  it('keeps the legend-only juku shape off the school reading', () => {
    expect(classifyField(makeMeta({ name: 'q', nearby: '塾' })))
      .toMatchObject({ category: 'unknown' });
  });

  it('keeps genuine school fields on the school reading next to the juku guard', () => {
    expect(cat({ label: '学校名' })).toBe('school');
    expect(cat({ label: '出身学校' })).toBe('school');
  });
});

describe('radio group classification', () => {
  const radio = (p: Partial<import('../../src/core/types').FieldMeta>) =>
    makeMeta({ tag: 'radio', type: 'radio', ...p });
  it('classifies a legend-labeled group as gender', () => {
    expect(classifyField(radio({
      name: 'field_2760244', label: '性別',
      options: [{ value: '0', text: '男性' }, { value: '1', text: '女性' }],
    }))?.category).toBe('gender');
  });
  it('classifies a decade-option group as ageDecade', () => {
    expect(classifyField(radio({
      name: 'field_4609097', label: '年齢',
      options: [{ value: '0', text: '20代' }, { value: '1', text: '30代' }],
    }))?.category).toBe('ageDecade');
  });
  it('leaves a non-decade radio group unclassified', () => {
    expect(classifyField(radio({
      name: 'field_4609054', label: '来場場所',
      options: [{ value: '0', text: '東京' }, { value: '1', text: '大阪' }],
    }))).toBeNull();
  });
});

// 緊急連絡先は電話語（電話・携帯・tel）を含まないため tel 行では拾われず、
// 欄が unknown のまま分割も計画も働かなかった。fixture 先行（AGENTS.md）:
// 先に失敗させてから語彙を足す。判定は名前段より後に置くため、緊急連絡先氏名
// のような複合語は氏名のまま保たれるはず（この優先も同じ describe で pin する）。
describe('classifyField: emergency contact vocabulary', () => {
  it.each([
    { label: '緊急連絡先' },
    { label: '緊急連絡先 必須', nearby: '保護者等情報入力' },
  ] as Parameters<typeof makeMeta>[0][])('classifies %j as tel', (p) => {
    expect(cat(p)).toBe('tel');
  });

  it('keeps 緊急連絡先氏名 on the person-name route', () => {
    expect(cat({ label: '緊急連絡先氏名' })).toBe('fullName');
  });

  it('splits three same-label emergency contact fields into tel1/tel2/tel3', () => {
    const items = classifyRulePipeline(['a', 'b', 'c'].map((id) =>
      makeMeta({ id, label: '緊急連絡先 必須', nearby: '保護者等情報入力' })));
    expect(items.map((i) => i.cls.category)).toEqual(['tel1', 'tel2', 'tel3']);
  });
});
