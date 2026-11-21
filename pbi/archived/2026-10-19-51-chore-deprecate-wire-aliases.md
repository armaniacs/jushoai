# PBI: wire旧名に非推奨を付ける

## 背景

PBI-46 で `encodeFieldMeta`／`decodeRequest`／内部 `WIRE_META_KEYS` が正準になり、`toWireMeta`／`parseRequest`／公開 `META_WIRE_KEYS` は後方互換の別名になった（`src/messages.ts:126-160, 226-257`）。別名に何も印がないため、新規コードが旧名を使い続け、正準化が形骸化する。

## ユーザーストーリー

開発者として、旧名に `@deprecated` を付けたい、なぜなら印がないと新規コードが旧名を使い続け、codec 正準化が形骸化するため。

## 優先度

- 順位: 4位 / 7件
- RICEスコア: 32（Reach=4 / Impact=0.5 / Confidence=80% / Effort=0.05人月）
- 根拠: 新規コードの旧名使用を防ぐリスク軽減。54と同ファイルのため直列（51→54 の順で先に実施）。

## BDD受け入れシナリオ

```gherkin
Scenario: 旧名に非推奨の印がある
  Given toWireMeta／parseRequest／META_WIRE_KEYS を使う開発者がいる
  When エディタや typecheck で旧名に触れる
  Then 非推奨として表示され、新規コード用の正準名が分かる

Scenario: 振る舞いが変わらない
  Given 旧名と正準名の両方で encode／decode する呼び出しがある
  When 同一入力を与える
  Then 結果が一致し、既存テストが緑のまま
```

## 受け入れ基準

- [x] `toWireMeta`・`parseRequest`・公開 `META_WIRE_KEYS` に `@deprecated`（正準名への誘導付き）が付く
- [x] `src/` 配下の新規コードに旧名の使用がない（grep で確認）
- [x] 既存テストが緑維持（振る舞い不変）

## テスト戦略

- 単体: 旧名と正準名の等価性（既存テストでカバー済みのはずで、追加不要なら grep 確認のみ）
- 回帰: `tests/messages.test.ts` 一式を緑維持で確認する

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（等価性が既存テストで足りる場合は grep 確認の記録で代替可）
- [x] コードレビュー完了
- [x] `make check` が通る
