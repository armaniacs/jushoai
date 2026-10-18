// PBI-44: text→category入口seamの段階別契約を一箇所で検証する。
// - seamの段階順序（norm→DISPATCH→sources→resolveKana→refine→englishPage）が
//   一箇所で読める。
// - seam経由の分類が束ね前（classifyAllのルール経路）と同一になる
//   （category・confidence・source・kanaKind）。
// - 正規化ビューが使い回され、同一rawの再normがない。
// 既存テストの期待値は変更しない（新規ファイルのみ）。
import { describe, expect, it } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import {
  TEXT_TO_CATEGORY_STAGES, classifyField, classifyRulePipeline,
} from '../../src/core/classify-rules';
import { kanaNormFromViews } from '../../src/core/kana';
import { buildFieldNormViews } from '../../src/core/literals';
import type { FieldMeta } from '../../src/core/types';
import { makeMeta } from '../helpers';

const snap = (metas: FieldMeta[], englishPage = false) =>
  classifyRulePipeline(metas, { englishPage }).map((i) => [
    i.meta.id, i.cls.category, i.cls.confidence, i.cls.source, i.cls.kanaKind ?? null,
  ]);

const snapAll = async (metas: FieldMeta[], englishPage = false) =>
  (await classifyAll(metas, null, { englishPage })).map((i) => [
    i.meta.id, i.cls.category, i.cls.confidence, i.cls.source, i.cls.kanaKind ?? null,
  ]);

const MIXED: FieldMeta[] = [
  makeMeta({ id: 'k1', label: 'フリガナ', placeholder: 'ﾔﾏﾀﾞ' }),
  makeMeta({ id: 'n1', label: '氏名', placeholder: '山田 太郎' }),
  makeMeta({ id: 'b1', label: '生年月日の月', nearby: '生年月日' }),
  makeMeta({ id: 'e1', label: 'ＥＭＡＩＬ' }),
  makeMeta({ id: 'z1', label: '郵便番号', placeholder: '１２３－４５６７' }),
  makeMeta({ id: 'a', autocomplete: 'name', label: 'フリガナ' }),
  makeMeta({ id: 'b', autocomplete: 'name', label: 'フリガナ' }),
  makeMeta({ id: 'u1', label: '備考' }),
];

describe('PBI-44 pipeline entry seam', () => {
  it('exposes the stage contract in one place, in call order', () => {
    expect(TEXT_TO_CATEGORY_STAGES.map((s) => s.name)).toEqual([
      'normalize', 'dispatch', 'sources', 'resolveKana', 'refine', 'englishPage',
    ]);
  });

  it('matches the pre-bundle rule path (classifyAll, rule-only)', async () => {
    expect(snap(MIXED)).toEqual(await snapAll(MIXED));
  });

  it('matches the pre-bundle rule path with the englishPage tail stage', async () => {
    const metas: FieldMeta[] = [
      makeMeta({ id: 'n1', label: '氏名' }),
      makeMeta({ id: 'z1', label: '郵便番号' }),
    ];
    expect(snap(metas, true)).toEqual(await snapAll(metas, true));
    // 後段が動いていること自体も固定（fullName→fullNameRomaji、zip→postalCode）。
    expect(snap(metas, true).map((r) => r[1])).toEqual(['fullNameRomaji', 'postalCode']);
  });

  it('keeps DISPATCH priority through the seam (month beats year)', () => {
    const metas = [makeMeta({ id: 'm', label: '年の月', nearby: '生年月日' })];
    expect(snap(metas)).toEqual([['m', 'birthMonth', 0.7, 'rule', null]]);
    expect(classifyField(metas[0]!)?.category).toBe('birthMonth');
  });

  it('reuses normalized views without re-normalizing the same raw string', () => {
    const meta = makeMeta({
      name: 'nx', htmlId: 'ix', label: 'ラベル', placeholder: 'ぷれ', nearby: '見出しX',
    });
    const views = buildFieldNormViews(meta);
    const kanaPre = kanaNormFromViews(views);
    // 派生ビューは同一文字列の使い回し（KanaNorm契約）。
    expect(kanaPre.placeholder).toBe(views.placeholder);
    expect(kanaPre.nameIdLabel).toBe(views.nameIdLabel);
    expect(kanaPre.nearby).toBe(views.legendText);
    // 派生にnormは含まれない（NFKC呼び出しゼロ）。
    const orig = String.prototype.normalize;
    let calls = 0;
    String.prototype.normalize = function (this: string, form?: string): string {
      if (form === 'NFKC') calls += 1;
      return orig.call(this, form);
    };
    try {
      kanaNormFromViews(buildFieldNormViews(meta));
    } finally {
      String.prototype.normalize = orig;
    }
    // buildの6源泉のみ。派生は0回。
    expect(calls).toBe(6);
  });
});
