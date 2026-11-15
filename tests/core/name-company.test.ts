// PBI-225: label空 × name完全一致（company および明確な変形のみ）の欄は
// company 確定（confident: LLMに回さない）。派生名（companyEmail 等）は
// 誤読しない。EXCLUDE正規表現（company|corp|...）および PBI-119 緩和境界
// との相互作用をここで固定する。fixture 先行（AGENTS.md）。
import { describe, it, expect } from 'vitest';
import { ACCEPT_THRESHOLD, classifyField, isConfident } from '../../src/core/classify-rules';
import { sendSet } from '../../src/core/pending-split';
import { makeMeta } from '../helpers';

describe('classifyField: company by bare name (PBI-225)', () => {
  // BDD: ラベルなし・name="company" は company 確定（LLMに回さない）。
  it.each([
    { name: 'company' },
    { name: 'Company' },
    { name: 'company', placeholder: '例）大塚製薬株式会社' },
    { name: 'company', htmlId: 'form_item_company' },
  ])('reads label-empty %j as a confident company', (p) => {
    const c = classifyField(makeMeta(p));
    expect(c).toMatchObject({ category: 'company', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
    expect(isConfident(c)).toBe(true);
  });

  // BDD: company_name 等の明確な変形（区切り・大小文字の違いのみ）も company。
  it.each([
    { name: 'company_name' },
    { name: 'company-name' },
    { name: 'companyName' },
    { name: 'companyname' },
  ])('reads the clear variant %j as company', (p) => {
    expect(classifyField(makeMeta(p))).toMatchObject({ category: 'company', source: 'rule' });
  });

  it('keeps the company-by-name field out of the LLM send set', () => {
    expect(sendSet([makeMeta({ name: 'company' })])).toEqual([]);
  });

  // BDD: 会社メール欄を会社名と誤読しない（従来どおりの扱い）。
  // camel連結の派生名・接頭辞付き・番号付き・kana名は対象外。
  it.each([
    { name: 'companyEmail' },
    { name: 'companyDepartment' },
    { name: 'CompanyDepartment' },
    { name: 'companyAddress' },
    { name: 'companyPhone' },
    { name: 'companyFax' },
    { name: 'companyZipCode' },
    { name: 'companyPrefecture' },
    { name: 'company-address' },
    { name: 'company_kana' },
    { name: 'company1' },
    { name: 'company2' },
    { name: 'your-company' },
    { name: 'form_company' },
    { name: 'group_company' },
    { name: 'contact-company' },
  ])('never reads the derived name %j as company', (p) => {
    expect(classifyField(makeMeta(p))?.category ?? null).not.toBe('company');
  });

  // PBI-229 で更新：companyEmail は email ゲート（name に mail を含む）が
  // 拾うため email になる。company ではないこと（本テストの意図）は不変。
  it('reads companyEmail as email since PBI-229 (never company)', () => {
    expect(classifyField(makeMeta({ name: 'companyEmail' }))).toMatchObject({
      category: 'email',
      source: 'rule',
    });
  });

  it('still leaves a lone company_kana name unknown (PBI-160: 誤注入より不注入)', () => {
    expect(classifyField(makeMeta({ name: 'company_kana' }))).toBeNull();
  });

  // ラベル付きは従来経路のまま：name=company があっても label があれば
  // name ゲートは開かず、label の語彙で読む。
  it('does not use the name gate when a label is present', () => {
    expect(classifyField(makeMeta({ name: 'company', label: 'お名前' }))?.category).not.toBe('company');
  });

  it('does not use the name gate under a shared heading', () => {
    expect(classifyField(makeMeta({ name: 'company', nearby: 'お名前' }))?.category).not.toBe('company');
  });

  // EXCLUDE との相互作用：ownText は 'company' を含むため EXCLUDE に触れるが、
  // 許可リスト名は EXCLUDE より先に company 確定する。
  it('wins over the EXCLUDE gate for the allow-listed name', () => {
    const c = classifyField(makeMeta({ name: 'company' }));
    expect(c).toMatchObject({ category: 'company', confidence: 0.7 });
  });

  // PBI-119 緩和境界との相互作用：placeholder が会社・学校の複合語彙でも、
  // label/nearby 空 × name 完全一致なら company が勝つ（sumco-3436-input 形。
  // 兄弟欄 section が部署側 = companyDepartment に解決する既存 pin と同型）。
  it('wins over the school-vocabulary placeholder for the allow-listed name', () => {
    const c = classifyField(makeMeta({
      name: 'company', htmlId: 'company',
      placeholder: '会社名・学校名を入力してください',
    }));
    expect(c).toMatchObject({ category: 'company', source: 'rule' });
    expect(isConfident(c)).toBe(true);
  });

  // PBI-119 緩和境界は不変：会社語ラベル欄は従来どおり company/companyDepartment。
  it('keeps the PBI-119 office-word readings unchanged', () => {
    expect(classifyField(makeMeta({ label: '会社名' }))).toMatchObject({ category: 'company' });
    expect(classifyField(makeMeta({ label: '部署' }))).toMatchObject({ category: 'companyDepartment' });
    expect(classifyField(makeMeta({ label: '会社名（フリガナ）' }))?.category).not.toBe('company');
    expect(classifyField(makeMeta({ label: '会社の生年月日' }))?.category).not.toBe('company');
  });

  // radio グループ（company x2）は対象外：テキスト欄だけが開く。
  it('does not classify a radio group named company', () => {
    expect(classifyField(makeMeta({ tag: 'radio', type: 'radio', name: 'company', options: [] }))?.category).not.toBe('company');
  });
});
