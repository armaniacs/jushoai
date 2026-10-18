# PBI: AI失敗文言を単一対応表に集約する

## ユーザーストーリー

開発者として、AI失敗文言の対応表がcontent.tsとai-section.tsに二重所有されるドリフトをなくしたい、同一失敗の表示が画面で食い違うため。

## 優先度

- 順位: 19位 / 20件
- RICEスコア: 133（Reach=10 / Impact=1 / Confidence=80% / Effort=0.06人月）
- 根拠: 後続C4（backlog）の前提。二重所有のドリフト解消で同一失敗の表示食い違いを防ぐ。
- 出典: checking-team Maintainability Medium、src/entrypoints/content.ts:287、src/entrypoints/options/ai-section.ts:31

## BDD受け入れシナリオ

```gherkin
Scenario: 1箇所編集で両画面に反映される
  Given AI失敗文言の単一対応表が存在している
  When 対応表の1箇所の文言を編集する
  Then content側と設定ページ側の両画面に同じ文言が反映される

Scenario: 新規reason追加時はテストで保護される
  Given 単一対応表に存在しない新規reasonを追加しようとしている
  When 対応表にキーを追加せずテストを実行する
  Then 全キー存在アサートのテストが失敗して不足キーを検出する
```

## 受け入れ基準

- [x] AI失敗文言が単一対応表（単一モジュール）に集約されている
- [x] content.tsとai-section.tsが同一対応表を参照している
- [x] 全キー存在アサート（全ClassifyFailure/TestFailureキーを網羅）が追加されている
- [x] 同一失敗の表示が両画面で一致している
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 単一対応表の全キー存在アサートでキー漏れを検出する
- 統合: content側と設定ページ側が同一対応表を参照することを確認する
- E2E: 対象外（文言集約のリファクタのため単体・統合で担保する）

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認）
