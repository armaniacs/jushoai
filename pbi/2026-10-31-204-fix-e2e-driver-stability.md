# PBI: E2E 環境の安定化 ― ChromeDriver と Chrome の版数整合 + CI Chrome E2E ジョブの修正

## ユーザーストーリー
このリポジトリで拡張機能を開発するエンジニアとして、ローカルと CI のどちらでも Chrome の E2E が安定して実行され、失敗したときは本物の回帰だけが分かるようにしてほしい、なぜなら (01)手元の Chrome と版数の違う ChromeDriver で Selenium Manager が古いキャッシュに黙って落ちて E2E がそもそも起動できず、(02)CI の main で chrome e2e が失敗し続けて gate が赤のままになり、本物の回帰が失敗のノイズに隠れるから

## 優先度
- 順位: 1 / 6
- RICEスコア: 69（Reach=10 / Impact=3 / Confidence=80% / Effort=0.35人週）
- 根拠: CI gate が今も RED（main の chrome e2e が失敗中 → 本物の回帰が隠れる）。ローカルの e2e も版数不一致で不能。blocker 解除型で最高優先。

## 出どころ
- CI: .github/workflows/check.yml:46-84 の e2e ジョブ（matrix は chrome → e2e-chrome / firefox → e2e-firefox）。main の実行（2026-10-30T08:51）で `e2e (chrome, e2e-chrome) -> failure`、firefox は success、check ジョブは success。23 passed / 1 failed
- 失敗内容: `element click intercepted: Element <button type="button">... is not clickable at point (280, 86). Other element would receive the click: <button type="button">...</button>`（ElementClickInterceptedError）。初回向けガイドの浮遊オーバーレイ（docs/superpowers/plans/2026-10-29-float-notice-layer.md で導入、tests/e2e/harness.ts:246 の guide `#float-root .float-guide`）が fresh run の options.html で操作ボタンの上に重なり、別の button がクリックを受け取ると推定
- ローカル: Selenium Manager（selenium-webdriver ^4.51.0、package.json:41）が Chrome 156.0.8078.76 に一致する 156 系の ChromeDriver を取得できず（オフライン/サンドボックス）、`~/.cache/selenium/chromedriver/mac-arm64/154.0.8037.92/` の古いキャッシュに黙ってフォールバックしてセッション構築が失敗する。一時回避は SE_CACHE_PATH を書き込み可能な新しいディレクトリに向けること（docs/superpowers/plans/2026-10-29-float-notice-layer.md:512）。Firefox 側には tests/e2e/harness.ts:15-22 の FIREFOX_BIN 候補があるが、Chrome 側（tests/e2e/harness.ts:162-174）には同種の上書き経路がない
- 運用: E2E は make test に含まれず、両ブラウザ分は make check-all（Makefile:43-54）だけで動く。CI では .github/workflows/check.yml:79-84 が HEADLESS=1 で `make ${{ matrix.target }}` を実行する

## BDD受け入れシナリオ
Scenario: 版数の合う ChromeDriver で Chrome の E2E が最後まで動く
  Given 手元の Chrome と同じ版数の ChromeDriver が用意されている
  When  開発者が Chrome の E2E を実行する
  Then  セッションが自動で作られ、全シナリオが最後まで実行されて緑になる

Scenario: 一致する ChromeDriver が用意できないとき、古いキャッシュに黙って落ちない
  Given 手元の Chrome に一致する ChromeDriver を取得できない環境にある
  When  開発者が Chrome の E2E を実行する
  Then  古いキャッシュへの黙ったフォールバックをせず、原因と版数を合わせる修復手順を示したメッセージで失敗する

Scenario: 初回向けガイドの浮遊表示が出ていても操作が通る
  Given プロファイルが空の初期状態で Chrome の E2E が動いている
  When  初回向けガイドの浮遊表示が画面に重なった状態で本体を操作する
  Then  ガイドがクリックを横取りせず、全シナリオが緑になる

## 受け入れ基準
- [ ] Chrome 側にも Firefox の FIREFOX_BIN に相当するブラウザ上書き経路があり、版数を合わせた ChromeDriver を明示して E2E を起動できる
- [ ] 一致する ChromeDriver が取得できないとき、古いキャッシュへの黙ったフォールバックをせず、修復手順を示したメッセージで失敗する
- [ ] 初回向けガイドが表示される fresh run でも、ガイドがクリックを横取りせずに E2E が最後まで緑になる
- [ ] CI の e2e ジョブ chrome マトリクスが main で緑になり、CI gate 全体が緑に戻る
- [ ] firefox の E2E と make check が従来どおり緑である（既存の緑を落とさない）

## 実装手順
- 版数整合の判定を純粋関数に切り出す: Chrome の版数と ChromeDriver の版数から「整合 / 不一致 / 取得不能」を返す関数を tests/e2e/ に足し、tests/e2e/chrome-flags.ts と同じ方式で単体テストを先に書く
- harness への配線: tests/e2e/harness.ts の startChromeDriver に、Firefox の firefoxBinary()（tests/e2e/harness.ts:20-22）と対になる CHROME_BIN 上書きを足し、セッション構築時に版数を照合する。不一致や取得不能のときは修復手順（SE_CACHE_PATH で新しいキャッシュに向ける等）を示したメッセージで失敗させ、黙ったフォールバックを禁止する
- CI の浮遊要素対策: options.html を開く共通フロー（tests/e2e/scenarios.ts）で、初回向けガイド（tests/e2e/harness.ts:247 の guideCloseButton）を閉じてから本体を操作する、またはガイドが重なっていても対象がクリックできる待ち方にする
- 検証: HEADLESS=1 make e2e-chrome をローカルで緑にする。CI で chrome / firefox 両マトリクスの緑を確認する
- スコープ外（フォローアップ候補）: Playwright への移行（video/playwright/lib.mjs が参照実装だが scenarios.ts は WebDriver 主体で大改修になる）と、Firefox 側の版数統一（Firefox はローカル/CI とも現在緑）は本 PBI では扱わない

## テスト戦略
- 単体: 版数整合の判定（整合 / 不一致 / 取得不能）を純粋関数として tests/e2e/ に追加し、全分岐を fixture で固定する（chrome-flags.test.ts と同じ方式）
- E2E: HEADLESS=1 make e2e-chrome で、初回向けガイドが表示される fresh run を含めて全シナリオが締ることを確認する。E2E は make test に含まれないため、CI の run 結果で chrome マトリクスの緑も確認する

## 見積もり
0.35（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
