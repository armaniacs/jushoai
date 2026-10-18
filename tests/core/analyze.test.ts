import { describe, it, expect, vi } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import { buildPlan } from '../../src/core/planner';
import type { Category, FieldMeta } from '../../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import type { FieldClassifier } from '../../src/core/classifier';
import { makeMeta } from '../helpers';

const llm = (answers: Record<string, Category>) => {
  const classify = vi.fn(async (_fields: FieldMeta[]) => new Map(Object.entries(answers)));
  return { classifier: { classify } as FieldClassifier, classify };
};

describe('classifyAll', () => {
  it('uses rule results without calling the LLM when nothing is pending', async () => {
    const { classifier, classify } = llm({});
    const items = await classifyAll([makeMeta({ id: 'a', name: 'last_name' })], classifier);
    expect(items.map((i) => i.cls.category)).toEqual(['lastName']);
    expect(classify).not.toHaveBeenCalled();
  });

  it('asks the LLM only about unresolved fields', async () => {
    const { classifier, classify } = llm({ b: 'building' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'last_name' }), makeMeta({ id: 'b', name: 'xyz' })],
      classifier,
    );
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['b']);
    expect(items.map((i) => [i.cls.category, i.cls.source])).toEqual([
      ['lastName', 'rule'], ['building', 'llm'],
    ]);
  });

  it('keeps unresolved fields as unknown when the LLM is unavailable or answers unknown', async () => {
    const metas = [makeMeta({ id: 'b', name: 'xyz' })];
    for (const classifier of [null, llm({ b: 'unknown' }).classifier]) {
      const items = await classifyAll(metas, classifier);
      expect(items.map((i) => [i.cls.category, i.cls.source])).toEqual([['unknown', 'rule']]);
    }
  });

  it('keeps a weak rule tel hit when the classifier is null', async () => {
    const items = await classifyAll([makeMeta({ id: 'a', type: 'tel' })], null);
    expect(items.map((i) => [i.cls.category, i.cls.confidence, i.cls.source])).toEqual([
      ['tel', 0.5, 'rule'],
    ]);
  });

  it('refines three weak tel fields into tel1/2/3 without the LLM', async () => {
    const metas = ['a', 'b', 'c'].map((id) => makeMeta({ id, type: 'tel' }));
    const items = await classifyAll(metas, null);
    expect(items.map((i) => i.cls.category)).toEqual(['tel1', 'tel2', 'tel3']);
  });

  it('excludes unknown fields from the plan so nothing is misfilled', async () => {
    const items = await classifyAll([makeMeta({ id: 'b', name: 'xyz' })], null);
    expect(items.map((i) => i.cls.category)).toEqual(['unknown']);
    expect(buildPlan(items, { profile: EMPTY_PROFILE, address: EMPTY_ADDRESS })).toEqual([]);
  });

  it('falls back to rules when the LLM throws', async () => {
    const classifier: FieldClassifier = { classify: async () => { throw new Error('x'); } };
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'last_name' }), makeMeta({ id: 'b', name: 'xyz' })],
      classifier,
    );
    expect(items.map((i) => i.cls.category)).toEqual(['lastName', 'unknown']);
  });

  it('attaches kanaKind to LLM kana answers', async () => {
    const { classifier } = llm({ a: 'lastNameKana' });
    const [item] = await classifyAll([makeMeta({ id: 'a', pattern: '[ｦ-ﾟ]+' })], classifier);
    expect(item!.cls).toMatchObject({ category: 'lastNameKana', source: 'llm', kanaKind: 'halfKatakana' });
  });

  it('treats weak rule hits as pending', async () => {
    const { classifier, classify } = llm({ a: 'zip' });
    const [item] = await classifyAll([makeMeta({ id: 'a', type: 'tel' })], classifier);
    expect(classify).toHaveBeenCalledOnce();
    expect(item!.cls).toMatchObject({ category: 'zip', source: 'llm' });
  });

  it('refines split groups after merging', async () => {
    const metas = ['a', 'b', 'c'].map((id) => makeMeta({ id, name: 'tel' }));
    const items = await classifyAll(metas, null);
    expect(items.map((i) => i.cls.category)).toEqual(['tel1', 'tel2', 'tel3']);
  });

  it('completes with prototype-name autocomplete fields and leaves other fields intact', async () => {
    const { classifier, classify } = llm({ a: 'unknown' });
    const metas = [
      makeMeta({ id: 'a', autocomplete: 'constructor' }),
      makeMeta({ id: 'b', autocomplete: 'toString' }),
      makeMeta({ id: 'c', autocomplete: 'valueOf' }),
      makeMeta({ id: 'd', name: 'last_name' }),
    ];
    const items = await classifyAll(metas, classifier);
    expect(items.map((i) => [i.meta.id, i.cls.category])).toEqual([
      ['a', 'unknown'], ['b', 'unknown'], ['c', 'unknown'], ['d', 'lastName'],
    ]);
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops LLM misclassifications of non-gender radio groups to unknown', async () => {
    const { classifier } = llm({ pay: 'lastName', mail: 'email' });
    const metas = [
      makeMeta({ id: 'pay', tag: 'radio', name: 'payment_method', label: 'お支払い方法' }),
      makeMeta({ id: 'mail', tag: 'radio', name: 'contact_method', label: '連絡方法' }),
    ];
    const items = await classifyAll(metas, classifier);
    expect(items.map((i) => [i.meta.id, i.cls.category])).toEqual([
      ['pay', 'unknown'], ['mail', 'unknown'],
    ]);
    expect(buildPlan(items, { profile: EMPTY_PROFILE, address: EMPTY_ADDRESS })).toEqual([]);
  });

  it('keeps gender/ageDecade LLM answers for radio groups', async () => {
    const { classifier } = llm({ g: 'gender', a: 'ageDecade' });
    const metas = [
      makeMeta({ id: 'g', tag: 'radio', name: 'q1', label: '問1' }),
      makeMeta({ id: 'a', tag: 'radio', name: 'q2', label: '問2' }),
    ];
    const items = await classifyAll(metas, classifier);
    expect(items.map((i) => [i.meta.id, i.cls.category, i.cls.source])).toEqual([
      ['g', 'gender', 'llm'], ['a', 'ageDecade', 'llm'],
    ]);
  });
});

