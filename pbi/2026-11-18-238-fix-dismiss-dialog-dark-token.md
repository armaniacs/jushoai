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
- [ ] OVERLAY_CSS のトークン宣言（または overlay.ts から SHADOW_TOKENS として切り出した定数）を本ダイアログの `<style>` に足す
- [ ] .box の色を `var(--jushoai-panel-bg)` 等に置き換え、`prefers-color-scheme` 上書きが効く
- [ ] ライト・ダークの見た目を samples で手動確認する（手順を PBI に記録）
- [ ] `make check` が緑

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
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
