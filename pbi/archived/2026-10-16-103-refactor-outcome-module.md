# PBI: 充填結果の知識をOutcome Moduleに集約する

## ユーザーストーリー

開発者として、警告条件・除外定義・文言合成を1箇所で変えたい。現状はPlanStatus(fill-plan外)・FillResult・BY_DESIGN・banner合成が4ファイルに分散し、3 PBI連続で同時編集が発生しているため。

## 優先度

- 順位: 1位 / 8件
- RICEスコア: 667（Reach=100 / Impact=1 / Confidence=80% / Effort=0.12人月）
- 根拠: 現在進行形の摩擦で最高スコア。PBI-107の前提。
- 出典: architecture-review 候補2(Strong)

## BDD受け入れシナリオ

```gherkin
Scenario: 警告要否が一呼びで決まる
  Given 任意のoutcome集合がある
  When Outcome Moduleに問う
  Then 警告要否と文言が返り、呼出側に条件式が残らない

Scenario: 順序に依存しない内訳
  Given fill順とplan順が異なるoutcome列がある
  When 内訳を参照する
  Then fieldId対応で取得でき、index対応の誤りが起きない
```

## 受け入れ基準

- [x] PlanStatus→FillResult→文言の対応表が1 Moduleにある
- [x] `shouldWarn()`相当の一呼びで警告判定ができる
- [x] outcomesがfieldId対応(Map)で返り順序非依存になる
- [x] BY_DESIGN除外の定義が対応表に吸収される
- [x] 既存テストが緑維持（期待値の意味変更は更新する）

## テスト戦略

- E2E: 実ブラウザ相当で警告の有無を確認する
- 統合: 承認→適用→表示の一連を確認する
- 単体: 対応表・警告判定・Map対応の分岐を網羅する

## 見積もり

- 0.12人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
