# PBI: refineWithDropsの非nullアサーションを除去する

## ユーザーストーリー

開発者として、noUncheckedIndexedAccess下の約10箇所のノイズが将来コピーされる冗長をなくしたい、なぜなら動作の害はないが`!`のばらまきがat()アクセサ等への寄せを妨げているため。

## 優先度

- 順位: 40位 / 40件
- RICEスコア: 8（Reach=3 / Impact=0.25 / Confidence=50% / Effort=0.05人月）
- 根拠: 振る舞い不変の小規模リファクタ。PBI-28と同ファイルのため実装は直列（28の後）。
- 出典: checking-team Refactoring Low
- 対象: src/core/classify-rules.ts:361-426

## BDD受け入れシナリオ

```gherkin
Scenario: インデックスアクセスがat()アクセサ等に寄る
  Given refineWithDrops内のout[i]!等の非nullアサーションが残っている
  When at()アクセサ等への寄せに置き換えたとき
  Then 非nullアサーションが除去され型検査が通る

Scenario: 置き換え後も分割・補正の振る舞いが不変である
  Given 非nullアサーション除去後のrefineWithDropsがある
  When 既存の分類テスト一式を実行したとき
  Then 全テストがグリーンであり分類結果に差分がない
```

## 受け入れ基準

- [x] refineWithDrops内の非nullアサーションが除去されること
- [x] 分割・補正の振る舞いが変わらないこと
- [x] 対象コードがsrc/core/classify-rules.ts:361-426の範囲に収まる

## テスト戦略

- 回帰: tests/core/の分類テスト一式を実行し差分ゼロを確認する
- 型検査: `make typecheck` でnoUncheckedIndexedAccess下の型エラーを確認する

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認）
