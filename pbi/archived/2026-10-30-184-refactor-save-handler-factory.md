# PBI: 保存ハンドラのkind解決集約

## ユーザーストーリー
開発者として、保存ハンドラのkind解決を単一関数にまとめたい、なぜならSPEC選択・goOther・onTrial・import失敗catchが同型ペアで重複し、次の差異追加が3箇所に波及するため

## 優先度
- 順位: 4 / 9
- RICEスコア: 53（Reach=10 / Impact=1 / Confidence=80% / Effort=0.15人月）
- 根拠: 縮小再発パターンの打ち止め。依存なし

## BDD受け入れシナリオ
Scenario: 保存ボタンがkind解決で動作する
  Given プロファイル面と住所面がある
  When それぞれ保存する
  Then 共通ハンドラで正しく処理される

Scenario: import失敗時の表示が一元化される
  Given import失敗が起きる
  When どちらの面でも失敗する
  Then 同一ヘルパーで表示される

## 受け入れ基準
- [ ] onSaveSide(kind)が単一化されている
- [ ] goSide/onTrialSaveSide/import失敗ヘルパーが集約されている
- [ ] SIDE_SPECSが使用されている

## テスト戦略
- E2E: 保存フローの回帰確認
- 統合: オプション画面の保存経路
- 単体: kind解決のテスト

## 見積もり
- 0.15人月

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
