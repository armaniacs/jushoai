# PBI: バナー X → クイック登録フローの文書化

## ユーザーストーリー
除外登録の最短経路を知りたい利用者として、ガイドにバナー X からの登録手順と prefix の自動範囲が書いてあってほしい、なぜなら 実装（0.1.34/0.1.35）ではバナー「×」→ ダイアログから永続登録ができるのに、ガイドは設定ページ経由の手順のみを案内し、自動クローズの存在を知らない利用者は「勝手に消えた」と受け取りやすいから

## 優先度
- 順位: 12 / 14
- RICEスコア: 20（Reach=2 / Impact=0.5 / Confidence=100% / Effort=0.05人週）
- 根拠: Documentation Architect（フロー未文書化）と Compliance & Privacy Guard（prefix 自動範囲の未開示）の統合指摘。同意範囲の開示は実装と記述の一致の問題

## 出どころ
- checking-team 2026-11-18 ラウンド・Documentation Architect + Compliance & Privacy Guard。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: site/content/ja/popup-and-fill.md:52-65・site/content/ja/safety.md:64-65（site/content は v0.1.29 から無変更）。実装側: src/ui/dismiss-dialog.ts・src/content/exclusion-register.ts・src/content/exclusion-prefix.ts

## BDD受け入れシナリオ
Scenario: ガイドに最短経路が書かれる
  Given popup-and-fill ガイド（ja/en）の「起動しないURL」節
  When  節を読む
  Then  フォーム上の X からの登録手順・15 秒自動クローズ・取り消しは「元に戻す」が書かれている

Scenario: prefix の自動範囲が開示される
  Given 同節の prefix 説明
  When  範囲の説明を読む
  Then  「origin + 第 1 パスセグメント、origin 直下はサイト全体」という自動範囲が書かれ、実装（exclusion-prefix.ts）と矛盾しない

## 受け入れ基準
- [ ] ja/en 両方の popup-and-fill.md に追記する（H2 を増やさず箇条書きで。パリティ検査に影響させない）
- [ ] prefix 自動範囲の説明が実装と一致する
- [ ] `make site` が緑

## 実装手順
- ja の「起動しないURL」節にバナー経由のフローと範囲を追記する
- en に対応訳を追加する
- `make site` で検査を通す

## テスト戦略
- 検証: `make site`（日英対応・H2・リンク検査）+ 実装（exclusion-prefix.ts）との文言照合

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが検証手順でパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
