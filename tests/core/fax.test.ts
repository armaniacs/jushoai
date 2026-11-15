// PBI-226: FAX番号欄の扱い整理。FAX語彙（FAX番号・FAX・fax）の電話系欄は
// fax カテゴリに確定する（confident: LLMに回さない）。電話番号値の流用
// （プロファイルにFAX値なし→電話番号値）は planner が担い、電話番号欄
// （tel）との区別は refine でも崩さない。fixture 先行（AGENTS.md）。
import { describe, it, expect } from 'vitest';
import { ACCEPT_THRESHOLD, classifyField, isConfident, refineClassifications } from '../../src/core/classify-rules';
import { sendSet } from '../../src/core/pending-split';
import { buildPlan } from '../../src/core/planner';
import type { Item } from '../../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import { makeMeta } from '../helpers';

const cat = (p: Parameters<typeof makeMeta>[0]) => classifyField(makeMeta(p))?.category ?? null;

describe('classifyField: fax (PBI-226)', () => {
  // BDD: FAX番号欄はFAXとして確定する（LLMに回さない）。信号はラベル側の
  // 文言（label/placeholder・legend）のみ。
  it.each([
    { label: 'FAX番号' },
    { label: 'FAX' },
    { label: 'fax' },
    { label: 'ＦＡＸ番号' },
    { label: 'FAX番号任意' },
    { label: '所属先FAX番号' },
    { name: 'faxnumber', placeholder: 'FAX番号をご入力ください' },
    { name: 'fax', nearby: 'FAX番号' },
  ])('reads the fax wording %j as a confident fax', (p) => {
    const c = classifyField(makeMeta(p));
    expect(c).toMatchObject({ category: 'fax', source: 'rule' });
    expect(c!.confidence).toBeGreaterThanOrEqual(ACCEPT_THRESHOLD);
    expect(isConfident(c)).toBe(true);
  });

  // 対象外の境界：name/id だけの素の fax 名は既存のまま（tel 名寄せ・分割の
  // 対象として残し、電話番号欄のふるまいを壊さない）。ファクス（カタカナ）も
  // 対象外で LLM 補助に回る。
  it.each([
    [{ name: 'fax' }],
    [{ name: 'faxnumber' }],
    [{ name: 'your-fax' }],
    [{ name: 'FAX1' }],
    [{ name: 'fax_no', label: 'ファクス番号' }],
    [{ label: '9.ファクス' }],
  ])('leaves the bare or katakana fax wording %j to the existing handling', (p) => {
    expect(cat(p)).not.toBe('fax');
  });

  it('keeps the fax field out of the LLM send set', () => {
    expect(sendSet([makeMeta({ label: 'FAX番号' })])).toEqual([]);
  });

  // 落とし穴: 電話番号欄との区別を崩さない（FAX確定が tel 分類を奪わない）。
  it.each([
    [{ label: '電話番号' }, 'tel'],
    [{ label: '携帯電話' }, 'tel'],
    [{ label: 'お電話番号' }, 'tel'],
    [{ name: 'phone' }, 'tel'],
    [{ name: 'companyFax' }, null],
  ])('keeps the tel reading for %j', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it('does not read hotel as a fax', () => {
    expect(cat({ name: 'hotel' })).toBeNull();
  });
});

describe('refineClassifications: fax stays apart from tel (PBI-226)', () => {
  const item = (category: 'tel' | 'fax', id: string, label = ''): Item => ({
    meta: makeMeta({ id, label }),
    cls: { category, confidence: 0.8, source: 'rule' },
  });

  it('keeps a lone fax as fax', () => {
    expect(refineClassifications([item('fax', 'a')]).map((i) => i.cls.category)).toEqual(['fax']);
  });

  // hulic/anabuki 形: 同キー（label・nearbyとも空）の tel+fax 対は PBI-09 の
  // empty-key leftover で共倒れさせない。fax は tel 系の分割・unknown 化の
  // 対象外で、tel 側の既存 fill を壊さない。
  it('does not collapse a same-key tel+fax pair into unknown', () => {
    const out = refineClassifications([item('tel', 'a'), item('fax', 'b')]);
    expect(out.map((i) => i.cls.category)).toEqual(['tel', 'fax']);
  });
});

describe('buildPlan: fax borrows the tel value (PBI-226)', () => {
  const faxItem = (): Item => ({
    meta: makeMeta({ id: 'fax' }),
    cls: { category: 'fax', confidence: 0.7, source: 'rule' },
  });

  // BDD: FAXとして確定した欄にプロファイルのFAX値がなければ電話番号値が入る。
  it('fills the tel value into a fax field', () => {
    const profile = { ...EMPTY_PROFILE, tel: '09012345678' };
    const plan = buildPlan([faxItem()], { profile, address: EMPTY_ADDRESS });
    expect(plan).toEqual([expect.objectContaining({ category: 'fax', value: '09012345678', status: 'ok' })]);
  });

  it('warns without a value when no tel is registered', () => {
    const plan = buildPlan([faxItem()], { profile: EMPTY_PROFILE, address: EMPTY_ADDRESS });
    expect(plan).toEqual([expect.objectContaining({ category: 'fax', value: '', status: 'warn-no-value' })]);
  });
});
