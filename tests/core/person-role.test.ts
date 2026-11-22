import { describe, expect, it } from 'vitest';
import { classifyRulePipeline } from '../../src/core/classify-rules';
import { refineClassifications } from '../../src/core/classify-rules';
import { assignPersonRole, roleOf } from '../../src/core/person-role';
import type { Classification, Item } from '../../src/core/types';
import { makeMeta } from '../helpers';

const role = (p: Parameters<typeof makeMeta>[0]) => assignPersonRole(makeMeta(p)).role;

const item = (category: Item['cls']['category'], id: string, meta: Partial<Parameters<typeof makeMeta>[0]> = {}): Item => ({
  meta: makeMeta({ id, ...meta }),
  cls: { category, confidence: 0.8, source: 'rule' } as Classification,
});

describe('assignPersonRole', () => {
  it('reads the child section from the shared heading', () => {
    expect(role({ label: '名前の姓', nearby: '児童氏名(漢字)' })).toBe('child');
    expect(role({ label: '名前のセイ', nearby: '児童氏名(カナ)' })).toBe('child');
  });

  it('reads the guardian section from the shared heading', () => {
    expect(role({ label: '名前の姓', nearby: '保護者氏名(漢字)' })).toBe('guardian');
    expect(role({ label: '名前のセイ', nearby: '保護者氏名(カナ)' })).toBe('guardian');
  });

  it('reads the person word from the field itself', () => {
    expect(role({ name: 'parent-name', label: '氏名' })).toBe('guardian');
    expect(role({ name: 'student-name', label: '氏名' })).toBe('child');
  });

  it('reads the English section headings', () => {
    expect(role({ label: 'Name', nearby: 'Parent or Guardian Name' })).toBe('guardian');
    expect(role({ label: 'Name', nearby: 'Student Name' })).toBe('child');
  });

  it('decides a word/area conflict by confidence and keeps the evidence', () => {
    const judged = assignPersonRole(makeMeta({ label: '保護者氏名', nearby: '児童氏名(漢字)' }));
    expect(judged.role).toBe('guardian');
    expect(judged.reason).toContain('conflict');
    expect(judged.reason).toContain('guardian');
    expect(judged.reason).toContain('child');
  });

  it('raises confidence when the word and the area agree', () => {
    const agreed = assignPersonRole(makeMeta({ label: '保護者氏名', nearby: '保護者氏名(漢字)' }));
    const areaOnly = assignPersonRole(makeMeta({ label: '名前の姓', nearby: '保護者氏名(漢字)' }));
    expect(agreed.role).toBe('guardian');
    expect(agreed.confidence).toBeGreaterThan(areaOnly.confidence);
    expect(agreed.reason).toBe('word+area:guardian');
  });

  it('falls back to self when nothing points at a person', () => {
    expect(role({ label: '氏名', name: 'fullname' })).toBe('self');
    expect(role({ label: 'メールアドレス' })).toBe('self');
  });
});

describe('pipeline roles', () => {
  it('assigns child and guardian through the rule pipeline without changing categories', () => {
    const items = classifyRulePipeline([
      makeMeta({ id: 'c', name: 'form:SSeiKanji', label: '名前の姓', placeholder: '姓', nearby: '児童氏名(漢字)', autocomplete: 'family-name' }),
      makeMeta({ id: 'g', name: 'form:j_idt1718', label: '名前の姓', placeholder: '姓', nearby: '保護者氏名(漢字)', autocomplete: 'family-name' }),
    ]);
    expect(items.map((i) => i.role)).toEqual(['child', 'guardian']);
    expect(items.map((i) => i.cls.category)).toEqual(['lastName', 'lastName']);
    for (const i of items) {
      expect(i.roleReason).toBeTruthy();
    }
  });

  it('treats role-less items as self', () => {
    expect(roleOf({ meta: makeMeta({ id: 'x' }), cls: { category: 'tel', confidence: 0.8, source: 'rule' } })).toBe('self');
  });
});

describe('refineClassifications stays within one role', () => {
  it('does not drop an oversized group split across two roles', () => {
    const four = ['a', 'b', 'c', 'd'].map((id, n) =>
      ({ ...item('tel', id, { label: '電話', nearby: '電話番号' }), role: (n < 2 ? 'child' : 'guardian') as Item['role'] }),
    );
    expect(refineClassifications(four).map((i) => i.meta.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('still drops an oversized group within the same role', () => {
    const four = ['a', 'b', 'c', 'd'].map((id) => item('tel', id, { label: '電話', nearby: '電話番号' }));
    expect(refineClassifications(four)).toEqual([]);
  });

  it('splits part-ordered tel fields per role block', () => {
    const labels = ['電話番号の市外局番', '電話番号の市内局番', '電話番号の加入者番号'];
    const items = [
      ...['a', 'b', 'c'].map((id, n) => ({ ...item('tel', id, { label: labels[n]!, nearby: '電話番号' }), role: 'child' as const })),
      ...['d', 'e', 'f'].map((id, n) => ({ ...item('tel', id, { label: labels[n]!, nearby: '緊急連絡先' }), role: 'guardian' as const })),
    ];
    expect(refineClassifications(items).map((i) => i.cls.category)).toEqual([
      'tel1', 'tel2', 'tel3', 'tel1', 'tel2', 'tel3',
    ]);
  });

  it('narrows an address only within the same role block', () => {
    const items = [
      item('city', 'c', { label: '市区町村', nearby: '住所' }),
      { ...item('addressFull', 'a', { label: '住所', nearby: '現住所' }), role: 'guardian' as const },
    ];
    expect(refineClassifications(items).map((i) => i.cls.category)).toEqual(['city', 'addressFull']);
  });
});
