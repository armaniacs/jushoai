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
- [x] shadow root 内の `<style>` に CSS 変数トークン（背景、文字、罫線、primary など）が定義され、content UI の全パネルがその変数を参照する
- [x] shadow root 内の `<style>` に `@media (prefers-color-scheme: dark)` の dark パレットがある。手動切替の設定フィールドは作らない
- [ ] floating button バナー（src/ui/button.ts）も dark パレットに追従する
- [ ] dark 版の文字色コントラストが WCAG AA（4.5:1）以上であることを手動確認する
- [x] tests/ui/button.test.ts の色 assert が新しいトークン構造に更新されパスする
- [x] tests/e2e/scenarios.ts:396 の rgba assert への影響を確認し、必要なら更新する
- [x] light モードの見た目が変更前と同一であることを samples で目視確認する（light 既定値の pin と light ルール不変をテストとレビューで確認済み。OS での目視再確認は下記手動確認 2 に残す）
- [x] make check がパスする

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

## 実装記録（2026-10-31）

### 方針

- auto-follow のみ。手動切替の設定フィールド、options UI、content script への設定取得経路は追加していない。
- トークンは shadow root 内の `<style>` に定義する。host 要素の `all: initial !important` は custom properties をリセットしないため、shadow スタイルシートの `:host` ルールで宣言した変数は shadow ツリー内へ継承する（ページ側の `:root` 変数は届かない）。
- light 既定は現行の hex と同一（light OS での見た目は不変）。`@media (prefers-color-scheme: dark)` での上書きのみで切る。
- `color-scheme` は real property のため `:host` 宣言は host の inline `all: initial !important` に負ける。そこで `.panel` ルール内の `all: initial` の後に `color-scheme: light` を宣言し、dark では `.panel { color-scheme: dark; }` を上書きする（ネイティブの select / input / checkbox もテーマに追従する）。

### 変数マッピング

OVERLAY_CSS（src/ui/overlay.ts）に共通トークン 15 個、button.ts にバナー専用トークン 4 個を定義し、各パネルの固定 hex を変数参照へ置き換えた。

| トークン | light | dark | 参照箇所 |
| --- | --- | --- | --- |
| --jushoai-panel-bg | #fff | #212530 | .panel 背景（全パネル） |
| --jushoai-panel-fg | #1a1a1a | #e8eaf0 | .panel 文字（全パネル） |
| --jushoai-border | #c8ccd4 | #3a4152 | .panel と button の罫線 |
| --jushoai-button-bg | #f4f5f8 | #2b303c | 二次ボタン背景 |
| --jushoai-primary | #2457d6 | 変更なし | button.primary 背景と罫線 |
| --jushoai-primary-fg | #fff | 変更なし | button.primary 文字 |
| --jushoai-muted | #5a6270 | #a3abbd | preview の .label 等、guest .gfield、mapping .mfield、fill-one .field |
| --jushoai-divider | #eceef2 | #2f3441 | preview li の下罫線 |
| --jushoai-danger | #b3261e | #ff8a80 | preview .note |
| --jushoai-chip-bg | #f1f3f7 | #262b36 | preview .fix 背景 |
| --jushoai-chip-border | #dfe3ea | #3a4152 | preview .fix 罫線 |
| --jushoai-ai-bg | #8a4fd6 | 変更なし | preview .ai 背景 |
| --jushoai-ai-fg | #fff | 変更なし | preview .ai 文字 |
| --jushoai-warn | #8a4b00 | #ffb74d | egress .egress-row.suspect |
| --jushoai-input-border | #cfd6e0 | #565e70 | guest .gfield input の罫線 |
| --jushoai-banner-bg | rgba(36, 87, 214, 0.9) | rgba(28, 45, 100, 0.9) | バナー背景（button.ts） |
| --jushoai-banner-fg | #fff | 変更なし | バナー文字（button.ts .wrap、レビュー対応で追加。両テーマ同値のため dark エントリなし） |
| --jushoai-banner-bg-active | #1c46b3 | #1e3a8a | バナー hover / focus / active |
| --jushoai-banner-error-bg | #b3261e | 変更なし | バナーのエラーバッジ背景 |

