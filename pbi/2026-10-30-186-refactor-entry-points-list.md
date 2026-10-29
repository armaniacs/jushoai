# PBI: 分類入口一覧の可視化

## ユーザーストーリー
開発者として、分類入口の一覧を1箇所に集約したい、なぜならfill-one/import-draft/evalがrunを迂回しているのにpipelineコメントが全入口run通過を主張し、次の改修者が見落とすため

## 優先度
- 順位: 6 / 9
- RICEスコア: 43（Reach=8 / Impact=1 / Confidence=80% / Effort=0.15人月）
- 根拠: 誤解コメントの除去と入口可視化。fill-oneのBundle経由化は別途設計判断が必要なため本PBIは一覧集約まで。依存なし

## BDD受け入れシナリオ
Scenario: 入口一覧が正しい
  Given 分類入口の一覧がある
  When 各入口の経路を読む
  Then 実際の呼び出しと一致する

Scenario: 過主張コメントがない
  Given pipelineコメントがある
  When 読む
  Then run所有範囲が正しく書かれている

## 受け入れ基準
- [ ] pipelineコメントが実態どおりに修正されている
- [ ] 入口一覧がclassifyRulePipeline側に集約されている
- [ ] eval迂回の正当性が記録されている

## テスト戦略
- E2E: 対象外
- 統合: 対象外
- 単体: 既存テストの緑維持

## 見積もり
- 0.15人月

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
