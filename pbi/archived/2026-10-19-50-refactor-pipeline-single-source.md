# PBI: ルールパイプラインの二重化を解消する

## 背景

`src/core/classify-rules.ts:511` の `classifyRulePipeline` は `classifyAll`（`src/core/analyze.ts`）のルール経路と同順序・同意味論の参照実装だが、実プロダクションパスからは呼ばれていない（利用は `tests/core/pipeline-entry.test.ts` のみ）。順序の正準が2箇所にある状態で、将来どちらかだけ変えたときにドリフトし、ルール優先の意味論がずれる。

## ユーザーストーリー

開発者として、ルール経路の正準を1箇所にしたい、なぜなら参照実装と本番経路の二重化は将来のドリフト（順序・意味論ずれ）を招くため。

## 優先度

- 順位: 3位 / 7件
- RICEスコア: 48（Reach=6 / Impact=2 / Confidence=80% / Effort=0.2人月）
- 根拠: ドリフトは misfill 直結のリスク。`analyze.ts` から使うか参照実装と明示するかの二択で、どちらも小〜中規模。

## BDD受け入れシナリオ

```gherkin
Scenario: ルール経路の正準が1箇所になる
  Given ルール限定の分類が必要な呼び出しがある
  When 分類を実行する
  Then classifyAll のルール経路と classifyRulePipeline の結果が常に一致する（片方が片方を使うか、参照実装と明示される）

Scenario: force／しきい値の扱いがずれない
  Given confident 欄と非 confident 欄が混ざった入力がある
  When classifier なしで両経路を実行する
  Then 両者の Item 列（category・source・順序）が一致する
```

## 受け入れ基準

- [x] `analyze.ts` のルール経路が `classifyRulePipeline` を経由する、または `classifyRulePipeline` に「テスト・文書用の参照実装（正準は classifyAll）」旨が明示される（どちらかを選んで実施）
- [x] `force`／`ACCEPT_THRESHOLD`／`englishPage` の扱いが両経路で一致する（差があればテストで固定）
- [x] `tests/integration/samples.test.ts` を含む既存テストが緑維持

## テスト戦略

- 単体: 両経路の等価性テスト（confident／非confident混在＋englishPage両値）
- 回帰: samples 統合テスト一式を緑維持で確認する

## 見積もり

- 0.2人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