- 対応する汎用変数に寄せると light の値が変わる色は、専用変数にした（--jushoai-divider、--jushoai-chip-bg、--jushoai-chip-border、--jushoai-ai-bg / --jushoai-ai-fg、--jushoai-warn、--jushoai-input-border）。
- ai-guide.ts と confirm-dialog.ts は固有色を持たない（色はすべて OVERLAY_CSS から受ける）ため、コード変更はなし。
- バナーの badge 半透明オーバーレイ（rgba(255,255,255,.22) と rgba(0,0,0,.3)）は両テーマで白文字が読めるため変数化していない（dark バナー上でも白文字とのコントラストは下がらない）。

### dark パレットの選色根拠

dark パネル背景 #212530（相対輝度 0.019）に対する文字色のコントラスト比（WCAG の相対輝度定義に基づく計算値。実ブラウザでの実測は手動確認に譲る）:

- --jushoai-panel-fg #e8eaf0: 12.7:1
- --jushoai-muted #a3abbd: 6.7:1
- --jushoai-danger #ff8a80: 6.7:1
- --jushoai-warn #ffb74d: 8.8:1
- --jushoai-primary #2457d6（白文字）: 6.2:1 - dark でも値を変えずに AA を満たすため既定値のまま
- --jushoai-ai-bg #8a4fd6（白文字）: 5.0:1 - 同上

バナー（白文字 13px 600、badge 11px 400）:

- dark 既定 rgba(28, 45, 100, 0.9) は、白ページの上に 0.9 アルファで重なったとき rgb(51, 66, 116) に合成され、白文字に対して 9.7:1（WCAG AA 4.5:1 以上）。黒ページの上では 13.9:1。白ページが白文字にとって最悪の背景なので、この合成値を基準に選んだ。
- hover / focus / active の #1e3a8a は白文字に対して 10.4:1（light の #1c46b3 より暗い方向は現行と同じ）。
- エラーバッジの #b3261e は白文字に対して 6.6:1 - 両テーマで同一値（light バナー上でのコントラスト比 1.2:1 より dark バナー上の 1.5:1 の方が分離は上なので、dark での変更はしない）。

### テスト

