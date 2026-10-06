# PBI: 設定画面の左上にロゴを置き GitHub Pages へリンクする

状態: 実装済み（`make check` green、コードレビューと実機目視はユーザー作業として残す）

## ユーザーストーリー
設定を開いた利用者として、左上に JushoAI のロゴがほしい、なぜならドキュメント（GitHub Pages）へ一発で移動したいから

## 優先度
- 順位: 1 / 3
- RICEスコア: 10.0（Reach=4 / Impact=0.5 / Confidence=1.0 / Effort=0.2）
- 根拠: 他候補との依存がなく、工数が最小のため先行する

## 背景
- 設定ページは左メニュー化済み（`src/entrypoints/options/nav.ts` の `buildNav`）。Yasumaro の設定画面にならい、メニューの上にブランド枠を置く
- アイコン画像は `public/icon/` に 16/32/48/128 が揃っている（`pbi/archived/2026-10-06-01-feat-toolbar-icon.md`）。設定画面用に 32 を流用できる
- 公開ドキュメントの URL は `https://armaniacs.github.io/jushoai/`（リポジトリ `armaniacs/jushoai` の project pages の定形。`.github/workflows/pages.yml` がデプロイする本体）

## BDD受け入れシナリオ
Scenario: ロゴからドキュメントを開く
  Given 設定ページを開いている
  When 左上のロゴを選ぶ
  Then GitHub Pages の JushoAI が新しいタブで開く

Scenario: ロゴがなくても設定は使える
  Given 画像の読み込みに失敗した
  When 設定ページを見る
  Then 代替テキストが表示され、メニュー操作に支障がない

## 受け入れ基準
- [x] 左メニューの最上部にロゴ画像と JushoAI の表示がある
- [x] ロゴのリンク先は `https://armaniacs.github.io/jushoai/` である
- [x] リンクは新しいタブで開く（`target=_blank` + `rel=noopener`）
- [x] ダークモードの見た目を壊さない

## テスト戦略
- E2E: 設定ページを開きロゴリンクを目視する（手動）
- 統合: リンク先が `issues/new` ではなく Pages の URL である
- 単体: `buildNav` が生成するブランド部の href・target・rel のテスト

## 見積もり
1pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストまたは手動確認でパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（設定画面の専用 doc がないためコードとテストのみ）
