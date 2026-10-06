# PBI: 報告IssueのFB文言残存の除去

## 種別
fix

## ユーザーストーリー
報告する利用者として、画面と同じ言葉で報告文を読みたい、なぜなら画面は開発に報告するなのに開く Issue が分類FBのままだから

## 優先度
- 順位: 2 / 4
- RICEスコア: 3.0（Reach=3 / Impact=0.5 / Confidence=1.0 / Effort=0.5）
- 根拠: PBI 15 の改名の取りこぼしで画面と報告文が食い違う
- 依存: なし（後続の 03 と同ファイルのため 03 より先行）

## 背景
- `src/feedback/issue-url.ts:43` の Issue title が `分類FB: 初回NG→AIで分析OK (${host})` のまま残っている
- `src/feedback/issue-url.ts:45` の body 冒頭が `初回では該当のURLは成功しなかったが、AIで分析したら成功した。` のまま残っている
- PBI 15（`pbi/archived/2026-10-06-15-feat-rename-feedback.md`）の改名範囲は `src/ui/preview.ts` と `tests/ui/preview-feedback.test.ts` とサイト日英のみで、Issue 雛形は対象外だった

## BDD受け入れシナリオ
Scenario: Issue の title と body が画面と同じ言葉になっている
  Given 再分析に成功して報告 URL を生成できる
  When 生成された Issue の title と body 冒頭を読む
  Then FB という略語がなく画面の報告表記と一致する言葉になっている

Scenario: 送る内容が変わらない
  Given 改名後の `buildFeedbackIssueUrl` である
  When 報告 URL を生成する
  Then title と body 冒頭の文言以外は変わらない

## 受け入れ基準
- [ ] Issue title に FB という略語が残っていない
- [ ] Issue body 冒頭が画面の報告表記と一致する言葉になっている
- [ ] repo・labels が不変である
- [ ] field metadata の内容が不変である
- [ ] site 日英の該当記載があれば画面・Issue 文言と一致する
- [ ] 既存テストが green である

## テスト戦略
- 単体: vitest で `tests/` の feedback 系に title と body 文言の期待値を追加・更新する
- 手動: 生成 URL の目視で Issue title と body 冒頭を確認する

## 見積もり
0.5pt

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
