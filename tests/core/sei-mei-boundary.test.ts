import { describe, it, expect } from 'vitest';
import { classifyField, classifyRulePipeline } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';

const cat = (p: Parameters<typeof makeMeta>[0]) => classifyField(makeMeta(p))?.category ?? null;

describe('sei/mei boundary', () => {
  it.each([
    [{ name: 'form:SSeiKanji' }, 'lastName'],
    [{ name: 'form:SMeiKanji' }, 'firstName'],
    [{ name: 'form:SSeiKana' }, 'lastName'],
    [{ name: 'ssei' }, 'lastName'],
    [{ name: 'smei' }, 'firstName'],
    [{ name: 'seikanji' }, 'lastName'],
    [{ name: 'meikana' }, 'firstName'],
  ] as Parameters<typeof makeMeta>[0][])('classifies bare %j as %s', (p, expected) => {
    expect(cat(p)).toBe(expected);
  });

  it.each([
    { name: 'sensei' },
    { label: 'sensei' },
    { name: 'senseikanji' },
    { name: 'meishi' },
    { name: 'meiko' },
    { name: 'seiko' },
  ] as Parameters<typeof makeMeta>[0][])('leaves %j unclassified', (p) => {
    expect(cat(p)).toBeNull();
  });

  it('keeps kana attribution for the adachi child kana pair', () => {
    const items = classifyRulePipeline([
      makeMeta({ id: 'a', name: 'form:SSeiKana', label: '名前のセイ', placeholder: 'セイ', nearby: '児童氏名(カナ)' }),
      makeMeta({ id: 'b', name: 'form:j_idt138', label: '名前のメイ', placeholder: 'メイ', nearby: '児童氏名(カナ)' }),
    ]);
    expect(items.map((i) => i.cls.category)).toEqual(['lastNameKana', 'firstNameKana']);
  });
});
