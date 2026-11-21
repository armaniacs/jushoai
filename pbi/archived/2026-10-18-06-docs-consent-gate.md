# PBI: 同意ゲート拒否の動作を文書化する

## ユーザーストーリー

フォーム利用者として、パネル被覆時に注入が始まらない理由と対処を知りたい、現状はバッジの一瞬表示だけで原因が分からないため。

## 優先度

- 順位: 6位 / 20件
- RICEスコア: 533（Reach=20 / Impact=1 / Confidence=80% / Effort=0.03人月）
- 根拠: docsのみ。依存なし。
- 出典: checking-team Documentation Architect Medium、src/entrypoints/content.ts:400-408、日英troubleshooting.md

## BDD受け入れシナリオ

```gherkin
Scenario: troubleshooting日英に項目が載る
  Given 同意ゲートで拒否されパネル被覆時に注入が始まらない状態である
  When 日英のtroubleshooting.mdを開く
  Then 同意ゲート拒否の理由と対処の項目が載っている

Scenario: H2数一致が保たれる
  Given 日英のtroubleshooting.mdに項目を追記した
  When siteのビルド・検査を実行する
  Then 日英のH2数が一致したまま保たれる
```

## 受け入れ基準

- [x] 日本語troubleshooting.mdに同意ゲート拒否の項目が追記されている
- [x] 英語troubleshooting.mdに同意ゲート拒否の項目が追記されている
- [x] 日英のH2数が一致している
- [x] site build/checkが緑である

## テスト戦略

- site検査中心: 日英troubleshooting.mdのH2数一致を確認する
- site検査中心: 追加項目の見出し・内容が日英対応していることを確認する
- site検査中心: site build/checkが緑であることを確認する

## 見積もり

- 0.03人月

## Definition of Done

- [x] 日英troubleshooting.mdへの追記が反映されている
- [x] 日英のH2数一致が保たれている
- [x] site build/checkが通る
