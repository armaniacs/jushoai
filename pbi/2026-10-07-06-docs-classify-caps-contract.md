# 送信上限 30/20/60 の契約コメント

種別: docs
優先度: 順位 2/3、RICE 2.0（Reach=2 / Impact=0.5 / Confidence=1.0 / Effort=0.5）
根拠: 送信側合計・チャンク・受信側 backstop の関係が bare な定数で、変更時に契約が崩れやすい
依存: なし

## ユーザーストーリー

送信上限の保守者として、3つの数値の関係を1箇所で読みたい。なぜなら `src/messages.ts` と `src/llm/background-gateway.ts` に分散し、20 < 30 が偶然に見えるから。

## 背景

- `src/messages.ts:5-6`: `MAX_CLASSIFY_FIELDS = 30`（1メッセージの backstop）、`MAX_CLASSIFY_CHUNK = 20`
- `src/llm/background-gateway.ts:8`: `MAX_CLASSIFY_TOTAL = 60`（送信側合計＝3メッセージ分）

## BDD受け入れシナリオ

Scenario: 契約が1箇所で読める
  Given 上限のいずれかを変える保守者
  When 定義箇所を読む
  Then 合計60・1回20・受信側30の関係と、20 < 30 が意図的であることが分かる

Scenario: 挙動が変わらない
  Given コメント追加後のコード
  When 全テストを実行する
  Then green であり、送信分割の挙動が変わらない

## 受け入れ基準

- [ ] 3定数の関係を説明するコメントが1箇所にある
- [ ] 数値・挙動の変更を含まない
- [ ] 既存テストが green を維持する

## テスト戦略

- vitest: 既存の gateway・messages 系テストが green であることを確認する

## 見積もり

0.5pt

## Definition of Done

- [ ] 契約コメントが追加されている
- [ ] 挙動不変であることがテストで裏付けられている
- [ ] 既存テストが green である
