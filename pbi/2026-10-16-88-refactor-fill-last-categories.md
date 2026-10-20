# PBI: zip系を最後に注入する順序知識を core 側定数に一本化する

## ユーザーストーリー

開発者として、「zip系フィールドを最後に注入する」という順序知識を core 側の定数（例: `FILL_LAST_CATEGORIES`）に一本化し、`src/dom/fill-plan.ts` は参照するだけにしたい。現状は planner と fill-plan の暗黙契約で、両方を更新しないと新カテゴリ追加・改名時に更新漏れが起きるが検出手段がないため。

- 前提（事実確認）: `plans/2026-10-15-2247-review-1014z.md` の Low 指摘「fill-plan.ts の LAST_CATEGORIES 語彙二重管理」（System Architect 指摘）
- 現状: `src/dom/fill-plan.ts:6` に `const LAST_CATEGORIES = new Set(['zip', 'zip1', 'zip2'])` がローカル定義され、郵便番号由来の非同期住所補完による上書き回避のコメント付きで注入順序を決めている（`fillPlan` 内で後回しソート）

## 優先度

- 順位: 7位 / 12件
- RICE スコア: 63（Reach=5 / Impact=0.25 / Confidence=100% / Effort=0.02人月）
- 根拠: 小粒だが確実。依存なし。振る舞い不変のリファクタ

## BDD受け入れシナリオ

### シナリオ1: 注入順序が変わらない

- Given 郵便番号（zip系）とそれ以外の ok ステータス項目を含むプランがある
- When `fillPlan` を実行する
- Then zip系カテゴリが最後に注入され、既存の順序（非zip系→zip系の安定順）が維持される

### シナリオ2: 単一の信頼できる定義を参照する

- Given core 側に公開定数（例: `FILL_LAST_CATEGORIES`）が定義されている
- When 開発者が「最後に注入するカテゴリ」の定義箇所を探す
- Then core の定数が唯一の定義であり、`src/dom/fill-plan.ts` はローカルの語彙コピーを持たず参照（import）するだけになっている

### シナリオ3: 新カテゴリ追加時の更新漏れが起きない

- Given 将来「最後に注入すべき」新カテゴリ（例: zip系の派生）が追加される
- When 開発者が core の定数だけを更新する
- Then `fillPlan` の注入順序にも自動で反映され、二重更新が不要になる

## 受け入れ基準

- [x] core 側（planner 近傍の適切なモジュール）に `FILL_LAST_CATEGORIES`（名称は同等でも可）が公開定数として定義されている
- [x] `src/dom/fill-plan.ts` のローカル `LAST_CATEGORIES` 定義が削除され、core の定数を参照している
- [x] 注入順序の振る舞いが不変である（非zip系→zip系の順序、各グループ内の安定順を維持）
- [x] `core/` の純粋性（DOM・LLM非依存）が維持されている
- [x] 既存 `tests/dom/fill-plan.test.ts` が全件緑である

## テスト戦略

- 既存テスト: `tests/dom/fill-plan.test.ts` を回帰ゲートとし、全件緑を維持する（振る舞い不変の証拠）
- 追加テスト（軽量）: core 定数の内容（zip / zip1 / zip2 を含む）と、`fillPlan` がその定数に従って後回しソートすることを確認するテストを検討する。ただし過剰な実装はせず、最小限のロックに留める
- Outside-In TDD に従い、必要なら先にテストを追加してからリファクタする

## 見積もり

- Effort: 0.02人月（小粒リファクタ）
- 依存: なし

## Definition of Done

- [x] core 側定数に一本化され、fill-plan の二重管理が解消されている
- [x] `make typecheck` が緑
- [x] `npx vitest run tests/dom/fill-plan.test.ts` が緑
- [x] 振る舞い変更がないこと（注入順序不変）がテストで確認されている
- [x] レビュー指摘（LAST_CATEGORIES 語彙二重管理）が解消済みとしてクローズできる
