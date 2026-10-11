# PBI: cap テストの describe をトップレベルに分離する

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #1 から起票）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、テストの構造が一読で分かってほしい。なぜなら、`capAuditPageUrl` の describe が `appendEntry` の describe 内にネストしているから。

## 優先度

- 順位: 3 / 全候補 4 件
- RICEスコア: 0.5（Reach=1 / Impact=0.25 / Confidence=100% / Effort=0.5）
- 根拠: 体裁のみ。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: 構造が一読で分かる
  Given テストファイルを読む
  When  describe 構成を確認する
  Then  `capAuditPageUrl` がトップレベルにある
```

## 受け入れ基準

- [x] describe がトップレベルに分離されている
- [x] テストの緑が維持されている
- [x] `make check` が通る

## テスト戦略

- 既存テストの移動。テスト自体が検証になる

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] リファクタリングが完了しテストが緑である
- [x] `make check` が通る
- [ ] コードレビュー完了