describe('kana overlay', () => {
  it('locks end-to-end kana attribution for bare kana labels', async () => {
    const items = await classifyAll([
      makeMeta({ id: 'a', label: 'セイ' }),
      makeMeta({ id: 'b', label: 'メイ' }),
      makeMeta({ id: 'c', label: 'フリガナ' }),
      makeMeta({ id: 'd', label: 'ふりがな' }),
    ], null);
    expect(items.map((i) => i.cls.category)).toEqual([
      'lastNameKana', 'firstNameKana', 'fullNameKana', 'fullNameKana',
    ]);
  });

  it('converts an autocomplete name hit when the field wants kana', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'field_4371037_sei', autocomplete: 'family-name',
      label: '名前の姓', placeholder: '例：みらい', nearby: 'ふりがな',
    })], null);
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', kanaKind: 'hiragana', confidence: 0.95 });
  });

  it('converts a katakana field with a セイ placeholder', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'field_4695585_sei', autocomplete: 'family-name',
      label: '名前の姓', placeholder: 'セイ', nearby: 'お名前（カタカナ）',
    })], null);
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', kanaKind: 'katakana' });
  });

  it('keeps the kanji category when the placeholder is kanji', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'field_4371018_sei', autocomplete: 'family-name',
      label: '名前の姓', placeholder: '例：未来', nearby: 'お名前',
    })], null);
    expect(items[0]!.cls.category).toBe('lastName');
    expect(items[0]!.cls.kanaKind).toBeUndefined();
  });

  it('converts legend-only kana fields the name route reads as kanji', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'f_1', label: '名前の姓', nearby: 'ふりがな',
    })], null);
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', kanaKind: 'hiragana' });
  });

  it('never touches non-name categories', async () => {
    const items = await classifyAll([makeMeta({ id: 'a', type: 'email', label: 'フリガナ連絡先' })], null);
    expect(items[0]!.cls.category).toBe('email');
  });

  it('does not flip plain-name fields in a shared kana-word legend when a sibling claims kana', async () => {
    const items = await classifyAll([
      makeMeta({ id: 'a', name: 'sei', label: '名前の姓', nearby: 'お名前（フリガナ）' }),
      makeMeta({ id: 'b', name: 'c_sei', placeholder: 'ヤマダ', nearby: 'お名前（フリガナ）' }),
    ], null);
    expect(items.map((i) => i.cls.category)).toEqual(['lastName', 'lastNameKana']);
  });

  it('splits a kana full-name pair after the overlay', async () => {
    const items = await classifyAll([
      makeMeta({ id: 'a', autocomplete: 'name', label: 'フリガナ' }),
      makeMeta({ id: 'b', autocomplete: 'name', label: 'フリガナ' }),
    ], null);
    expect(items.map((i) => i.cls.category)).toEqual(['lastNameKana', 'firstNameKana']);
  });

  it('fills a pattern-only kana field as kana (pattern is per-field evidence)', async () => {
    const items = await classifyAll([makeMeta({ id: 'a', name: 'f1', label: '連絡先', pattern: '^[ァ-ヶ]+$' })], null);
    expect(items.map((i) => i.cls.category)).toEqual(['fullNameKana']);
  });

  it('applies to LLM answers too', async () => {
    const { classifier } = llm({ a: 'lastName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'xyz', pattern: '[ぁ-ん]+' })],
      classifier,
    );
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', source: 'llm', kanaKind: 'hiragana' });
  });
});

