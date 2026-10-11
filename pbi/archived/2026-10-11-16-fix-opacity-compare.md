# PBI: 可視性フォールバックの opacity 比較を数値化する

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #3 から起票）
起票日: 2026-10-11

## ユーザーストーリー

入力する利用者として、透明化されたパネルでの適用が確実に中止されてほしい。なぜなら、現行の `style.opacity !== '0'` は `'0.00'` のような正規化形で外す可能性があるから。

## 優先度

- 順位: 2 / 全候補 8 件
- RICEスコア: 40（Reach=100 / Impact=0.25 / Confidence=80% / Effort=0.5）
- 根拠: 1 行級修正。発現条件が稀（`checkVisibility` 不在かつ非正規形）のため Confidence=80%。#1 の後に実施する（同一ファイル・直列）

## BDD受け入れシナリオ

```gherkin
Scenario: opacity が 0 のときは数値として検出される
  Given `checkVisibility` がなく opacity が 0 である
  When  適用を試みる
  Then  非表示として中止される

Scenario: opacity が正のときは従来どおり進む
  Given opacity が正である
  When  適用を試みる
  Then  検証が続行される
```

## 受け入れ基準

- [x] フォールバックが `Number(style.opacity) > 0` の数値比較になっている
- [x] 分岐の単体テストが追加されている
- [x] `make check` が通る

## テスト戦略

- 単体: fake の computed style で `'0'` / `'0.00'` / `'1'` を固定する（jsdom の実 `getComputedStyle` に依存しない形）

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [ ] コードレビュー完了
