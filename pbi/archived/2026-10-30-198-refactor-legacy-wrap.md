# PBI: withLegacyThrowFallback の二重適用の単一化

## ユーザーストーリー
開発者として、legacy 互換包みの正規化点を pipeline 境界の 1 か所にしたい、なぜなら analyze.ts と runClassifyPipeline の両方で包まれ、両ファイルのコメントが「ここで正規化する」と主張し合い、attempt 契約を触る変更で「どちらが正」か迷うため

## 優先度
- 順位: 9 / 13
- RICEスコア: 15（Reach=3 / Impact=0.25 / Confidence=100% / Effort=0.05人月）
- 根拠: analyze 側は pass-through（挙動不変で削除可）が同値実証済み。193 と同バッチ。依存なし

## BDD受け入れシナリオ
Scenario: 正規化は pipeline 境界で 1 回だけ
  Given classify-only の fake classifier
  When classifyAll 経由でも runClassifyPipeline 直行でも実行する
  Then 正規化は pipeline 境界で 1 回だけ走り、結果は同値

## 受け入れ基準
- [x] analyze.ts の wrap と import が削除される（classifyAll は素の classifier を渡す）
- [x] runClassifyPipeline の wrap は正規化点として残る
- [x] withLegacyThrowFallback のテスト pin（classify-pipeline テストの legacy fake 経路）が緑
- [x] `make check` が緑（typecheck の未使用 import 含む）

## テスト戦略
- 単体: classify-only fake が pipeline 境界で正規化される既存 pin が成立すること
- 統合: samples.test.ts の classifyAll 経路が同値であること

## 実装アプローチ
- analyze.ts から withLegacyThrowFallback の wrap と import を外す（本番は content.ts → content-session 直行で analyze を通らないため影響なし）

## 見積もり
0.05人月

## 技術的考慮事項
- analyze.ts の import から外し忘れると未使用 import が残り typecheck が落ちる（最大の落とし穴）
- pipeline 側の wrap は絶対に消さない（content-session 直行経路が legacy fake を渡す可能性を含む）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
