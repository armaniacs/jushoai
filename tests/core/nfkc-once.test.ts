// PBI-07: NFKC正規化の入口集約（リファクタ前後で分類不変・重複排除）。
// - 分類不変: 半角・結合濁点・全角英数の境界値で classifyField の結果を固定し、
//   classifyAll でのカテゴリ・信頼度・kanaKind の前後一致を確認する。
// - 重複排除: 同一 raw 文字列の normalize('NFKC') は1欄1回だけであること。
//   旧実装では nearby が最大3回（legendText・classifyText・wantsKana）
//   正規化されていた。pattern 属性は別ソースのため hasKanaPattern 内の1回のみ。
import { describe, expect, it } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import { classifyField } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';
import type { FieldMeta } from '../../src/core/types';

const cat = (p: Partial<FieldMeta>) => classifyField(makeMeta(p))?.category ?? null;
const conf = (p: Partial<FieldMeta>) => classifyField(makeMeta(p))?.confidence ?? null;

describe('PBI-07 NFKC once: classification unchanged', () => {
  it('pins boundary classifications (half-width / decomposed / full-width)', () => {
    // リファクタ前の実測値を固定（kana-blind の素名・信頼度）。
    expect(cat({ label: 'フリガナ', placeholder: 'ﾔﾏﾀﾞ ﾀﾛｳ' })).toBe('fullName');
    expect(conf({ label: 'フリガナ', placeholder: 'ﾔﾏﾀﾞ ﾀﾛｳ' })).toBe(0.7);
    expect(cat({ label: 'ﾌﾘｶﾞﾅ' })).toBe('fullName');
    // 結合濁点（か+U+3099）は合成後の範囲で判定される。
    expect(cat({ placeholder: 'か\u3099な' })).toBe('fullName');
    expect(cat({ placeholder: 'カ\u3099ナ' })).toBe('fullName');
    // 全角英数は NFKC 後に判定される。
    expect(cat({ label: 'ＥＭＡＩＬ' })).toBe('email');
    expect(cat({ label: 'ＴＥＬ' })).toBe('tel');
    // 全角ローマ字の値は名前判定に使われない（NAME_EXCLUDE相当の扱い維持）。
    expect(cat({ label: '山田', placeholder: 'ＹＡＭＡＤＡ' })).toBeNull();
    // 半角カタカナの pattern は raw 参照のため素名分類には寄与しない。
    expect(cat({ pattern: '[ｱ-ﾝ]+' })).toBeNull();
    // \uXXXX エスケープの pattern も素名分類には寄与しない。
    expect(cat({ pattern: '^[\\u3041-\\u3093]+$' })).toBeNull();
    // 漢字プレースホルダはカナ語彙の label を打ち消す。
    expect(cat({ label: 'フリガナ', placeholder: '山田' })).toBeNull();
    expect(cat({ label: 'セイ', placeholder: 'ｾｲ' })).toBe('lastName');
    expect(cat({ label: '氏名', nearby: 'ふりがな' })).toBe('fullName');
    expect(cat({ label: '郵便番号', placeholder: '１２３－４５６７' })).toBe('zip');
    expect(cat({ label: 'Name', placeholder: '半角英数' })).toBe('fullNameRomaji');
  });

  it('keeps classifyAll categories, confidences and kanaKinds', async () => {
    const items = await classifyAll(
      [
        makeMeta({ id: 'k1', label: 'フリガナ', placeholder: 'ﾔﾏﾀﾞ' }),
        makeMeta({ id: 'n1', label: '氏名', placeholder: '山田 太郎' }),
        makeMeta({ id: 'd1', placeholder: 'か\u3099な' }),
        makeMeta({ id: 'e1', label: 'ＥＭＡＩＬ' }),
        makeMeta({ id: 'z1', label: '郵便番号', placeholder: '１２３－４５６７' }),
      ],
      null,
    );
    expect(items.map((i) => [i.meta.id, i.cls.category, i.cls.confidence, i.cls.kanaKind ?? null])).toEqual([
      ['k1', 'fullNameKana', 0.7, 'halfKatakana'],
      ['n1', 'fullName', 0.7, null],
      ['d1', 'fullNameKana', 0.7, 'hiragana'],
      ['e1', 'email', 0.7, null],
      ['z1', 'zip', 0.7, null],
    ]);
  });
});

describe('PBI-07 NFKC once: no duplicate normalization', () => {
  function countNfkc(meta: FieldMeta): { calls: number; byRaw: Map<string, number> } {
    const orig = String.prototype.normalize;
    const byRaw = new Map<string, number>();
    let calls = 0;
    String.prototype.normalize = function (this: string, form?: string): string {
      if (form === 'NFKC') {
        calls += 1;
        byRaw.set(String(this), (byRaw.get(String(this)) ?? 0) + 1);
      }
      return orig.call(this, form);
    };
    try {
      classifyField(meta);
    } finally {
      String.prototype.normalize = orig;
    }
    return { calls, byRaw };
  }

  it('normalizes each distinct source exactly once (kana gate hit)', () => {
    const { calls, byRaw } = countNfkc(
      makeMeta({ name: 'nx', htmlId: 'ix', label: 'ラベル', placeholder: 'ぷれ', nearby: '見出しX' }),
    );
    // own・legend・name/id・label/placeholder・placeholder・name/id/label の6源泉。
    expect(calls).toBe(6);
    for (const [raw, n] of byRaw) {
      expect(n, `raw ${JSON.stringify(raw)} normalized ${n} times`).toBe(1);
    }
    // 旧実装で3回 norm されていた nearby が legendText に一本化されている。
    expect(byRaw.get('見出しX')).toBe(1);
  });

  it('adds only the pattern norm when wantsKana reaches hasKanaPattern', () => {
    const { calls, byRaw } = countNfkc(
      makeMeta({
        name: 'nx', htmlId: 'ix', label: 'メモ', placeholder: '123', nearby: 'qb',
        pattern: '^[\\u3041-\\u3093]+$',
      }),
    );
    // 6源泉＋pattern復号後の1回。placeholder の123は漢字・カナのいずれでもなく
    // 語彙・legend を素通りして pattern 判定に到達する。
    expect(calls).toBe(7);
    expect(byRaw.get('qb')).toBe(1);
    expect(cat({ name: 'nx', htmlId: 'ix', label: 'メモ', placeholder: '123', nearby: 'qb', pattern: '^[\\u3041-\\u3093]+$' })).toBe('fullName');
  });

  it('classifies a large form deterministically (perf smoke)', () => {
    const metas = Array.from({ length: 2000 }, (_, n) =>
      makeMeta({ id: `f${n}`, label: n % 2 ? 'フリガナ' : '氏名', placeholder: n % 2 ? 'ﾔﾏﾀﾞ' : '山田', nearby: '見出し' }),
    );
    const t0 = performance.now();
    const cats = metas.map((m) => classifyField(m)?.category ?? null);
    const ms = performance.now() - t0;
    // 計測メモ用に出力する（厳密な閾値 assert は環境差のため置かない）。
    // eslint-disable-next-line no-console
    console.log(`PBI-07 2000 fields: ${ms.toFixed(1)}ms`);
    expect(cats).toHaveLength(2000);
    expect(cats[1]).toBe('fullName');
    expect(cats[0]).toBe('fullName');
  });
});
