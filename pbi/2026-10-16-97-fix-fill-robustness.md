# PBI: fill適用の頑健化（欄単位の例外隔離・外れradio検出・将来語彙の網羅性）

## ユーザーストーリー

フォーム利用者として、動的に書き換わるページでも適用が1欄の例外で全滅したり、外れた欄に成功扱いで書き込まれたりしてほしくない。なぜなら無音の全損・誤適用は原因追跡ができず、再試行のしようがないため。

## 優先度

- 順位: 4位 / 9件
- RICEスコア: 188（Reach=30 / Impact=1 / Confidence=50% / Effort=0.08人月）
- 根拠: 動的フォームでの無音全損・誤適用を防ぐ。PBI-94の前提語彙になるため94より先に実施（97→94）。
- 出典: adversarial-code-review 保守担当者指摘 `src/dom/fill-plan.ts:69-99`（欄単位try/catchなし・呼出元`content.ts:409`にもcatchなし）、`src/dom/fill-plan.ts:87-94`（外れradioのisConnected未確認でfilled返却）、`src/content-run.ts:19`（`metasById.get!`断定）、`src/dom/fill-plan.ts:53-57,64-66`（成功定義・順序契約の二重管理・未文書化）

## BDD受け入れシナリオ

```gherkin
Scenario: 1欄のgetter例外でも残りの欄は処理される
  Given 適用直前に例外を投げる欄を含むプランがある
  When fillPlanを実行する
  Then 例外欄は失敗outcomeになり残りは正常に処理される

Scenario: 差し替えられたradio optionには成功を返さない
  Given 計画後にDOM差し替えで外れたradio optionがある
  When fillPlanを実行する
  Then その欄は成功扱いにならない

Scenario: planとmap不整合でもプレビュー全体が死なない
  Given planにmap不在のfieldIdが混ざる
  When プレビュー行を組み立てる
  Then 全体例外にならず不整合欄が分かる形になる
```

## 受け入れ基準

- [x] fillPlanが欄単位で例外を隔離し全欄分のoutcomeを返す
- [x] 外れたradio optionへのfillで `filled` を返さない
- [x] `buildPreviewRows` の不整合で全体例外にならない
- [x] 成功の定義とoutcomes順序の契約がコードまたはテストで固定される
- [x] 既存 `tests/dom/fill-plan.test.ts` が全件緑

## テスト戦略

- E2E: 適用直前に差し替えるページ相当で適用結果を確認する
- 統合: 承認→適用の一連で例外混入時のoutcome完備を確認する
- 単体: 例外・外れ・不整合・順序の分岐を網羅する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
