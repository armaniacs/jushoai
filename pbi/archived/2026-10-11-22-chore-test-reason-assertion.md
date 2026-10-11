# PBI: 適用ゲートテストの理由断言を整理する

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #8 から起票）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、テストの意図が一読で分かってほしい。なぜなら、`content-apply-gate.test.ts` の abort 理由の断言が `verifyApplyConsent` を 2 回呼ぶ冗長な式になっているから。

## 優先度

- 順位: 8 / 全候補 8 件
- RICEスコア: 0.5（Reach=1 / Impact=0.25 / Confidence=100% / Effort=0.5）
- 根拠: 可読性のみ。同点の #7（供給連鎖守備）を先にし、本 PBI を最後にする

## BDD受け入れシナリオ

```gherkin
Scenario: 理由の断言が一読で分かる
  Given abort 理由のテストを読む
  When  断言を確認する
  Then  `verifyApplyConsent` の結果を変数に取った形になっている
```

## 受け入れ基準

- [x] 冗長な式が変数化されている
- [x] テストの緑が維持されている
- [x] `make check` が通る

## テスト戦略

- 既存テストのリファクタリング。テスト自体が検証になる

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] リファクタリングが完了しテストが緑である
- [x] `make check` が通る
- [x] コードレビュー完了
