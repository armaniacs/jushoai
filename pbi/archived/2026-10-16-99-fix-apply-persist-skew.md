# PBI: 適用と選択保存の不整合是正（保存先行・常時applied:trueの見直し）

## ユーザーストーリー

フォーム利用者として、部分適用や失敗があったのに「最終利用」だけが保存されて次回も同じ失敗を繰り返す状態をなくしたい。なぜなら保存済み選択と実際の適用状態が食い違うと再試行のしようがないため。

## 優先度

- 順位: 6位 / 9件
- RICEスコア: 63（Reach=20 / Impact=0.5 / Confidence=50% / Effort=0.08人月）
- 根拠: 再試行可能性の土台。依存なし（PBI-97のoutcome完備があると判定が正確になるため97の後が望ましい）。
- 出典: adversarial-code-review 保守担当者指摘 `src/content-session.ts:117-137`（persist→injectの順序・`SessionEnv.injectPlan` がvoidで `apply` が常に `applied:true`）、`src/entrypoints/content.ts:353-363`（部分適用バナーのAI失敗ヒント上書き・永続記録がconsole.debugのみ）

## BDD受け入れシナリオ

```gherkin
Scenario: 部分適用時は保存と表示が食い違わない
  Given 一部欄が適用できないプランがある
  When 適用を実行する
  Then 保存内容と適用実態の不一致が残らない（再試行可能な形を含む）

Scenario: AI失敗ヒントが適用バナーで消えない
  Given AI失敗ヒント表示と部分適用が重なる
  When 適用が実行される
  Then どちらの情報も利用者に残る
```

## 受け入れ基準

- [x] 適用結果（outcomes）が `apply` の戻りに反映される
- [x] 失敗時の選択保存の扱いが定義される（保存しない／区別して保存する等）
- [x] AI失敗ヒントと適用バナーの競合が解消される
- [x] 不具合報告時に残る記録がconsole.debug以外に定義される

## テスト戦略

- E2E: 実ブラウザ相当で部分適用時の保存・表示を確認する
- 統合: apply→保存→表示の一連を確認する
- 単体: 結果分岐（全適用・部分・失敗）の保存条件を網羅する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
