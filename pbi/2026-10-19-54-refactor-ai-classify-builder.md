# PBI: ai-classify送信をbuilderに移行する

## 背景

PBI-46 で gateway の3送信（`ai-status`・`ai-test`・`ai-download`）は builder 化されたが、`ai-classify` だけ素リテラル `{ type: 'ai-classify', ... }` のまま残った（`src/llm/background-gateway.ts:123-125` の NOTE）。理由は型契約の歪み：`AiRequest.fields` が `FieldMeta[]` なのに対し実際の送信値は `MetaWire[]` のため、素の `encodeRequest` 適用には `fields: MetaWire[]` 化と受信側（`decodeFieldMeta`・`sanitize` 系・`buildPrompt`）の整合整理が先に必要。現状この1箇所だけキー規律の穴になっている。

## ユーザーストーリー

開発者として、`ai-classify` 送信を builder／codec 経由に移行したい、なぜなら現状この1箇所だけ素リテラルで、将来のキー追加が codec の規律をすり抜けるため。

## 優先度

- 順位: 7位 / 7件
- RICEスコア: 20（Reach=10 / Impact=2 / Confidence=50% / Effort=0.5人月）
- 根拠: 影響範囲は最大だが、型契約整理のスコープ不確かさ（Confidence 50%）と工数が押し下げた。設計先行で確信度を上げてから実装する。51と同ファイルのため直列（51→54 の順で後に実施）。

## BDD受け入れシナリオ

```gherkin
Scenario: 型契約が整理される
  Given AiRequest.fields の型と実際の送信値の歪みがある
  When fields の型（MetaWire[] 化）と受信側の整合を整理する
  Then 送信値・受信値・prompt 入力が同一 allow-list から供給される

Scenario: ai-classify送信がcodec経由になる
  Given 整理済みの型契約がある
  When BackgroundClassifier がチャンクを送信する
  Then 素リテラルがなくなり、NOTE コメントが解消され、送信バイト列が従来と一致する
```

## 受け入れ基準

- [x] `AiRequest` の `fields` 型と実送信値（`MetaWire`）の歪みが解消され、受信側（decode・prompt）との整合が取れる
- [x] `BackgroundClassifier.attempt` の `ai-classify` 送信が builder／`encodeRequest` 経由になる
- [x] NOTE コメントが解消される
- [x] 送信バイト列の不変性（allow-list キーのみ・value なし）が回帰テストで保証される
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 型整理後の encode→decode 往復で wire 形状が従来一致することを確認する
- 単体: チャンク分割（cap・truncatedCount・failureReason 優先度）の既存 gateway テストを緑維持で確認する
- 回帰: `tests/llm/background-gateway.test.ts`・`tests/messages.test.ts` 一式を緑維持で確認する

## 見積もり

- 0.5人月（型契約整理の調査を含む。要チームでの見積もり）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
