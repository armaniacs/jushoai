# PBI: seam.classifyの非throw契約を明文化する

## 背景

`src/content-session.ts` の `classifyWithReason`（44-72）が作る seam の `classify` は、内側の `classifier.attempt` が返した `outcome.map` をそのまま返し、`outcome.error` を再 throw しない。一方 `FieldClassifier.classify` の契約は throwing（`AuditedClassifier.classify` は `outcome.error !== undefined` で throw：`src/ai/audited-classifier.ts:90-94`）であり、seam は意図的に divergence している。現状は従来の reporting wrapper と同挙動で回帰ではないが、契約としてどこにも書かれていないため、将来 seam を本物と交換したときに partial map の扱いが黙って変わる。

## ユーザーストーリー

開発者として、seam.classify が partial map を返して throw しない契約を明文化したい、なぜなら現状は `FieldClassifier.classify` の throwing 契約と divergence したまま暗黙であり、将来の交換時に失敗時の map 扱いが変わるため。

## 優先度

- 順位: 1位 / 7件
- RICEスコア: 128（Reach=8 / Impact=1 / Confidence=80% / Effort=0.05人月）
- 根拠: 全 classifier／seam 改修の前提契約を固定する。 cheapest で全後続の土台。`src/core/classifier.ts` に触るため 49 と同ファイルで直列（48→49）。

## BDD受け入れシナリオ

```gherkin
Scenario: attempt失敗のpartial mapが捨てられずに届く
  Given attempt が { map: 部分結果, failureReason, error } を返す classifier がある
  When seam.classify 経由で分類する
  Then throw せず部分 map が返り、failureReason が戻り値に載る

Scenario: throwing契約との違いが文書で分かる
  Given FieldClassifier の doc を読む開発者がいる
  When classify と attempt-seam 経由の失敗扱いを比べる
  Then seam.classify は throw せず partial map を返す旨がコメントで明示されている
```

## 受け入れ基準

- [x] `classifyWithReason` の seam.classify に「throw せず partial map を返す（失敗は `classifyAll` の fail-safe に委譲）」旨の契約コメントがある
- [x] `FieldClassifier` の doc に seam 経由と直接呼び出しの失敗扱いの違いが1行以上で書かれている
- [x] attempt が error 付き partial を返したときに seam.classify が throw せず map を返す単体テストがある（既存の「attempt が throw する」テストとは別ケース）
- [x] 既存テストが緑維持

## テスト戦略

- 単体: error 付き partial を返す stub に対し `classifyWithReason` が throw せず map＋reason を返すことを確認する
- 回帰: `tests/content-session.test.ts`・`tests/core/analyze.test.ts` 一式を緑維持で確認する

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
