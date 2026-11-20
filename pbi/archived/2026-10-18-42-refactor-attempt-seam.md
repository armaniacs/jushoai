# PBI: 分類1回分のattempt seamを一本化する

## 背景

分類1回分の概念が `FieldClassifier.classify`（`src/core/classifier.ts:12-14`）・`CappedClassifier.attempt`（`src/llm/background-gateway.ts:85`）・`TracedClassifier.attempt`（`src/ai/audited-classifier.ts:29-31`）の3形状に分散し、`src/entrypoints/content.ts:164-171` の `reportingClassifier` が `attempt` を `classify` に再包装して `failureReason` を `run` 閉包に逃がしている。seam（classifyのみ）では打ち切り・失敗理由がテスト不能。

## ユーザーストーリー

開発者として、cap・chunk・trace・失敗理由を1つのattemptモジュールに集約し、呼び出し側の迂回包装をなくしたい、なぜなら3形状の分散と閉包逃がしのままでは打ち切り・失敗理由がseam経由でテストできず、呼び出し側の組み合わせに欠陥が現れるため。

## 優先度

- 順位: 2位 / 7件
- RICEスコア: 240（Reach=30 / Impact=2 / Confidence=80% / Effort=0.20人月）
- 根拠: 分類1回分のseamを `{map, failureReason}` に拡張し、cap・chunk・trace・失敗理由を1箇所に集約して呼び出し側の迂回包装をなくす。依存なし（PBI-46とは同messages.tsのため実装は直列42→46）。
- 対象: src/core/classifier.ts、src/llm/background-gateway.ts、src/ai/audited-classifier.ts、src/llm/provider-registry.ts、src/entrypoints/content.ts:164-171

## BDD受け入れシナリオ

```gherkin
Scenario: 分類1回分の結果と失敗理由がseam経由で返る
  Given attemptに一本化された分類seamがある
  When 打ち切り・失敗を伴う分類1回分を実行する
  Then `{map, failureReason}` がseamの戻り値として返り、run閉包への逃がしなしで呼び出し側が受け取れる

Scenario: 全アダプタが一本化seamの背後に収まる
  Given cap・chunk・traceを持つ各アダプタがある
  When 一本化されたattemptモジュール経由で分類する
  Then Background・PromptApi・Http系の全アダプタが同一seamの背後で動作し、既存の振る舞いに差分がない
```

## 受け入れ基準

- [x] 分類seamが `{map, failureReason}` を返すattempt形状に拡張されている
- [x] `CappedClassifier.attempt`・`TracedClassifier.attempt` の全アダプタが一本化seamの背後に収まっている
- [x] `src/entrypoints/content.ts:164-171` の `reportingClassifier` 迂回包装がなくなり閉包逃がしがない
- [x] 打ち切り・失敗理由がseam経由の単体テストで検証できる
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 打ち切り・失敗時に `{map, failureReason}` がseam戻り値で返ることを確認する
- 単体: 全アダプタが一本化seamの背後で同一形状を返すこと、迂回包装なしを確認する
- 回帰: 既存の分類・gateway・監査テスト一式を緑維持で確認する

## 見積もり

- 0.20人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
