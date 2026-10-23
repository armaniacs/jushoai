# PBI: fill-one-entryの1行2文を整形する

## ユーザーストーリー
拡張機能を保守する人として、1行に2文が詰まったコードが整形されていてほしい、なぜなら読みにくさが差分レビューのノイズになるから

## 優先度
- 順位: 5 / 5
- RICEスコア: 250（Reach=10 / Impact=0.25 / Confidence=100% / Effort=0.01人週）
- 根拠: 動作は変わらない整形のみ。リスクゼロで読みやすさだけが上がる

## 現象（レビュー指摘）
- `src/content/fill-one-entry.ts` 57行: `const addressId = ...;  const address = ...` が1行に2文で詰まっている

## BDD受け入れシナリオ
Scenario: 1行1文になる
  Given 57行に2文が詰まっている
  When 整形する
  Then 1行1文になり、動作は変わらない

## 受け入れ基準
- [ ] 1行1文に整形され、動作が変わらないこと（`make check`緑）を確認する

## テスト戦略
- 単体: 既存の`fill-one-entry.test.ts`が通ることの確認

## 見積もり
1（要チームでの見積もり）

## Definition of Done
- [ ] 整形が済み、既存テストが通る
- [ ] `make check`が緑
