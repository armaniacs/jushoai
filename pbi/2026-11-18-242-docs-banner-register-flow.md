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
- [x] ja/en 両方の popup-and-fill.md に追記する（H2 を増やさず箇条書きで。パリティ検査に影響させない）
- [x] prefix 自動範囲の説明が実装と一致する
- [x] `make site` が緑

## 実装手順
- ja の「起動しないURL」節にバナー経由のフローと範囲を追記する
- en に対応訳を追加する
- `make site` で検査を通す

## テスト戦略
- 検証: `make site`（日英対応・H2・リンク検査）+ 実装（exclusion-prefix.ts）との文言照合

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが検証手順でパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録

- 実施日: 2026-11-18（docs-only タスク）
- 変更内容:
  - `site/content/ja/popup-and-fill.md` と `site/content/en/popup-and-fill.md` の「起動しない URL」節（ja: 53-70 行）に、設定ページ手順の直後に箇条書き 4 本ずつを追記。H2 の追加なし、リンクの追加なし（パリティ検査の対象に触れない）
  - 追記位置を設定ページ手順の直後にしたのは、「設定ページから」と「バナー X から」の 2 つの登録経路を隣接させ、既存の挙動説明（例・一致・反映・上限）と削除の段落の並びを変えないため
- 文言と実装の照合（追記前に実装を読んで確認。docs-only のため TDD なし）:

| ガイドの主張 | 実装の根拠 | 結果 |
|---|---|---|
| ダイアログで「このページだけ」/「この配下全体」を選び「起動しないURLに登録する」 | ラジオ文言（src/ui/dismiss-dialog.ts:212）、登録ボタン文言（同 :220）。X ボタンは src/ui/button.ts:99-113（textContent `X`、aria-label「このボタンを隠す」） | 一致 |
| 15 秒で自動クローズ、ホバー・フォーカス中は残る | `AUTO_HIDE_MS = 15000`（src/ui/dismiss-dialog.ts:33）、ホバー/フォーカス保持（同 :138-184、PBI-234/237） | 一致 |
| 隠れたボタンの取り消しは「元に戻す」 | ボタン文言（src/ui/dismiss-dialog.ts:82）→ `onUndo` で dismissed 解除して再マウント（src/entrypoints/content.ts:509-513） | 一致 |
| 成功表示に「解除は設定ページの『起動しないURL』から。」のヒントと即時 undo ボタン | `REGISTER_SUCCESS_HINT`（src/ui/dismiss-dialog.ts:40、ガイドは同一文字列を引用）、「登録を取り消す」（同 :41）。undo は登録 1 件だけを削除しバナーを復帰（src/content/exclusion-register.ts:74-102、src/entrypoints/content.ts:533-548、PBI-244） | 一致 |
| prefix の自動範囲は origin + 第 1 パスセグメント、origin 直下はサイト全体 | `buildExclusionCandidates`（src/core/exclusion-prefix.ts:16-17。第 1 セグメントなしなら `origin/`）。「この配下全体」の範囲の裏付けは PBI-239 の一致規則（src/core/exclusions.ts:61-84。origin 同一 + パスセグメント境界） | 一致 |

- 検証:
  - `make site` 緑（30 ページ生成、site check passed。validate-guides の日英パリティ検査を通過）
  - 生成物の目視確認: `site-dist/guides/popup-and-fill/index.html` と `site-dist/en/guides/popup-and-fill/index.html` の両方に追記 4 本がレンダリングされていることを確認
  - `make check` は docs-only（src/ 変更なし）のため未実施
- BDD シナリオ: 「ガイドに最短経路が書かれる」「prefix の自動範囲が開示される」の両シナリオとも、上記の照合表と目視確認でパス
- 既存記述のメモ: 同節の既存箇条書き「一致は、登録した文字列で URL が始まるかどうかで判定します」（en 対応行も）は PBI-239 より前の接頭一致の説明が残っており、末尾スラッシュなしの登録では現行のセグメント境界規則と厳密には異なる。本タスクは箇条書き追記のみがスコープのため既存行は変更せず、詳細はレポートの懸念を参照
- 修正（2026-11-18 タスクレビューの指摘対応）: 上記メモの既存行「一致は、登録した文字列で URL が始まるかどうかで判定します」（en 対応行）と、節冒頭の「その URL で始まるページ」/「whose URL starts with it」を、PBI-239 の現行規則（オリジン同一 + パスセグメント境界。配下は覆い、兄弟パスは覆わない。src/core/exclusions.ts の isExcludedUrl / coversPath）に沿う文言へ ja/en で差し替えた。PBI-242 追加分の 4 本と他の行は無変更
- 修正の検証: `make site` 緑（30 ページ生成、site check passed。既存行の差し替えのみで行数・H2・リンク・バッジ表は不変）
