# PBI: 失敗文言の単一対応表は薄いまま保つ

## 背景

`src/ai/failure-text.ts` は depth ≒ 表自体という典型 shallow だが、`hintForButton`（content.ts のボタン hint 用）／`noticeForTest`（ai-section.ts の接続テスト notice 用）の Two adapters が実在するため hypothetical ではなく real な seam で、earning its keep（薄い）。将来レビューで統合・解消を再提案しないための判断記録とする。

## ユーザーストーリー

開発者として、失敗文言表を現状維持と宣言し、将来の統廃合提案を構造的に退けられるようにしたい。

## 優先度

- 順位: 7位 / 7件
- 対応不要（実装作業なし）
- 出典: architecture-review 2026-10-18

## 維持条件

1. 全キー存在テストの緑維持 — `tests/ai/failure-text.test.ts` の全キー存在アサート（共有7キー＋classify-only の truncated）が緑を維持すること
2. 用途別ラッパー経由の参照維持 — 両画面が `hintForButton`／`noticeForTest` 経由で同一対応表を参照し、直接 `AI_FAILURE_TEXT` への分散参照を増やさないこと

## 受け入れ基準

- [x] 実装変更を含まないこと（本PBIでは `src/ai/failure-text.ts`・テストに手を加えない。git statusで無変更を確認）
- [x] 全キー存在テストが緑であること（4件パスを確認）
- [x] 両画面が用途別ラッパー経由で同一対応表を参照していること（直接表参照ゼロをgrepで確認）

## テスト戦略

- 既存 `tests/ai/failure-text.test.ts` の緑確認のみで担保する
- 新規テストの追加は行わない（全キー存在アサートがキー漏れを検出する）

## 見積もり

- 0人月

## Definition of Done

- [x] 全キー存在テストがパスする
- [x] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認）
