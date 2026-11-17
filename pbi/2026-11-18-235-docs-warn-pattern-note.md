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
- [ ] ja 表と en 表に warn-pattern の行が 1 行ずつ追加されている（文言は STATUS_NOTE と一致させる）
- [ ] `make site` が緑（validate-guides のパリティ検査を通る）
- [ ] STATUS_NOTE を追加したらガイド表も更新する旨の運用メモ 1 行を AGENTS.md のテスト方針（またはサイト節）に足す

## 実装手順
- ja 表に「欄のパターンと合わないため入力しません」の行を追加する
- en 表に対応訳を追加する
- `make site` で検査を通す

## テスト戦略
- `make site`（日英対応検査・H2 数・リンク検査）が回帰網。表の行は検査対象外のため目視確認を DoD に含める

## 見積もり
0.02人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが検証手順（make site と目視照合）でパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
