# PBI: wire codecを深化させる

## 背景

`src/messages.ts` でbuilder（`aiStatusRequest` 等:60-66）・parser（`parseRequest`・`parseClassifyResult` 等:157-232）・キー一覧（`META_WIRE_KEYS`:90）・legacy許容（`checkRequestVersion`・`isLegacyClassifyFailure`:150-188）が横並びし、interfaceとimplementationがほぼ同規模のshallow。呼び出し側がversion付与・キー数え・legacy分岐の正しさを自前で組み立てる。

## ユーザーストーリー

開発者として、versioningとキー規律をencode/decodeの背後に隠し、キー一覧を内部seamにしてwireずれをcodec内で検出したい、なぜなら現状はbuilder・parser・キー一覧・legacy許容が横並びのshallowで、呼び出し側が正しさを自前で組み立てるため。

## 優先度

- 順位: 6位 / 7件
- RICEスコア: 21（Reach=5 / Impact=1 / Confidence=50% / Effort=0.12人月）
- 根拠: versioningとキー規律をcodecの背後に隠し、wireずれをcodec内で検出できるようにする。PBI-42・43と同messages.tsのため実装は直列（42→43→46の順で末尾）。

## BDD受け入れシナリオ

```gherkin
Scenario: versioningとキー規律がcodecの背後に隠れる
  Given encode/decodeの背後にversioningとキー規律を持つcodecがある
  When 呼び出し側がAiRequestを送信・受信する
  Then version付与・キー数え・legacy分岐を自前で組み立てず、codec経由だけで正しいwire形状になる

Scenario: wireずれがcodec内で検出される
  Given キー一覧を内部seamに持つcodecがある
  When wire形状がずれたメッセージ（未知キー・欠落キー・未知version）が届く
  Then codec内で検出され、fail-safeなreject（null）または警告付き処理になる
```

## 受け入れ基準

- [x] versioning（付与・照合・legacy許容）がencode/decodeの背後に隠れ、呼び出し側の自前組み立てがない
- [x] `META_WIRE_KEYS` 等のキー一覧がcodec内部のseamになり、送受信両端のallow-listが一箇所から供給される
- [x] wireずれ（未知キー・欠落キー・未知version）がcodec内で検出されfail-safeに処理される
- [x] 既存テストが緑維持

## テスト戦略

- 単体: codec経由のencode/decodeでversion付与・キー規律・legacy許容が正しく働くことを確認する
- 単体: ずれたwire形状（未知キー・欠落キー・未知version）がcodec内で検出・fail-safe処理されることを確認する
- 回帰: 既存のmessages/gatewayテスト一式を緑維持で確認する

## 見積もり

- 0.12人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
