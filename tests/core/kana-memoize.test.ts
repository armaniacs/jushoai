// PBI-84: 同一フィールドの wantsKana 系評価を使い回す（挙動不変）。
// - 振る舞いロック: カナ/漢字/プレースホルダのみカナ/見出し共有の混在フォームを
//   classifyAll し、分類カテゴリと kanaKind が変わらないことを固定する。
// - 回数ロック: classifyField 内の3系統（name/id・label/placeholder・nearby）は
//   wantsKana を最大1回だけ評価する（同一 meta への重複評価なし）。
import { describe, expect, it, vi } from 'vitest';

const calls = { wantsKana: 0, wantsKanaOwnMeta: 0 };

vi.mock('../../src/core/kana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/kana')>();
  return {
    ...actual,
    wantsKana: (m: Parameters<typeof actual.wantsKana>[0]) => {
      calls.wantsKana += 1;
      return actual.wantsKana(m);
    },
    wantsKanaOwnMeta: (m: Parameters<typeof actual.wantsKanaOwnMeta>[0]) => {
      calls.wantsKanaOwnMeta += 1;
      return actual.wantsKanaOwnMeta(m);
    },
  };
});

import { classifyAll } from '../../src/core/analyze';
import { classifyField } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';

describe('PBI-84 kana memoize', () => {
  it('classifyField evaluates wantsKana at most once per field', () => {
    calls.wantsKana = 0;
    // Kana word in label AND nearby, but a kanji placeholder beats both:
    // pre-memoize this reached wantsKana once per text source (2 calls).
    const r = classifyField(
      makeMeta({ label: 'フリガナ', placeholder: '山田', nearby: 'フリガナ' }),
    );
    expect(r).toBeNull();
    expect(calls.wantsKana).toBe(1);
  });

  it('mixed kana/kanji form keeps identical categories and kanaKinds', async () => {
    const items = await classifyAll(
      [
        makeMeta({ id: 'k1', label: 'フリガナ' }),
        makeMeta({ id: 'n1', label: '氏名', placeholder: '山田 太郎' }),
        makeMeta({ id: 'k2', placeholder: 'ヤマダ' }),
        makeMeta({
          id: 's1', name: 'sei', label: '姓', nearby: 'お名前（フリガナ）',
        }),
        makeMeta({
          id: 's2', name: 'kana_sei', label: 'セイ', nearby: 'お名前（フリガナ）',
        }),
      ],
      null,
    );
    expect(items.map((i) => [i.meta.id, i.cls.category, i.cls.kanaKind ?? null])).toEqual([
      ['k1', 'fullNameKana', 'katakana'],
      ['n1', 'fullName', null],
      ['k2', 'fullNameKana', 'katakana'],
      ['s1', 'lastName', null],
      ['s2', 'lastNameKana', 'katakana'],
    ]);
  });

  it('large mixed form classifies deterministically', async () => {
    const metas = Array.from({ length: 200 }, (_, n) =>
      makeMeta({
        id: `f${n}`,
        label: n % 2 === 0 ? 'フリガナ' : '氏名',
        placeholder: n % 2 === 0 ? 'ヤマダ' : '山田 太郎',
        // Distinct headings so same-label oversize protection never triggers.
        nearby: `見出し${n}`,
      }),
    );
    const once = await classifyAll(metas, null);
    const twice = await classifyAll(metas, null);
    expect(once.map((i) => i.cls.category)).toEqual(
      twice.map((i) => i.cls.category),
    );
    expect(once).toHaveLength(200);
  });
});
