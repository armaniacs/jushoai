# PBI: ApplyPoint の null 後方互換を除去する

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #4 から起票）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、型の選択肢が現行の事実だけを表していてほしい。なぜなら、`ApplyPoint` の `null` は現行の全ファクトリが返さず、テストの fake だけが使う後方互換だから。

## 優先度

- 順位: 3 / 全候補 4 件
- RICEスコア: 0.5（Reach=1 / Impact=0.25 / Confidence=100% / Effort=0.5）
- 根拠: 整理のみ。同点の #1（回帰守備）を先にする。#3 と同一ファイルのため直列に実施し、#3 の後に行う

## BDD受け入れシナリオ

```gherkin
Scenario: null なしで検証が動く
  Given `ApplyPoint` から `null` が除去されている
  When  全テストを実行する
  Then  緑のままである
```

## 受け入れ基準

- [ ] `ApplyPoint` から `null` が除去され、`verifyApplyConsent` の null 分岐が消えている
- [ ] テストの fake が番兵値に置き換わっている
- [ ] `make check` が通る

## テスト戦略

- 既存テストの置換。型検査と全テストの緑で確認する

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [ ] リファクタリングが完了しテストが緑である
- [ ] `make check` が通る
- [ ] コードレビュー完了
