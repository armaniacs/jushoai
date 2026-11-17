# PBI: ガイド注記表に warn-pattern 行を追加

## ユーザーストーリー
ガイド（popup-and-fill）でプレビューの注記語彙を確認する利用者として、pattern 違反時に出る「欄のパターンと合わないため入力しません」が注記対照表に載っていてほしい、なぜなら 注記表は注記語彙の一次リファレンスで、PBI-210 が「maxlength 超過と混ざらない文言」として意図的に足した行が利用者文書に反映されないままになっているから

## 優先度
- 順位: 5 / 14
- RICEスコア: 50（Reach=2 / Impact=0.5 / Confidence=100% / Effort=0.02人週）
- 根拠: ja/en 1 行ずつの追記で収まる。H2 数・リンクのパリティ検査は表の行ずれを検出しないため、追記の作業自体にリスクがない

## 出どころ
- checking-team 2026-11-18 ラウンド・Documentation Architect。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: site/content/ja/popup-and-fill.md:41-46（表は 4 行のまま）・site/content/en/popup-and-fill.md:42-46。追加済み側: src/ui/preview.ts:87（STATUS_NOTE 'warn-pattern'）

## BDD受け入れシナリオ
Scenario: ja/en の両表に 1 行ずつある
  Given site/content/ja/popup-and-fill.md と site/content/en/popup-and-fill.md の注記対照表
  When  表を読む
  Then  「欄のパターンと合わないため入力しません」と対応する英語訳の行がそれぞれ存在し、maxlength 超過の行と区別できる説明になっている

## 受け入れ基準
- [x] ja 表と en 表に warn-pattern の行が 1 行ずつ追加されている（文言は STATUS_NOTE と一致させる）
- [x] `make site` が緑（validate-guides のパリティ検査を通る）
- [ ] STATUS_NOTE を追加したらガイド表も更新する旨の運用メモ 1 行を AGENTS.md のテスト方針（またはサイト節）に足す（本タスクでは対応外。PBI-243 が AGENTS.md を触る可能性を避け、最終レビュー後の整理で判断する。候補文言は実装記録を参照）

## 実装手順
- ja 表に「欄のパターンと合わないため入力しません」の行を追加する
- en 表に対応訳を追加する
- `make site` で検査を通す

## テスト戦略
- `make site`（日英対応検査・H2 数・リンク検査）が回帰網。表の行は検査対象外のため目視確認を DoD に含める

## 見積もり
0.02人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが検証手順（make site と目視照合）でパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録

- 実施日: 2026-11-18（docs-only タスク）
- 変更内容:
  - `site/content/ja/popup-and-fill.md` の注記対照表（41-47 行）に warn-pattern の行を 1 行追加。注記列は STATUS_NOTE と完全一致（「欄のパターンと合わないため入力しません」）。意味列は「値が欄に期待される形式と合いません。形式の不一致であり、文字数の問題ではありません。」とし、maxlength 超過の行と区別できる説明にした
  - `site/content/en/popup-and-fill.md` の対応表（41-47 行）に対応訳を 1 行追加（"The value does not match the format the field expects. A pattern mismatch, not a length issue."）
  - 行の位置は maxlength 行の直後。STATUS_NOTE の並び（src/ui/preview.ts:82-90）と planner の判定順（src/core/planner.ts:583-589、maxlength 判定の次に pattern 判定）に一致させるため
  - AGENTS.md への運用メモは本タスクでは入れない（brief の指針どおり）。候補文言: 「STATUS_NOTE（src/ui/preview.ts）に注記を追加したら、site/content/ja/popup-and-fill.md と site/content/en/popup-and-fill.md の注記対照表にも同じ注記の行を追加する」
- 検証:
  - `make site` 緑（30 ページ生成、site check passed。validate-guides の日英パリティ検査を通過）
  - `make check` 緑（typecheck、テスト 3166 パス、両ブラウザビルド、manifest 検査、web-ext lint。警告 2 件は既存の min-version 通知で本タスクと無関係）
  - 生成物の目視確認: `site-dist/guides/popup-and-fill/index.html` と `site-dist/en/guides/popup-and-fill/index.html` の両方に追記行がレンダリングされていることを確認
  - 文言一致の確認: src/ui/preview.ts の STATUS_NOTE['warn-pattern'] と ja 表の注記列が完全一致することを確認
- BDD シナリオ: ja/en 両表に「欄のパターンと合わないため入力しません」と対応英語訳の行が 1 行ずつ存在し、maxlength 超過の行と区別できる説明になっている → パス（上記の目視照合による）
