# PBI: 分類転送のClassifyTransport集約

## ユーザーストーリー
開発者として、分類リクエストの転送関心事を単一モジュールにまとめたい、なぜなら上限・分割・符号化・失敗語彙が4ファイルに分散し、chunk幅とbackstop等の結合条件が単体では検証できないため

## 優先度
- 順位: 7 / 12
- RICEスコア: 38（Reach=15 / Impact=2 / Confidence=50% / Effort=0.4人月）
- 根拠: CORE-1（ClassifyPipeline）の後に実施すること（gatewayのchunk所有が重なるため）。単独では着手しない

## BDD受け入れシナリオ
Scenario: 境界件数でも正しく送受信できる
  Given 20・30・60・61件の欄がある
  When 転送を実行する
  Then chunk分割と上限判定が正しく行われる

Scenario: 失敗理由が区別できる
  Given  oversize・形式不正などの失敗が起きる
  When 転送を実行する
  Then 失敗の種類が区別して返る

## 受け入れ基準
- [ ] `send(fields, {signal})` が唯一の転送入口である
- [ ] 数値importと別名再exportが廃止されている
- [ ] 境界値表テストがある

## テスト戦略
- E2E: AI分類フローの回帰確認
- 統合: 転送経路のテスト
- 単体: 件数境界・失敗種別のテスト

## 見積もり
- 0.4人月

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