- TDD-first: tests/ui/overlay.test.ts と tests/ui/button.test.ts にトークン構造の assert（light 既定値の pin と `@media (prefers-color-scheme: dark)` の存在）を先に追加して red を確認し、実装後に green を確認した。
- tests/ui/button.test.ts の 3 つの色 assert は、.wrap と .badge の background が var() 参照になったことに合わせて更新し、light 既定値（rgba(36, 87, 214, 0.9) / #1c46b3 / #b3261e）を pin する assert を足した。既存 assert の意図（半透明 0.9、badge の色固定）は維持。
- tests/ui/overlay.test.ts の既存の構造 assert（.panel { など）は変更せず green のまま。
- tests/e2e/scenarios.ts:396 の rgba assert は、getCssValue が var() を解決した計算値を返し light 既定値が変わらないため変更していない。実装時の make e2e-chrome は制限付きサンドボックスでは E2E_NO_SANDBOX=1 が渡らず、24 テストすべて skip で green 判定は実行を伴わなかった。その後 20e1235 HEAD で `HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome` を再実行し、24/24 green（scenarios.ts:396 の rgba assert を含む）を確認した。
- make test（174 ファイル 2233 テスト）と make check が green。
  - 注: 2233 は expected fail 1 件（tests/ai/loopback-octet-range.test.ts の it.fails）を含まない passed 数。末尾の検証の 2235+1 は fix wave でテストを 2 件追加した後の計測で、2235 passed + 1 expected fail = 総数 2236（時点の違い）。

### 手動確認が必要なこと

1. dark OS（macOS のシステム設定をダークへ変更）で `make dev` を実行し、samples/split-form.html を開いて「JushoAI で入力」を押す。
   - 期待: プレビュー パネルの背景が #212530、文字が #e8eaf0。select と checkbox も dark で描画される。
   - 期待: バナーは暗青（rgba(28, 45, 100, 0.9)）、hover / focus / active で #1e3a8a。エラーバッジは #b3261e のまま白文字が読める。
2. light OS に戻して同じ手順を実行し、本 PBI 以前の見た目（白パネル、#2457d6 の primary ボタン、rgba(36, 87, 214, 0.9) のバナー）と同一であることを確認する。
3. dark パネルと dark バナーの文字色コントラストを WCAG AA（4.5:1）で実測する（DevTools のコントラスト表示等）。上記の数値は手計算で、実測はこの項目で確定させる。

### レビュー対応（2026-10-31、Important 2 件）

1. カスケード順の不具合: dark 上書きメディアブロック内の `.panel { color-scheme: dark; }` が、後続のメイン `.panel` ルール（末尾に `color-scheme: light`）より前にあった。両ルールは詳細度 (0,1,0) で同順のため、後ろの light が light/dark 両モードで勝ち、dark OS でもパネルの color-scheme が light に固定されていた。ネイティブの select / input / checkbox が dark パネル上で light のまま描画され、手動確認の期待「select と checkbox も dark で描画される」を満たさない。
   - 修正: `.panel { color-scheme: dark; }` を OVERLAY_CSS 末尾の 2 つ目の `@media (prefers-color-scheme: dark)` ブロックへ移し、メインの `.panel` ルールより後に置いた。メインの light ルールは変更せず、light モードの見た目は不変。
   - 回帰テスト: tests/ui/overlay.test.ts に順序 assert（dark の color-scheme ルールの位置がメインルールの `color-scheme: light` の位置より後であること）を追加し、修正前に red（`expected 1696 to be greater than 2317`）、修正後に green を確認した。
2. 実装記録の e2e 記載を実態に合わせて修正した（上記テスト節の該当行）。実装時の make e2e-chrome は制限付きサンドボックスで E2E_NO_SANDBOX=1 が渡らず 24 テストすべて skip で、green は実行を伴わなかった記載になっていた。green は 20e1235 HEAD での `HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome` 再実行によるもので、記録をその事実に直した。

あわせて Minor を 2 件処理した。

- button.ts の `.wrap` の `color: #fff` を `--jushoai-banner-fg` トークンへ寄せ、tests/ui/button.test.ts に pin を追加した。テーマ不変（dark エントリなし）でバナーの見た目は不変。
- tests/ui/overlay.test.ts の dark トークン pin を 2 個から OVERLAY_CSS の 11 個すべてのループへ拡張した（button.ts 側の dark 2 個は既存テストが pin 済み）。

フォローアップ（未対応、次の機会に）:

- overlay.test.ts / button.test.ts の dark ブロック位置取得が `indexOf` の文字列スライスに依存している。今回の修正で OVERLAY_CSS には dark メディアブロックが 2 つになったが、dark トークンは 1 つ目のブロックのみにあり、スライスは先頭のブロックから文字列末尾までを取るため現行は正しく動く。ブロック単位のパースへ置き換えると配置変更に強くなる。

修正後の検証: npx vitest run tests/ui/overlay.test.ts（8 テスト green）、make test（174 ファイル 2236 テスト、2235 green、expected fail 1 件は従来どおり）、make check（exit 0）、`HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome`（24/24 green、scenarios.ts:396 の rgba assert を含む）。

台帳注記（2026-10-31、なぜなぜ分析の合意実行）: 受け入れ基準のうちテストとレビューで検証済みのものを [x] 化した（token 定義・dark パレット定義・button.test.ts の色 assert・scenarios.ts:396 の影響確認・light モード不変・make check）。floating button バナーの dark 描画と dark 版コントラストの AA 実測は dark OS での目視確認のため [ ] のまま残す（手動確認 1 と 3、ユーザー作業）。light モードの samples 目視（基準 7）は light 既定値の pin とレビュー確認で [x] 化し、OS での目視再確認は手動確認 2 に残す。
