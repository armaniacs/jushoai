# PBI-86: Item型を core/types.ts へ移動し type-level 循環を解消する

## ユーザーストーリー

開発者として、Item 型（meta＋cls のペア）を `core/types.ts`（または `classifier.ts` 近傍の型集約箇所）に一元化したい。`kana.ts` を単独で読んだとき・単独でテストするときに `classify-rules.ts` の残留定義を辿らなくて済むようにし、将来 `kana` 側が値 import を足した瞬間に実行時循環へ転化する構造的負債をなくしたい。

## 背景・事実

- `plans/2026-10-15-2247-review-1014z.md` Low 指摘（System Architect／Maintainability）: `kana.ts ↔ classify-rules.ts` の type-level 相互 import（実行時無害・スコア影響なし・Phase 5 対象外）。
- `src/core/classify-rules.ts:15-18` で `export interface Item { meta: FieldMeta; cls: Classification; }` を定義。
- `src/core/classify-rules.ts:5` は `import { KANA, wantsKana } from './kana'` で値を import（kana → classify-rules 方向の値依存）。
- `src/core/kana.ts:4` は `import type { Item } from './classify-rules'` で型のみ import（逆方向の型依存）。
- 現状は `import type` のため実行時は無害だが、値依存と型依存の双方向に見える構造であり、`kana` 側が将来ひとつでも値 import を足すと実行時循環になる。
- 実参照箇所の確認（2026-10-16 時点）: `Item` は定義元の `classify-rules.ts`（`refineClassifications(items: Item[]): Item[]`）のほか、`kana.ts`（`resolveKana`）、`analyze.ts`、`planner.ts`（`buildPlan`）、`page-language.ts`（`applyEnglishPage`）から参照されている。移動時はこれら全参照元の import パス更新が必要。

## 優先度

- 順位: 5位／12件
- RICE: 83（Reach=5／Impact=0.5／Confidence=100%／Effort=0.03人月）
- 根拠: 将来の循環事故を構造的に防ぐ。振る舞い変更なし・依存なしの type-only 移動。

## BDD受け入れシナリオ（2つ以上）

### シナリオ1: Item の参照元が types.ts に一本化される

- Given `Item` 型が `core/types.ts`（または `classifier.ts` 近傍の合意された型集約箇所）で定義されている
- When 開発者が `classify-rules.ts`／`kana.ts`／`analyze.ts`／`planner.ts`／`page-language.ts` を開く
- Then いずれのファイルからも `Item` は集約箇所からの `import type` で参照され、`classify-rules.ts` は `Item` を定義しておらず、`kana.ts` は `classify-rules.ts` を import していない

### シナリオ2: kana モジュールが classify-rules なしで単独理解・単独テストできる

- Given 移動後のコードベース
- When 開発者が `kana.ts` の import 文だけを読む
- Then `classify-rules` への依存（値・型いずれも）が存在せず、`resolveKana` の入出力型が `core/types.ts` 由来であることが一目で分かる

### シナリオ3: 振る舞い不変（typecheck＋既存テスト緑）

- Given 移動前後で `Item` の形状（`{ meta: FieldMeta; cls: Classification }`）が同一である
- When `make typecheck` と既存の core テストスイートを実行する
- Then エラー・失敗がゼロで、新規の振る舞い変更テストは不要である

## 受け入れ基準

1. `Item` の定義が `core/types.ts`（または合意された型集約箇所の1箇所）に存在し、`classify-rules.ts` に `Item` 定義が残っていないこと。
2. `kana.ts` が `classify-rules.ts` を一切 import していないこと（`import type` も含めてゼロ）。
3. `classify-rules.ts`・`kana.ts`・`analyze.ts`・`planner.ts`・`page-language.ts` の `Item` 参照が集約箇所からの `import type` に更新されていること。
4. `make typecheck` が緑であること。
5. 既存テスト全緑であり、振る舞い変更（分類結果・カナ解決・プラン生成の差分）がないこと。

## テスト戦略

- 新規テストは追加しない（type-only 移動のため）。
- `make typecheck`（`tsc --noEmit`）を必須ゲートとする。
- 既存テスト（少なくとも `tests/core/` の classify／kana／analyze／planner 系）を実行し、全緑を確認する。
- Outside-In TDD の観点では本件はリファクタ（Red 不要）であり、BDD シナリオ1・2はコードレビュー（import 文の目視＋grep で `from './classify-rules'` 残留ゼロ確認）で検証する。

## 見積もり

- Effort: 0.03人月（import パス更新＋typecheck のみ）。
- リスク: なし（`import type` の移動のみ。実行時バンドルへの影響なし）。

## Definition of Done

- [x] `Item` が型集約箇所に移動し、`classify-rules.ts` の残留定義が削除されている
- [x] 全参照元（classify-rules／kana／analyze／planner／page-language）の import パスが更新されている
- [x] `kana.ts` → `classify-rules.ts` の import がゼロ（`grep "classify-rules" src/core/kana.ts` がヒットなし）
- [x] `make typecheck` 緑
- [x] 既存テスト緑・振る舞い差分なし
- [x] 本PBIファイル以外の余計な変更がない
