# PBI: secret-storeのbase64変換をチャンク化する

## ユーザーストーリー

将来の開発者として、汎用ヘルパーの巨大入力でRangeErrorにならないようにしてほしい、なぜなら現行呼び出しは数百バイトで発火しないが、`toBase64` のスプレッド展開は巨大入力でスタック／引数上限に達する恐れがあるから。

## 優先度

- 順位: 37位 / 40件
- RICEスコア: 17（Reach=2 / Impact=0.5 / Confidence=50% / Effort=0.03人月）
- 根拠: 潜在的なRangeErrorの予防的改善。現行呼び出し（IV 12バイト・数百バイトの暗号文）では発火しないため優先度低。依存なし。
- 出典: checking-team Blue Low
- 対象: src/ai/secret-store.ts:11-12

## BDD受け入れシナリオ

```gherkin
Scenario: 巨大バイト列でもbase64変換できる
  Given 数十万バイト級のUint8Arrayがある
  When toBase64で変換する
  Then RangeErrorにならず、fromBase64で元に戻せる

Scenario: 既存の小さな入出力は変わらない
  Given IV 12バイトと数百バイトの暗号文がある
  When encryptSecret・decryptSecretで往復する
  Then 変換結果と復号結果が従来と同一になる
```

## 受け入れ基準

- [x] 巨大入力（例: 1MiB級）で `toBase64` がRangeErrorにならないこと
- [x] 既存経路（IV・暗号文の往復）の入出力が不変であること
- [x] チャンク分割またはreduce結合で実装され、既存テストが緑維持であること

## テスト戦略

- 単体: 巨大配列の往復・空配列・境界サイズの変換分岐を網羅する
- 回帰: 既存のsecret-store関連テストが緑維持であることを確認する

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
