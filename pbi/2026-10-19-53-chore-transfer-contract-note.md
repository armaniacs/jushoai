# PBI: 転送契約の検証手順を1行で明示する

## 背景

`src/llm/transfer-contract.ts:28-38` の load 時表明は、値の破れを import 失敗＝テスト・ビルド失敗として検出する fail-fast 設計である。検出が `make check` 頼みなのは正しいが、その前提がファイル内に書かれていないため、値をいじる人が単体テストだけ通して終わる可能性がある。

## ユーザーストーリー

開発者として、転送契約の値を変えるときの検証手順をファイル内に明示したい、なぜなら fail-fast の検出が `make check` 頼みという前提が暗黙で、単体テストだけでのすり抜けがあり得るため。

## 優先度

- 順位: 6位 / 7件
- RICEスコア: 25（Reach=2 / Impact=0.25 / Confidence=100% / Effort=0.02人月）
- 根拠: コメント1行の文書化。確実だが価値は小さい。

## BDD受け入れシナリオ

```gherkin
Scenario: 値を変える人が検証手順を知る
  Given TRANSFER_* の値を変えようとする開発者がいる
  When transfer-contract.ts を開く
  Then 値を変えたら make check 必須と分かる

Scenario: 振る舞いが変わらない
  Given 変更前後のモジュールがある
  When import して定数を読む
  Then 値と表明の挙動が一致し、既存テストが緑のまま
```

## 受け入れ基準

- [x] `transfer-contract.ts` の頭コメントに「値を変えたら `make check` 必須」旨の1行以上がある
- [x] 振る舞い変更なし（テスト緑維持）

## テスト戦略

- 既存: `tests/llm/transfer-contract.test.ts` がパスすること（追加テスト不要）

## 見積もり

- 0.02人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（既存テストのパスで可）
- [x] コードレビュー完了
- [x] `make check` が通る
