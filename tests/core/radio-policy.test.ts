import { describe, it, expect, vi } from 'vitest';
import { isAllowedRadioCategory } from '../../src/core/radio-policy';
import { classifyAll } from '../../src/core/analyze';
import { buildPlan } from '../../src/core/planner';
import { CATEGORIES } from '../../src/core/types';
import type { Category, FieldMeta } from '../../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import type { FieldClassifier } from '../../src/core/classifier';
import { makeMeta } from '../helpers';

// PBI-41: radio許容方針の単一所有と両呼び出し元の矛盾なさを担保する。
describe('isAllowedRadioCategory', () => {
  it('allows only gender and ageDecade', () => {
    expect(isAllowedRadioCategory('gender')).toBe(true);
    expect(isAllowedRadioCategory('ageDecade')).toBe(true);
    for (const c of CATEGORIES) {
      if (c === 'gender' || c === 'ageDecade') continue;
      expect(isAllowedRadioCategory(c)).toBe(false);
    }
  });
});

describe('PBI-41: both callers share the radio policy', () => {
  const llm = (answers: Record<string, Category>) => ({
    classify: vi.fn(async (_fields: FieldMeta[]) => new Map(Object.entries(answers))),
  }) as unknown as FieldClassifier;

  const radioMeta = (id: string) =>
    makeMeta({ id, tag: 'radio', type: 'radio', name: 'q', label: '問' });

  it('drops a non-gender/ageDecade radio LLM answer in analyze and excludes it from the plan', async () => {
    const items = await classifyAll([radioMeta('pref')], llm({ pref: 'prefecture' }));
    expect(items.map((i) => i.cls.category)).toEqual(['unknown']);
    expect(buildPlan(items, { profile: EMPTY_PROFILE, address: EMPTY_ADDRESS })).toEqual([]);
  });

  it('keeps gender/ageDecade radio LLM answers through analyze into the plan', async () => {
    const metas = [
      makeMeta({
        id: 'g', tag: 'radio', type: 'radio', name: 'g', label: '性別',
        options: [{ value: '0', text: '男性' }, { value: '1', text: '女性' }],
      }),
      makeMeta({
        id: 'a', tag: 'radio', type: 'radio', name: 'a', label: '年代',
        options: [{ value: '0', text: '20代' }, { value: '1', text: '30代' }],
      }),
    ];
    const profile = { ...EMPTY_PROFILE, gender: '女性', birthday: '1990-05-07' };
    const items = await classifyAll(metas, llm({ g: 'gender', a: 'ageDecade' }));
    expect(items.map((i) => i.cls.category)).toEqual(['gender', 'ageDecade']);
    const plan = buildPlan(items, {
      profile, address: EMPTY_ADDRESS, today: new Date(2026, 9, 5),
    });
    expect(plan.map((p) => [p.category, p.status])).toEqual([
      ['gender', 'ok'], ['ageDecade', 'ok'],
    ]);
  });
});
