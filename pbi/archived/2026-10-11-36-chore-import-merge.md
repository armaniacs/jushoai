# PBI: audit-log の import 文を結合する

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #3 から起票）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、import が重複なく書かれていてほしい。なぜなら、`handle-message.ts` で同一モジュールからの type  import と値 import が 2 文に分離しているから。

## 優先度

- 順位: 4 / 全候補 4 件
- RICEスコア: 0.5（Reach=1 / Impact=0.25 / Confidence=100% / Effort=0.5）
- 根拠: 体裁のみ。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: import が1文にまとまる
  Given `handle-message.ts` の先頭を読む
  When  audit-log からの import を確認する
  Then  1 文にまとまっている
```

## 受け入れ基準

- [x] import が 1 文に結合されている
- [x] `make check` が通る

## テスト戦略

- 体裁変更のため対象外。型検査の緑で確認する

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] リファクタリングが完了し型検査が緑である
- [x] `make check` が通る
- [ ] コードレビュー完了
