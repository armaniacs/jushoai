# PBI: ダークモード対応（content script 側 UI の auto-follow）

## ユーザーストーリー
OS をダークモードで使う利用者として、ページ上の JushoAI のバナーとパネル（プレビュー、AIガイド、確認ダイアログなど）が OS の見た目設定に自動で追従してほしい、なぜなら白固定の UI が暗いページでまぶしく、フォームと重なったときの可読性と見た目の一体感を損なうから

## 優先度
- 順位: 6 / 6
- RICEスコア: 6.4（Reach=0.4 / Impact=1 / Confidence=80% / Effort=0.5人週）
- 根拠: cosmetic polish。options/popup は dark 対応済みで、残る content UI（Shadow DOM パネル）の変数化が本 PBI。手動切替はスコープ外（別 PBI）

## 出どころ
- Content script UI（closed Shadow DOM パネル + floating button）は固定 hex のインライン CSS（createElement('style')）で light 固定: 共有の継ぎ目は OVERLAY_CSS（src/ui/overlay.ts:14-23 の .panel が #fff/#1a1a1a/#c8ccd4、button が #f4f5f8、primary が #2457d6）で、変数ブロックを置く1箇所。floating button バナー（src/ui/button.ts:44-70 の rgba(36, 87, 214, 0.9)/#1c46b3/#b3261e/白バッジ）は OVERLAY_CSS に依存しない。各パネルにも固定 hex が散在: preview.ts:90-113 と 220-222（#eceef2/#5a6270/#b3261e/#8a4fd6/#f1f3f7 など）、ai-guide.ts、confirm-dialog.ts:63,88、guest-panel.ts:62、egress-panel.ts:66、mapping-panel.ts:55、fill-one-panel.ts:31
- options と popup は dark 対応済み（src/entrypoints/options/index.html:9-10、src/entrypoints/popup/index.html:7-8 の `color-scheme: light dark` + `@media (prefers-color-scheme: dark)`）。docs サイト（site/assets/site.css:3-12）の dark 既定 + light 上書きの変数テーマがモデル
- 制約: host が `all: initial !important`（src/ui/host.ts:23,26）のためページ側の `:root` 変数は shadow 側へ継承しない → トークンは shadow root 内の `<style>` に定義する。色を assert するテストの更新が要る: tests/ui/button.test.ts:292,294,299（正規表現の color assert）、tests/e2e/scenarios.ts:396（rgba の厳密 assert。computed value は `var()` を解決するため影響しない見込みだが要確認）
- 解決済みの疑問（why-why）: 手動切替はスコープ外。cosmetic 機能に設定フィールド、options UI、content script への設定取得経路を増やさない（auto-follow のみ）。必要になれば別 PBI。dark 版バナーのコントラストは PBI-162 同様 WCAG AA（4.5:1）を手動確認で検証。拡張横断の palette 統一は OVERLAY_CSS が集約点なので「shadow root 内1箇所の定義 + 各パネルの変数参照」で始める

## BDD受け入れシナリオ
Scenario: dark OS でバナーとパネルが暗色になる
  Given OS がダークモード（prefers-color-scheme: dark）に設定されている
  When フォームページで「JushoAI で入力」を押してプレビュー パネルを開く
  Then パネルの背景と文字が dark パレットで描画され、文字色のコントラストは WCAG AA（4.5:1）以上になる
  And floating button バナーも dark パレットで描画される

Scenario: light OS では見た目が変わらない
  Given OS がライトモード（prefers-color-scheme: light）に設定されている
  When フォームページで「JushoAI で入力」を押してプレビュー パネルを開く
  Then パネルとバナーの見た目は本 PBI 以前の light 表示と同一である

## 受け入れ基準
- [ ] shadow root 内の `<style>` に CSS 変数トークン（背景、文字、罫線、primary など）が定義され、content UI の全パネルがその変数を参照する
- [ ] shadow root 内の `<style>` に `@media (prefers-color-scheme: dark)` の dark パレットがある。手動切替の設定フィールドは作らない
- [ ] floating button バナー（src/ui/button.ts）も dark パレットに追従する
- [ ] dark 版の文字色コントラストが WCAG AA（4.5:1）以上であることを手動確認する
- [ ] tests/ui/button.test.ts の色 assert が新しいトークン構造に更新されパスする
- [ ] tests/e2e/scenarios.ts:396 の rgba assert への影響を確認し、必要なら更新する
- [ ] light モードの見た目が変更前と同一であることを samples で目視確認する
- [ ] make check がパスする

## 実装手順
- src/ui/overlay.ts の OVERLAY_CSS を変数ブロックに改める: shadow root 内でのトークン定義（light 初期値）と `@media (prefers-color-scheme: dark)` の dark 上書き。site/assets/site.css の変数テーマをモデルにする
- src/ui/button.ts:44-70 の固定 rgba/hex を変数参照に置き換える（バナーは OVERLAY_CSS と別の shadow root のため、この `<style>` 内でもトークンを定義する）
- 各パネル（preview.ts、ai-guide.ts、confirm-dialog.ts、guest-panel.ts、egress-panel.ts、mapping-panel.ts、fill-one-panel.ts）の固定 hex を変数参照に置き換える
- tests/ui/button.test.ts:292,294,299 の色 assert を更新する
- tests/e2e/scenarios.ts:396 の rgba assert への影響を確認し、必要なら更新する
- make dev で samples を light/dark 両方で目視確認する

## テスト戦略
- 単体: tests/ui/ の色 assert 更新（トークン定義と dark 上書きが `<style>` 内に在ることを固定）
- E2E: tests/e2e/scenarios.ts の rgba assert 影響確認（getCssValue は computed value を返し `var()` を解決するため影響しない見込み、要検証）
- 手動: samples で dark OS 下の目視確認（dark 版バナーのコントラスト WCAG AA 4.5:1 の確認を含む）

## 見積もり
0.5人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
