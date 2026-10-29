# PBI: 送信集合のsendSet一本化

## ユーザーストーリー
開発者として、LLM送信集合の定義を単一関数にまとめたい、なぜならsplit系・WithTrace・pipeline分岐の3定義が併存し、eval指標と実送信集合の一致が規約頼みになっているため

## 優先度
- 順位: 5 / 9
- RICEスコア: 45（Reach=15 / Impact=1 / Confidence=60% / Effort=0.2人月）
- 根拠: 指標と実態の乖離防止。依存なし

## BDD受け入れシナリオ
Scenario: force時と通常時で正しい集合が送られる
  Given force指定と通常指定がある
  When 送信集合を求める
  Then それぞれ単一関数の結果に従う

Scenario: eval指標と実送信が一致する
  Given 計測と送信がある
  When どちらも参照する
  Then 同一定義に基づく

## 受け入れ基準
- [x] sendSetが唯一の送信集合所有者である
- [x] pipeline分岐とWithTraceが委譲している
- [x] force×skip×refine-dropのparityテストがある

## テスト戦略
- E2E: 分類フローの回帰確認
- 統合: 送信経路のテスト
- 単体: 集合定義の組み合わせテスト

## 見積もり
- 0.2人月

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
