# PBI: 権限ロールバックをorigin単位の差分に戻す

## ユーザーストーリー

AI利用者として、無関係な保存失敗で稼働中のクラウド分類がpermission-missingにならないようにしてほしい、事前の一部許可まで剥がされるため（PBI-100の残差）。

## 優先度

- 順位: 18位 / 20件
- RICEスコア: 160（Reach=10 / Impact=2 / Confidence=80% / Effort=0.10人月）
- 根拠: 現行rollbackは配列全体のalreadyGrantedで判定するため一部既存許可まで剥がす。PBI-100の残差。依存なし。
- 出典: checking-team Blue Team Medium、src/ai/settings-save.ts:121-130、src/ai/permissions.ts:42-53

## BDD受け入れシナリオ

```gherkin
Scenario: 今回false→true遷移したorigin分だけ削除される
  Given 接続先originは未許可でDoH originのみ許可済みである
  When 保存が解決ゲート・永続化で失敗する
  Then 今回付与された接続先originだけが削除されDoH originの許可は残る

Scenario: 既存許可は維持される
  Given 全originが保存前から許可済みである
  When 保存が解決ゲート・永続化で失敗する
  Then いずれのoriginも削除されず既存の設定・許可でAIは動き続ける
```

## 受け入れ基準

- [x] 保存前にper-originの許可スナップショットを取得している
- [x] rollbackの削除対象が今回false→true遷移分だけに限定される
- [x] 保存失敗時に既存の設定・許可が維持されAIは動き続ける
- [x] rollback失敗がwarnで検知可能な形に残る
- [x] 既存テスト（settings-save）が緑維持

## テスト戦略

- 単体: origin単位の遷移分限定・全既存許可維持・rollback失敗warnの分岐を網羅する
- 統合: 保存失敗→既存設定維持の一連を確認する
- E2E: 対象外（権限プロンプトのため単体・統合で担保する）

## 見積もり

- 0.10人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認）
