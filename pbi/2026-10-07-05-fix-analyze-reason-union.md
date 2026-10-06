# AnalyzeResponse reason の union 化

種別: fix
優先度: 順位 1/3、RICE 8.0（Reach=4 / Impact=1 / Confidence=1.0 / Effort=0.5）
根拠: content→popup の実行時メッセージの seam を跨ぐ語彙が string で、送信側の追加が受信側で黙って汎用表示に落ちる
依存: なし（先行実施）

## ユーザーストーリー

ポップアップの保守者として、分析失敗の理由語彙を1箇所で知りたい。なぜなら送信側が増やした理由が型に現れず、受信側のフォールバックに埋もれるから。

## 背景

- `src/messages.ts:26`: `AnalyzeResponse` の `reason` が `string` である
- `src/entrypoints/content.ts:191-196`: 送信側は `no-form` と `error` だけを送る
- `src/entrypoints/popup/main.ts:10-16`: `ANALYZE_NOTICE: Record<string, string>` が `no-form` だけを知り、未知は汎用文に落ちる

## BDD受け入れシナリオ

Scenario: 既知の理由は専用文言になる
  Given content が `no-form` で応答する
  When popup が表示する
  Then 専用の案内文が出る

Scenario: 未知の理由は汎用文言になる
  Given 将来の送信側が新理由を送る
  When popup が表示する
  Then 型で検出でき、対応漏れは汎用文言で安全に表示される

## 受け入れ基準

- [x] `AnalyzeResponse` の `reason` が union 型で定義される
- [x] 送信側（content.ts）と受信側（popup/main.ts）がその型を共有する
- [x] 既存の `no-form` / `error` の表示が変わらない
- [x] 既存テストが green を維持する

## テスト戦略

- vitest: `tests/` の popup 系・messages 系に reason 語彙のテストを追加する
- 実行は対象ファイル指定の `vitest run`

## 見積もり

0.5pt

## Definition of Done

- [x] reason 語彙が messages.ts の1箇所に集約されている
- [x] BDDシナリオの2件がテストで裏付けられている
- [x] 既存テストが green である
