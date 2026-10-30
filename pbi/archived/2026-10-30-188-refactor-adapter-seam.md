# PBI: adapterシームの規約化

## ユーザーストーリー
開発者として、e2eのadapterシーム規約を定めたい、なぜならscenariosがharnessを直触りし、seed経路とlabelが二重化しており、互換シムの削除条件も未定義なため

## 優先度
- 順位: 8 / 9
- RICEスコア: 37（Reach=8 / Impact=1 / Confidence=70% / Effort=0.15人月）
- 根拠: seam違反の再発防止。seed実体統一は対象外。依存なし

## BDD受け入れシナリオ
Scenario: scenariosがadapterのみを見る
  Given シナリオ実装がある
  When harness直利用を探す
  Then 存在しない

Scenario: labelが一本化される
  Given adapterとoptsのlabelがある
  When 実行する
  Then adapter.labelが使われる

## 受け入れ基準
- [x] seam責務がコメントで宣言されている
- [x] 直触りが止血されている
- [x] seed分岐に削除条件が付いている

## テスト戦略
- E2E: 両ブラウザで既存スイートが緑であること
- 統合: adapter切替時のテスト
- 単体: 対象外

## 見積もり
- 0.15人月

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
