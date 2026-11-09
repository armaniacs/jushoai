# PBI: サイズ上限・clip 語彙の一覧集約（文書のみ）

## ユーザーストーリー
開発者として、新しい送信・保存経路の追加時にどの上限を掛けるべきか分かるようにしたい、なぜなら現在は上限が4モジュールに分散し、経路と定数の対応がコード読みでしか分からず掛け忘れ・二重掛けになる構造だから

## 優先度
- 順位: 5 / 5
- RICEスコア: 6.0（Reach=2 / Impact=2 / Confidence=60% / Effort=0.4人週）
- 根拠: 堅牢性の構造改善だが挙動不変・文書中心。確信度はレビュー合意次第

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ5
- `src/scan-limits.ts:5`（MAX_TEXT_LENGTH = 200。scan と wire decode の共有）
- `src/messages.ts:16`（MAX_ID_LENGTH = 100）、`src/messages.ts:145`（META_CLIP_LENGTH = 80）
- `src/ai/http-classifiers.ts:14`（MAX_RESPONSE_BYTES = 1000000）、`src/ai/http-classifiers.ts:142-163`（readJsonBounded の二重 Content-Length/stream cap）
- `src/ai/audit-log.ts:11`（AUDIT_MAX_BYTES = 4000000）、`src/ai/audit-log.ts:22`（AUDIT_PAGE_URL_MAX_BYTES = 1024）、`src/ai/audit-log.ts:65-66`（clipAuditResponse）

## BDD受け入れシナリオ
Scenario: 上限の一覧が1箇所で読める
  Given src/scan-limits.ts の一覧表コメント
  When 新経路の上限を選ぶ
  Then 経路・定数・所有者の対応が表で分かる

Scenario: 値も挙動も変わらない
  Given 集約の前後
  When make test と make check を実行する
  Then すべて緑のまま（定数の移動・統一はしない）

## 受け入れ基準
- [ ] 上限の一覧表コメント（経路・定数・所有者）が src/scan-limits.ts に集約される
- [ ] 新経路向けの選択ガイド（送信=wire、保存=監査予算、表示=clip）が添えられる
- [ ] 値を変えない。定数の移動・統一はしない（監査予算と応答上限は変わる理由が別）
- [ ] make check が exit 0

## テスト戦略
- 挙動変更なしのため既存テストが回帰網になる。新規テストは不要
- 検証: make check + 文字種チェック

## 見積もり
0.4人週（要チームでの見積もり）

## 技術的考慮事項
- T1〜T4 と独立。小 PBI として単独で着手できる
- コメント集約のため docs-charset の範囲文字のみで書く

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
