// PBI-227: label空 × text/tel/email型 × name に mail/email を含む欄は
// email 確定（confident: LLMに回さない）。PBI-225（name完全一致ゲート）と同型の
// label空・name基準ゲートだが、一致条件は部分一致（mail を含めば email も含む）。
// 確認系派生名（mailconf / email_confirm 等）は同じ email 値が入ることを
// planner まで固定する。fixture 先行（AGENTS.md）。
import { describe, it, expect } from 'vitest';
import { ACCEPT_THRESHOLD, classifyField, isConfident } from '../../src/core/classify-rules';
import { sendSet } from '../../src/core/pending-split';
import { buildPlan } from '../../src/core/planner';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import { makeMeta } from '../helpers';

describe('classifyField: email by bare name (PBI-227)', () => {
  // BDD: ラベルなし・name="item_mail_1" は email 確定（LLMに回さない）。
  it.each([
    { name: 'item_mail_1' },
    { name: 'item_mail_2' },
    { name: 'Item_Mail_1' },
    { name: 'mail' },
    { name: 'mail2' },
    { name: 'email' },
    { name: 'email2' },
    { name: 'item_mail_1', placeholder: '例）abc@example.com' },
    { name: 'item_mail_1', htmlId: 'form_item_mail_1' },
  ])('reads label-empty %j as a confident email', (p) => {
    const c = classifyField(makeMeta(p));
    expect(c).toMatchObject({ category: 'email', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
    expect(isConfident(c)).toBe(true);
  });

  it('keeps the email-by-name field out of the LLM send set', () => {
    expect(sendSet([makeMeta({ name: 'item_mail_1' })])).toEqual([]);
  });

  // BDD: 確認系派生名も email 扱い。planner は同一 profile.email を入れるため
  // 既存の確認欄流用（同じ値が入る）と矛盾しない。
  it.each([
    { name: 'mailconf' },
    { name: 'mailConfirm' },
    { name: 'email_confirm' },
    { name: 'emailConfirmFull' },
    { name: 'emailConfirmation' },
    { name: 'mailCheck' },
    { name: 'mail_kakunin' },
    { name: 'email_reissue' },
    { name: 'contact_mail' },
    { name: 'mailaddress' },
    { name: 'EmailAddressConfirm' },
  ])('reads the confirm-derived name %j as email too', (p) => {
    expect(classifyField(makeMeta(p))?.category).toBe('email');
  });

  it('fills the main and confirm email fields with the same value', () => {
    const profile = { ...EMPTY_PROFILE, email: 'yamada@example.com' };
    const metas = [makeMeta({ id: 'm1', name: 'mail' }), makeMeta({ id: 'm2', name: 'mailconf' })];
    const items = metas.map((meta) => ({
      meta,
      cls: classifyField(meta) ?? { category: 'unknown' as const, confidence: 0, source: 'rule' as const },
    }));
    const plan = buildPlan(items, { profile, address: EMPTY_ADDRESS });
    expect(plan.filter((p) => p.status === 'ok').map((p) => p.value)).toEqual([
      'yamada@example.com',
      'yamada@example.com',
    ]);
  });

  // text/tel/email 型だけが対象。type=email はページ自身の宣言（0.9）が先に勝つ。
  it('lets an explicit type=email declaration win over the name gate', () => {
    expect(classifyField(makeMeta({ name: 'item_mail_1', type: 'email' }))).toMatchObject({
      category: 'email',
      confidence: 0.9,
    });
  });

  it('reads a bare mail name on type=tel as email', () => {
    expect(classifyField(makeMeta({ name: 'contact_mail', type: 'tel' }))?.category).toBe('email');
  });

  // 誤読防止：mail を含んでもメール欄でない非テキスト欄は対象外。
  it.each([
    { name: 'mailmag', tag: 'input', type: 'checkbox' },
    { name: 'mail', tag: 'input', type: 'search' },
    { name: 'mail', tag: 'select', type: 'select', options: [] },
    { name: 'mail', tag: 'radio', type: 'radio', options: [] },
  ] as Parameters<typeof makeMeta>[0][])('never reads the non-text field %j as email', (p) => {
    expect(classifyField(makeMeta(p))?.category ?? null).not.toBe('email');
  });

  // 誤読防止：フォーム名由来の mailform*（'mail' は欄ではなく容器を指す）は
  // 従来どおり。tel 3-split（mailform6[0..2]）は tel 分割の対象のまま残す。
  it.each([
    { name: 'mailform2[0]' },
    { name: 'mailform4' },
    { name: 'mail-form2' },
    { name: 'mail_form3' },
  ])('never reads the form-container name %j as email', (p) => {
    expect(classifyField(makeMeta(p))?.category ?? null).not.toBe('email');
  });

  it('leaves the mailform tel 3-split to the tel refinement', () => {
    expect(classifyField(makeMeta({ name: 'mailform6[0]', type: 'tel' }))).toMatchObject({
      category: 'tel',
      confidence: 0.5,
    });
  });

  // 誤読防止：送信先指定の mailto は従来どおり未分類（利用者のアドレスを
  // 入れると誤配送の恐れがあるため、LLM 補助に回す）。
  it('never reads the destination field mailto as email', () => {
    expect(classifyField(makeMeta({ name: 'mailto' }))).toBeNull();
  });

  // htmlId だけの mail 信号は対象外（name 基準。PBI-225 と同型の適用範囲）。
  it('ignores a mail word carried by htmlId alone', () => {
    expect(classifyField(makeMeta({ name: 'contact', htmlId: 'form_mail' }))?.category ?? null).not.toBe(
      'email',
    );
  });

  // ラベル・共有見出し付きは従来経路のまま：name ゲートは開かない。
  it('does not use the name gate when a label is present', () => {
    expect(classifyField(makeMeta({ name: 'item_mail_1', label: 'お名前' }))?.category).not.toBe('email');
  });

  it('does not use the name gate under a shared heading', () => {
    expect(classifyField(makeMeta({ name: 'item_mail_1', nearby: 'お名前' }))?.category).not.toBe('email');
  });

  // EXCLUDE との相互作用：mail_company は company 語を含むが、name ゲートが
  // EXCLUDE より先に email 確定する（PBI-225 の会社ゲートと同型の順序）。
  it('wins over the EXCLUDE gate for a bare mail_company name', () => {
    const c = classifyField(makeMeta({ name: 'mail_company' }));
    expect(c).toMatchObject({ category: 'email', confidence: 0.7 });
  });

  // PBI-225 との相互作用：name=company は company のまま（email ゲートは
  // company ゲートの後に置く）。companyEmail は company ではなく email になる
  // （company ゲートは完全一致のため開かず、email ゲートが拾う。PBI-227 で更新）。
  it('leaves the bare company name to the company gate', () => {
    expect(classifyField(makeMeta({ name: 'company' }))).toMatchObject({ category: 'company' });
  });

  it('reads companyEmail as email, not company (PBI-227 updates PBI-225)', () => {
    expect(classifyField(makeMeta({ name: 'companyEmail' }))).toMatchObject({
      category: 'email',
      source: 'rule',
    });
  });

  // 検索窓ゲートとの順序：検索窓名（q 等）は mail を含まないため対象外のまま。
  it('leaves search-box names unknown as before', () => {
    const c = classifyField(makeMeta({ name: 'q' }));
    expect(c).toMatchObject({ category: 'unknown', source: 'rule' });
    expect(isConfident(c)).toBe(true);
  });
});
