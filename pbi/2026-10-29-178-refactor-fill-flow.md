# PBI: 注入フローのFillFlow集約

## ユーザーストーリー
開発者として、注入適用パイプラインを型付きトランザクションにまとめたい、なぜなら適用順序（consent→inject→persist→carryover→feedback→banner）が3ファイルにまたがりコメント規律でしか保たれておらず、順序違反がコンパイル時に検出できないため

## 優先度
- 順位: 10 / 12
- RICEスコア: 33（Reach=15 / Impact=2 / Confidence=50% / Effort=0.45人月）
- 根拠: 方向性は正しいが工大で確信度が低い。依存なし

## BDD受け入れシナリオ
Scenario: 同意なしでは注入されない
  Given 同意が得られていない状態がある
  When 適用を実行する
  Then 何も注入されず理由が返る

Scenario: 順序どおりに処理される
  Given 正常な適用条件がある
  When 適用を実行する
  Then consent→inject→persist→carryover→feedback→bannerの順で処理される

## 受け入れ基準
- [ ] `start` / `apply` の2本が唯一の入口である
- [ ] 順序違反が型で検出できる
- [ ] fake-envによる順序テストがある

## テスト戦略
- E2E: 注入フローの回帰確認
- 統合: プレビュー適用経路のテスト
- 単体: 順序条件の組み合わせテスト

## 見積もり
- 0.45人月

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
