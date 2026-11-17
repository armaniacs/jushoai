# PBI: isEmailByName の mail 部分一致の締め直し

## ユーザーストーリー
郵送先住所欄（mailingaddress 等）を持つフォームに入力する利用者として、name に mail を含む欄がメール欄と誤確定されてメールアドレスを注入されないようにしてほしい、なぜなら 除外語彙が `mailform`/`mailto` の 2 語のみで、`mailingaddress`・`mailbox` が confident 0.7 の email になり、ACCEPT_THRESHOLD 以上のため誤注入が確定ルートになるから

## 優先度
- 順位: 3 / 14
- RICEスコア: 68（Reach=2 / Impact=2 / Confidence=85% / Effort=0.05人週）
- 根拠: PBI-229（kasadera 救済）の意図（mailconf・email_confirm を同一扱い）は保ちつつ、派生語の誤爆を塞ぐ。分類の正確性は製品の中核

## 出どころ
- checking-team 2026-11-18 ラウンド・Domain Logic Expert。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/core/classify-rules.ts:194-204（ゲート本体 :545）

## BDD受け入れシナリオ
Scenario: 派生語が email 確定にならない
  Given name が `mailingaddress`・`mailbox` の欄（label・nearby 空）
  When  classifyField を実行する
  Then  email 確定にならず、従来の分類経路（unknown または別カテゴリ）に戻る

Scenario: 救済対象は維持される
  Given name が `item_mail_1`・`mailconf`・`email_confirm` の欄
  When  classifyField を実行する
  Then  PBI-229 どおり email 確定になる（kasadera 等の既存 fixture の pin が変わらない）

## 受け入れ基準
- [ ] 除外語彙に `mailing` を足す、または `mail` の前後を非英字に寄せた境界 + 確認語彙（conf 等）の明示許可リストに締める
- [ ] 該当 shape（mailing 系 name・label/nearby 空）を fixture 先行で tests/core/ に追加して RED から直す
- [ ] `npm run eval` が全パスし、pin 更新は該当 fixture 行のみ
- [ ] `make check` が緑

## 実装手順
- まず fixture を追加して失敗させる（tests/helpers.ts の makeMeta）
- denylist 追加または境界正規表現で直す（確認語彙の許可リスト方式を取る場合は PBI-229 の実装記録と整合させる）
- `make eval` で corpus 全体の pin 差分を確認する

## テスト戦略
- fixture 先行（BDD シナリオ 2 本を tests/core/ に）
- PBI-229 の既存テストが救済対象の回帰網

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
