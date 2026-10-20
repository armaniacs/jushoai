# PBI: 実体のない後方互換シム（deprecated 別名）を削除する

## ユーザーストーリー

開発者として、本番呼び出しのない deprecated 別名を削除したい、なぜなら同じ実体に2つの名前がある読解コストと、deprecation が中途半端に止まっているシグナルだけが残っており、送信者と受信者は同一ビルドで lockstep 出荷のため、更新再起動を跨いだ古い content script も旧コードをコンパイル済みで持っており、別名を import する消費者は実在しないため。

## 優先度

- 順位: 1位 / 4件
- RICEスコア: 50（Reach=3 / Impact=0.5 / Confidence=100% / Effort=0.03人月）
- 根拠: Quick Win。別名削除とテスト2ファイルの pin 差し替えだけで、本番呼び出し0は grep で検証済み。113位の契約分割の前に済めると移動する export が実体だけになる。

## BDD受け入れシナリオ

```gherkin
Scenario: messages.ts に実体のない別名が残らない
  Given messages.ts に deprecated マークの別名がある
  When 別名を削除しテストの pin を実体へ向ける
  Then 本番コードの振る舞いが変わらず、@deprecated が消える

Scenario: wire の value キー検査が失われない
  Given fieldmeta-novalue テストが toWireMeta 経由で性質を pin している
  When pin 対象を encodeFieldMeta に差し替える
  Then value キーを wire に載せない性質の検査が同じ主張で緑のまま残る
```

## 受け入れ基準

- [x] messages.ts から `parseRequest`・`toWireMeta`・`META_WIRE_KEYS`・`MAX_CLASSIFY_FIELDS`・`MAX_CLASSIFY_CHUNK` の別名が消えること
- [x] tests/messages.test.ts と tests/dom/fieldmeta-novalue.test.ts の pin が実体（encodeFieldMeta・decodeFieldMeta・decodeRequest・transfer-contract 定数）へ向くこと
- [x] 本番コードの import に変更がないこと（別名の本番呼び出しは0。background-gateway は transfer-contract から直接 import 済み）
- [x] `make check` が通る

## テスト戦略

- 単体: fieldmeta-novalue の性質検査（value キーを wire に載せない）を encodeFieldMeta に対して pin し直す
- 回帰: `make check` green

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
