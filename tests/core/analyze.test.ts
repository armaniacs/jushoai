import { describe, it, expect, vi } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import type { Category, FieldMeta } from '../../src/core/types';
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

  it('drops unresolved fields when the LLM is unavailable or answers unknown', async () => {
    const metas = [makeMeta({ id: 'b', name: 'xyz' })];
    expect(await classifyAll(metas, null)).toEqual([]);
    expect(await classifyAll(metas, llm({ b: 'unknown' }).classifier)).toEqual([]);
  });

  it('falls back to rules when the LLM throws', async () => {
    const classifier: FieldClassifier = { classify: async () => { throw new Error('x'); } };
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'last_name' }), makeMeta({ id: 'b', name: 'xyz' })],
      classifier,
    );
    expect(items.map((i) => i.cls.category)).toEqual(['lastName']);
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
    expect(items.map((i) => [i.meta.id, i.cls.category])).toEqual([['d', 'lastName']]);
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('kana overlay', () => {
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

  it('applies to LLM answers too', async () => {
    const { classifier } = llm({ a: 'lastName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'xyz', pattern: '[ぁ-ん]+' })],
      classifier,
    );
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', source: 'llm', kanaKind: 'hiragana' });
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
    expect(items.map((i) => i.cls.category)).toEqual(['lastName']);
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
