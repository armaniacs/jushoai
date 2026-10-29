# PBI: 有界非同期呼び出しの単一所有（timed-call module）

## ユーザーストーリー
開発者として、timeout+abort+cleanup の有界非同期呼び出しを 1 つの module にまとめたい、なぜなら sendWithTimeout が classify-transport と background-gateway に 16 行まるごと逐語複製されており、timer flush 順・abort 後始末の直しが常に 2 か所手動同期になるため

## 優先度
- 順位: 2 / 13
- RICEスコア: 80（Reach=5 / Impact=1 / Confidence=80% / Effort=0.05人月）
- 根拠: 逐語複製が実在し、呼び出し点 4 か所・工数最小。193（チャンク走）の前提。依存なし

## BDD受け入れシナリオ
Scenario: stall reply は caller を pending のままにしない
  Given 応答しない sendMessage がある
  When 有界呼び出しを timeout 付きで実行する
  Then timeout Error で reject され、後始末が済む

Scenario: abort は timer より先に返る
  Given 進行中の呼び出しがある
  When signal が abort する
  Then timer が破棄され aborted Error で reject される（listener 残留なし）

## 受け入れ基準
- [ ] timed-call 1 module が timeout+abort+cleanup を所有する
- [ ] classify-transport と background-gateway の逐語複製が削除され、双方その module を通る
- [ ] gateway の deprecated 再export（CLASSIFY_TIMEOUT_MS 等、テスト import 含む）と 4 timeout 既定（5/30/120/10s）は維持
- [ ] `make check` が緑（cleanup 後 timer 0 件の既存 pin 含む）

## テスト戦略
- 単体: tests/llm/background-gateway.test.ts の既存 pin（stall reply・cleanup）が成立すること
- 統合: classify-transport の signal（プレビュー破棄）経路が不変であること
- 構造: fetch 版（http-classifiers）と DoH 版（settings）は手段差（AbortController）のため対象外とし、後続判断として残す

## 実装アプローチ
- sendMessage 用の timed-call module を llm/ に置き、classify-transport と background-gateway が両方 import する。エラー文言（'timeout'/'aborted'）と reject 順は現行どおり

## 見積もり
0.05人月

## 技術的考慮事項
- gateway の 4 timeout 既定を transfer-contract に寄せると transfer-contract.test.ts と gateway テストの期待値がずれるため、本 PBI では寄せない（最大の落とし穴）
- fetch 版は finally が fetch 往復のみ、DoH 版は res.json() まで覆う＝統一すると timeout のカバー範囲が変わるため対象外

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
