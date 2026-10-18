# PBI: content.tsの3役をconsent-check/exclusion-gateに抽出する

## ユーザーストーリー

開発者として、同意検証・除外ゲート・orchestrationが同居するゴッドモジュール（全554行・リポジトリ最大）への変更集中をなくしたい、なぜなら同意検証（verifyApplyConsent系）・除外ゲート（createExclusionGate系）・run/sync本体の3役が1ファイルに同居し、変更のたびに無関係な箇所まで読み直す必要があるから。

## 優先度

- 順位: 31位 / 40件
- RICEスコア: 25（Reach=5 / Impact=2 / Confidence=50% / Effort=0.20人月）
- 根拠: 保守性の分割リファクタ。PBI-19前提は1018aで完了済みのため依存なし。
- 出典: checking-team Maintainability Medium
- 対象: src/entrypoints/content.ts（verifyApplyConsent、applyIfConsented、createExclusionGate、run/sync本体）

## BDD受け入れシナリオ

```gherkin
Scenario: 純粋部をconsent-checkとexclusion-gateに抽出する
  Given 同意検証と除外ゲートがcontent.tsに同居している
  When verifyApplyConsent・applyIfConsented系をconsent-checkに、createExclusionGate系をexclusion-gateに移すとき
  Then content.tsにはrun/sync本体のorchestrationだけが残り、3役の境界がimportで分かる

Scenario: DOM非依存が維持され既存テストはimport変更のみで通る
  Given 抽出後の純粋モジュールがある
  When 既存テスト（consent-check・content-exclusions・content-apply-gate）を実行するとき
  Then DOM非依存が維持され、テスト側の変更はimport先の変更のみで振る舞いの変更は不要である
```

## 受け入れ基準

- [x] `verifyApplyConsent`・`applyIfConsented`系が新規consent-checkモジュールに移りcontent.tsから消えること
- [x] `createExclusionGate`系が新規exclusion-gateモジュールに移りcontent.tsから消えること
- [x] content.tsにはrun/sync本体のorchestrationだけが残ること
- [x] 抽出モジュールがDOM非依存（ConsentEnv/Deps注入の境界維持）であること
- [x] 既存テストの変更がimport先変更のみで振る舞い期待値の変更がないこと

## テスト戦略

- 単体: 抽出前後で同意検証・除外ゲートの既存テストがimport先変更のみで緑維持であることを確認する
- 単体: 抽出モジュールがDOMに触れずEnv/Deps注入で動くことをfake注入で確認する
- 回帰: `make check` が通ることを確認する

## 見積もり

- 0.20人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認。作成時の一過性失敗は解消済み）