describe('classifyAll: rule-only audit trace (PBI-27)', () => {
  it('emits exactly one debug line with count and duration on rule-only runs', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    try {
      const metas = [makeMeta({ id: 'a', name: 'last_name' }), makeMeta({ id: 'b', type: 'tel' })];
      await classifyAll(metas, null);
      expect(debug).toHaveBeenCalledTimes(1);
      const line = String(debug.mock.calls[0]![0]);
      expect(line).toMatch(/fields=2/);
      expect(line).toMatch(/durationMs=\d+/);
    } finally {
      debug.mockRestore();
    }
  });

  it('emits the line when the classifier is present but nothing is pending', async () => {
    const { classifier, classify } = llm({});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    try {
      await classifyAll([makeMeta({ id: 'a', name: 'last_name' })], classifier);
      expect(classify).not.toHaveBeenCalled();
      expect(debug).toHaveBeenCalledTimes(1);
      expect(String(debug.mock.calls[0]![0])).toMatch(/fields=1/);
    } finally {
      debug.mockRestore();
    }
  });

  it('emits no rule-only line when the LLM path is used', async () => {
    const { classifier } = llm({ b: 'building' });
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    try {
      await classifyAll(
        [makeMeta({ id: 'a', name: 'last_name' }), makeMeta({ id: 'b', name: 'xyz' })],
        classifier,
      );
      expect(debug).not.toHaveBeenCalled();
    } finally {
      debug.mockRestore();
    }
  });

  it('keeps values and PII out of the line and stays within the byte budget', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    try {
      const secret = 'SECRET_PII_山田太郎_' + 'x'.repeat(50);
      await classifyAll([makeMeta({
        id: 'a', name: 'last_name', label: secret, placeholder: secret,
        nearby: secret, value: secret,
      })], null);
      expect(debug).toHaveBeenCalledTimes(1);
      const line = debug.mock.calls.map((c) => String(c[0])).join('\n');
      expect(line).not.toContain(secret);
      expect(line).not.toContain('山田太郎');
      // Fixed short format: far below the audit byte budget (AUDIT_MAX_BYTES).
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(512);
    } finally {
      debug.mockRestore();
    }
  });

  it('accumulates nothing across runs: one line per run, no retained batch', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    try {
      const metas = [makeMeta({ id: 'a', name: 'last_name' })];
      await classifyAll(metas, null);
      await classifyAll(metas, null);
      await classifyAll(metas, null);
      // Ephemeral console trace only — no stored entries for retention to expire.
      expect(debug).toHaveBeenCalledTimes(3);
    } finally {
      debug.mockRestore();
    }
  });
});

describe('classifyAll: force', () => {
  it('sends confident fields to the LLM and adopts the answers', async () => {
    const { classifier, classify } = llm({ a: 'firstName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', autocomplete: 'family-name' })],
      classifier,
      { force: true },
    );
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['a']);
    expect(items[0]!.cls).toMatchObject({ category: 'firstName', source: 'llm' });
  });

  it('keeps rule results for fields the LLM does not answer', async () => {
    const { classifier, classify } = llm({});
    const items = await classifyAll(
      [makeMeta({ id: 'a', autocomplete: 'family-name' }), makeMeta({ id: 'b', name: 'xyz' })],
      classifier,
      { force: true },
    );
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['a', 'b']);
    expect(items.map((i) => i.cls.category)).toEqual(['lastName', 'unknown']);
  });

  it('falls back to weak rule hits when the LLM throws', async () => {
    const classifier: FieldClassifier = { classify: async () => { throw new Error('x'); } };
    const items = await classifyAll([makeMeta({ id: 'a', type: 'tel' })], classifier, { force: true });
    expect(items.map((i) => i.cls.category)).toEqual(['tel']);
  });

  it('keeps applying the kana overlay to LLM answers', async () => {
    const { classifier } = llm({ a: 'lastName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'field_1', autocomplete: 'family-name', placeholder: 'みらい' })],
      classifier,
      { force: true },
    );
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', source: 'llm', kanaKind: 'hiragana' });
  });
});
