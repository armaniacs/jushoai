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
});
