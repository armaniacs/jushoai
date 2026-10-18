# PBI: 住所絞り込みをブロック単位に変える

## ユーザーストーリー

フォーム利用者として、注文者と届け先の2ブロック時に届け先addressFullが不完全値にされないようにしてほしい、全体判定で別ブロックの存在を理由にstreet化されるため。

## 優先度

- 順位: 12位 / 20件
- RICEスコア: 320（Reach=20 / Impact=2 / Confidence=80% / Effort=0.10人月）
- 根拠: 複数住所ブロックのあるフォームで届け先の充填が不完全になるのを防ぐ。依存なし。
- 出典: checking-team Domain Logic Medium、src/core/classify-rules.ts:417-423

## BDD受け入れシナリオ

```gherkin
Scenario: 2ブロック時は届け先がaddressFullのまま残る
  Given 注文者と届け先の2ブロックfixtureがあり、届け先にaddressFull欄がある
  When 分類を実行する
  Then 届け先のaddressFullはstreetに絞り込まれずaddressFullのまま残る

Scenario: 単一ブロックは従来通り絞り込まれる
  Given 都道府県・市区町村欄とaddressFull欄が同一ブロックにある
  When 分類を実行する
  Then addressFullは従来通りaddressNoPrefまたはstreetに絞り込まれる
```

## 受け入れ基準

- [x] nearby単位（ブロック単位）で住所絞り込みが判定される、または複数ブロック時は絞り込まれない
- [x] 注文者・届け先の2ブロック再現fixtureが追加される
- [x] 単一ブロック時は従来の絞り込み挙動が維持される
- [x] 既存テストの期待値書き換えなしで回帰がない
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 2ブロックfixtureで届け先addressFullが維持されること、単一ブロックで従来絞りになることを確認する
- 統合: classifyAll相当で複数ブロック混在フォームの分類前後を確認する
- E2E: サンプルフォーム相当で届け先住所の充填が完全値になることを確認する

## 見積もり

- 0.10人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
