// Locks the kana-blind contract (findings I / code-quality Dx2):
// classifyField answers plain name bases only; kana attribution belongs to
// resolveKana, which classifyAll runs before refineClassifications.
// A caller that skips resolveKana silently keeps kanji bases.
import { describe, expect, it } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import { classifyField, refineClassifications } from '../../src/core/classify-rules';
import type { FieldMeta, Item } from '../../src/core/types';
import { makeMeta } from '../helpers';

const cat = (p: Partial<FieldMeta>) => classifyField(makeMeta(p))?.category;

describe('kana-blind contract', () => {
  it('classifyField returns plain bases for kana-worded fields', () => {
    expect(cat({ label: 'フリガナ' })).toBe('fullName');
    expect(cat({ label: 'セイ', placeholder: 'ヤマダ' })).toBe('lastName');
    expect(cat({ label: 'メイ', placeholder: 'タロウ' })).toBe('firstName');
    expect(cat({ name: 'kana_sei' })).toBe('lastName');
  });

  it('classifyField never attaches kanaKind (resolveKana owns it)', () => {
    for (const m of [
      makeMeta({ label: 'フリガナ', placeholder: 'ヤマダ' }),
      makeMeta({ label: 'ふりがな', placeholder: 'やまだ' }),
      makeMeta({ label: 'セイ' }),
    ]) {
      expect(classifyField(m)?.kanaKind).toBeUndefined();
    }
  });

  it('classifyAll converts bases to kana before refinement splits the pair', async () => {
    const items = await classifyAll([
      makeMeta({ id: 'a', autocomplete: 'name', label: 'フリガナ' }),
      makeMeta({ id: 'b', autocomplete: 'name', label: 'フリガナ' }),
    ], null);
    expect(items.map((i) => i.cls.category)).toEqual(['lastNameKana', 'firstNameKana']);
  });

  it('refineClassifications alone never invents kana (resolveKana must run first)', () => {
    const metas = [
      makeMeta({ id: 'a', autocomplete: 'name', label: 'フリガナ' }),
      makeMeta({ id: 'b', autocomplete: 'name', label: 'フリガナ' }),
    ];
    const unresolved: Item[] = metas.map((meta) => ({ meta, cls: classifyField(meta)! }));
    expect(unresolved.map((i) => i.cls.category)).toEqual(['fullName', 'fullName']);
    const refined = refineClassifications(unresolved);
    expect(refined.map((i) => i.cls.category)).toEqual(['lastName', 'firstName']);
  });
});
