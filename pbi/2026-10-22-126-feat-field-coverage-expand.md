# PBI: 分類カバレッジ拡張（汎用select・日付・会社・カスタム）

## ユーザーストーリー
日本式フォームを使う利用者として、会社名・部署・生年月日・汎用select・カスタム項目も正しい欄に入ってほしい、なぜなら現状は除外・未分類で注入されず手入力が残るから

## 優先度
- 順位: 3 / 7
- RICEスコア: 426.7（Reach=800 / Impact=2 / Confidence=80% / Effort=3人週）
- 根拠: 影響範囲最大級。ローカル学習ループ（130）の前提になるため先行。依存なし

## BDD受け入れシナリオ
Scenario: 会社・部署・日付が分類される
  Given 会社名・部署・生年月日欄のあるフォーム
  When 「JushoAIで入力」を押す
  Then 各欄が対応カテゴリでプレビューされ承認後に注入される

Scenario: 対象外は安全に除外される
  Given checkbox・hidden・submit等の操作要素
  When 走査する
  Then 分類せず注入もしない（現行の除外方針を維持）

## 受け入れ基準
- [ ] 新カテゴリ追加時は`CATEGORIES`・prompt schema・`parseLlmOutput`を同時更新する
- [ ] 正規表現テストが落ちたら期待値ではなく正規表現を直す
- [ ] 対象URLを持つ場合は`make addurl URL=<url>`から始め最小再現fixture＋期待値を埋める
- [ ] radioはname単位1欄・checkbox対象外・hidden除外の方針を崩さない

## テスト戦略
- E2E: 実フォームでの注入確認（React/Vueのsetter＋イベント発火を含む）
- 統合: `tests/integration/samples.test.ts`へ新規fixtureケース追加
- 単体: `tests/core/`に`makeMeta` fixtureを先に追加し失敗させてから直す

## 見積もり
8（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
