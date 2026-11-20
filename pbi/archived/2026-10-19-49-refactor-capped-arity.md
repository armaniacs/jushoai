# PBI: CappedClassifier.attemptの引数を基底と揃える

## 背景

`src/core/classifier.ts` で基底 `FieldClassifier.attempt(fields, schedule?)` に対し、`CappedClassifier.attempt(fields)` が引数1つの宣言に狭まっている。`BackgroundClassifier` の実装自体は `(fields, _schedule?, opts?)` の3引数を受けられるが、`CappedClassifier` 型で見ると schedule を渡す側が型エラーになる（Liskov 違反）。現状の呼び出し（`classifyWithReason` は `FieldClassifier` 型で schedule を渡す）は動くが、型の見た目と実装がずれている。

## ユーザーストーリー

開発者として、`CappedClassifier.attempt` のシグネチャを基底と揃えたい、なぜなら現状は型の見た目が実装より狭く、Capped 型で schedule を渡すと型エラーになるため。

## 優先度

- 順位: 2位 / 7件
- RICEスコア: 50（Reach=5 / Impact=1 / Confidence=80% / Effort=0.08人月）
- 根拠: 型の嘘を直す小規模修正。48と同ファイルのため直列（48→49）。振る舞い不変。

## BDD受け入れシナリオ

```gherkin
Scenario: Capped型でもschedule付きでattemptできる
  Given CappedClassifier 型の値がある
  When schedule 付きで attempt を呼ぶ
  Then 型エラーにならず、gateway は従来どおり自前の chunk 導出で動く

Scenario: 振る舞いが変わらない
  Given 修正前後の BackgroundClassifier がある
  When 同一入力で attempt／classify を呼ぶ
  Then 返る map・failureReason・truncatedCount が一致する
```

## 受け入れ基準

- [x] `CappedClassifier.attempt` の宣言が `(fields, schedule?: ClassifySchedule)` 以上を受け付ける（`opts?: { signal?: AbortSignal }` の有無も方針決定して統一する）
- [x] `BackgroundClassifier` の `_schedule` 未使用の理由コメントが残るか、不要になれば消える
- [x] 振る舞い不変の回帰テスト（既存 gateway テスト）が緑維持

## テスト戦略

- 単体: schedule 付き attempt の型受け入れ（typecheck）と、単一チャンクで audit の scheduling 欄に出ないことの既存テスト維持
- 回帰: `tests/llm/background-gateway.test.ts` 一式を緑維持で確認する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
