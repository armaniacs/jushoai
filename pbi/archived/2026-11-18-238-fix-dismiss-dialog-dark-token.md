# PBI: dismiss-dialog をテーマトークンへ移行する

## ユーザーストーリー
OS をダークモードで使う利用者として、バナーから開くダイアログもプレビューパネルと同じ配色トークンで表示されてほしい、なぜなら PBI-209 で preview/panel は `--jushoai-*` トークンに、バナーは独自トークン+ダーク上書きに移行済みなのに、0.1.34 追加の本ダイアログだけハードコード色（#fff/#222/#ddd）のライト固定で、ダーク OS 環境ではパネルが暗色なのに本ダイアログだけ明色のまま残るから

## 優先度
- 順位: 8 / 14
- RICEスコア: 38（Reach=4 / Impact=0.5 / Confidence=95% / Effort=0.05人週）
- 根拠: 色だけの問題で構造は良好（teardown 一意化・ラジオ collapsed 判定）。トークン宣言部を共有すれば変更は小さい

## 出どころ
- checking-team 2026-11-18 ラウンド・Maintainability Guardian。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/ui/dismiss-dialog.ts:14-22（.box のハードコード色）。参照: src/ui/overlay.ts（OVERLAY_CSS の `--jushoai-*`）、src/ui/button.ts（バナー独自トークン+ダーク上書き）

## BDD受け入れシナリオ
Scenario: ダイアログがトークンで描かれる
  Given ダーク OS の環境でバナーの X を押した
  When  ダイアログが開く
  Then  パネル背景・文字・枠が `var(--jushoai-*)` トークン由来になり、preview パネルと同じ方向の配色になる

Scenario: ハードコード色がなくなる
  Given src/ui/dismiss-dialog.ts のスタイル定義
  When  色リテラルを探す
  Then  #fff/#222/#ddd の直書きがなく、トークン変数または既存トークン体系の参照になっている

## 受け入れ基準
- [x] OVERLAY_CSS のトークン宣言（または overlay.ts から SHADOW_TOKENS として切り出した定数）を本ダイアログの `<style>` に足す
- [x] .box の色を `var(--jushoai-panel-bg)` 等に置き換え、`prefers-color-scheme` 上書きが効く
- [ ] ライト・ダークの見た目を samples で手動確認する（手順を PBI に記録）
- [x] `make check` が緑

## 実装手順
- overlay.ts のトークン宣言部の共有方法を決める（全体の OVERLAY_CSS を使うか SHADOW_TOKENS として切り出すか）
- dismiss-dialog.ts の `<style>` をトークン参照に置き換える
- 既存のダークモードテスト（PBI-209 系）に合わせて pin を更新する

## テスト戦略
- tests/ui/dismiss-dialog.test.ts にトークン参照の pin（色リテラル不在）を追加
- 見た目は手動確認（OS 切替要のためユーザー作業として記録する）

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする（シナリオ1 = トークン参照+ダーク上書きの pin、シナリオ2 = 色リテラル不在の pin。見た目そのものは下記の手動確認に委ねる）
- [x] コードレビュー完了（タスクレビュー Approved・spec ✅。Critical/Important なし。Minor 3 件は下記）
- [x] ドキュメント更新済み（本 PBI に実装記録）

### レビュー記録（タスクレビュー Approved・Minor 3 件）

- WHY コメントが 2 行（brief は 1 行指定）。内容は正確で実害なし
- overlay.ts の新規コメントにタスク ID 参照 (PBI-238) が残る。グローバル規約（コメントにタスク ID を書かない）に反するため、ラウンド最終レビューの修正波で除去する
- pin 2 がダーク値 #212530 をハードコード（PBI-209 パレット改訂時に落ちるが、その変更は目視対象なので pin の歯として機能）。pin 1 は rgb()/named color を捕捉しない（#fff/#222/#ddd スコープ内では問題なし）

## 実装記録

- 実装 (2026-11-18): overlay.ts のトークン宣言部（ライト `:host` 宣言 + `prefers-color-scheme: dark` 上書き）を `SHADOW_TOKENS` として切り出し、`OVERLAY_CSS` はそれを取り込む形に整理（出力内容は不変で PBI-209 の pin は無修正で通る）。dismiss-dialog.ts は `SHADOW_TOKENS` を `<style>` の先頭に注入し、`.box` の色を `var(--jushoai-panel-bg)` / `var(--jushoai-panel-fg)` / `var(--jushoai-border)` に置き換えた。影の `rgba(0,0,0,.15)` はテーマ面色ではなく影であり、overlay `.panel` と同じ rgba 影の慣習のため据え置き。
- 共有方法の判断: OVERLAY_CSS 全体注入ではなく SHADOW_TOKENS 切り出しを採用。理由: ダイアログは overlay の `.panel` / `.actions` / `button` 規則を使わず、全体注入だと第3の shadow root へ規則全体の重複注入が増え、さらにダイアログのボタンに overlay 流の余白・枠が当たって色以外の見た目が変わるため。判断は dismiss-dialog.ts の WHY コメント 1 行に記録済み。
- テスト: tests/ui/dismiss-dialog.test.ts に pin 2 件追加（ソースに色リテラルが無いこと / 注入 style がトークン参照とダーク上書きを持つこと）。TDD RED（2 failed / 31 passed）→ GREEN（33 passed）。`make check` 緑（typecheck、187 ファイル / 3102 passed + 既知の expected fail 1、両ブラウザ build、manifest 検査 24/24、web-ext lint errors 0）。PBI-234/237 の既存 pin（タイマー・フォーカス・live region・Esc）は全件パス。
- ライト・ダークの手動確認はユーザー作業（OS 切替が必要なため自動化しない。PBI-209 の手動確認と同じ扱い）。手順: samples のサンプルフォームを開く → バナーの X で本ダイアログを出す → OS をライト/ダークに切り替え、それぞれ preview パネルとダイアログの背景・文字・枠が同じ方向に寄ることを目視確認する。
