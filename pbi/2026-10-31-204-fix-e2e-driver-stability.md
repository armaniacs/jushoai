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

## 実装記録（2026-10-31）

### 実装内容

- 版数整合の事前検査（fail-fast）を tests/e2e/harness.ts の startChromeDriver に追加した。
  - 判定ロジックは tests/e2e/driver-version.ts に純粋関数として切り出した（parseMajorVersion / driverVersionStatus / driverVersionFailureMessage）。比較は major 版のみで、Selenium Manager が fresh なキャッシュに解決する 156.0.8078.80 と実 Chrome 156.0.8078.76 を「整合」と扱う。
  - 不一致・取得不能のときは、両 major 版と解決済みバイナリのパス、修復手順（SE_CACHE_PATH を新しいキャッシュに向けてネットワーク付きで再実行 / JUSHOAI_DRIVER_DOWNLOAD=1 の opt-in ダウンロード / npx @puppeteer/browsers install chromedriver@<major> / CHROMEDRIVER_BIN での明示 / Chrome 側の major 揃え）を示したメッセージで失敗する。古いキャッシュへの黙ったフォールバックはしない。
  - Chrome 側にも Firefox の FIREFOX_BIN に相当する上書き経路を足した（CHROME_BIN。候補は macOS 固有パスと CI ランナーの Debian/Ubuntu パス）。CHROMEDRIVER_BIN でもドライバを明示できる。
  - 整合していた場合は、検証済みのバイナリを ServiceBuilder 経由でセッションに渡す。build() 内の 2 回目の Selenium Manager 解決をスキップするので、検証したバイナリがそのまま使われる。
- SE_CACHE_PATH をリポローカル（tmp/selenium-cache/）に寄せる配線を harness に足した。未設定のときだけ harness が設定し、明示設定は尊重する。stale だった ~/.cache/selenium/ の 154 はこの配線で参照されなくなる。harness で配線したのは make e2e-chrome でも vitest の直接実行でも効くため（Makefile 配線は make 経由に限定される）。
- 自動ダウンロードは JUSHOAI_DRIVER_DOWNLOAD=1 で opt-in の経路を足した。Selenium Manager が解決できないとき、npx @puppeteer/browsers install chromedriver@<major> で一致版を取得し ServiceBuilder 経由で渡す（ネットワーク要求になるため opt-in）。Selenium Manager 自身のダウンロードは既存の解決経路そのままで、opt-in にはしていない。
- CI Chrome E2E の ElementClickInterceptedError 対処: 失敗 test は CI ログ（job 123974733509、2026-10-30T08:51 の main 実行）から確定した。`chrome: float notice behavior (PBI-165) > keeps the error until closed` の scenarios.ts saveProfileButton（保存）クリックが (280, 86) で横取りされ、別の `<button type="button">` がクリックを受け取っていた。横取り要素は初回向けガイドの浮遊表示と推定（後述の通り座標の再現はローカルで不能）。最後のプロファイルを削除すると guideTrialMode が 'profile' に戻り、ガイドが固定表示（position: fixed + z-index: 1000）でページ最上部に再出現する。シナリオの trial 段階ではガイド自身のボタン（trialBothButton）が必要なため、一時非表示はガイドが役目を終えた後、保存ボタンを触る直前に dismissGuideIfPresent（× クリック、dismissGuideForSession の経路）で行う。本物のユーザー操作に合わせた対処で、プロダクトは弱めていない。

### 検証結果

- 単体: tests/e2e/driver-version.test.ts を先に追加して RED（Failed to resolve import "./driver-version"）を確認し、実装後に GREEN（13 tests）。make test も 2221 passed + 1 expected fail で従来どおり。driver-version.test.ts は vitest.config.ts の tests/**/*.test.ts で回り、chrome-flags.test.ts（7 tests）と同じ配線。
- 型検査: npm run typecheck（tsc --noEmit）は clean。
- make test-build: 24 tests passed。両ブラウザの manifest 検査に影響なし。
- ローカル Chrome E2E: HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome で 24 tests passed。ガイドの一時非表示の修正の有無で両方緑だった（後述の通りローカルでは横取りが再現しない）。E2E_NO_SANDBOX=1 はこの制限付きサンドボックス環境（ブラウザサンドボックスが使えない）でのみ必要で、通常のローカルや CI では不要。
- 版数 preflight の実測: 実 Chrome 156.0.8078.76、Selenium Manager が fresh な SE_CACHE_PATH に解決した chromedriver は 156.0.8078.80（major 一致、preflight を通ってセッションが作られた）。~/.cache/selenium/chromedriver/mac-arm64/154.0.8037.92/ の stale キャッシュは参照されなくなった。

### ローカルで確認できたこととできなかったこと

- できたこと: 版数 preflight と SE_CACHE_PATH 配線の実動作（24 tests が最後まで緑）、単体 test の RED から GREEN、型検査、make test-build、stale キャッシュ遮断の実測。
- できなかったこと（CI で確認するもの）: CI の e2e ジョブ chrome マトリクスの緑。修正は push + PR 後でしか確認できない。(280, 86) の横取りのローカル再現もできなかった。macOS は CI（ubuntu）とフォントメトリクスが違い、保存ボタンが viewport 最上部に来る座標がずれるためで、修正の妥当性は CI ログのスタックトレース（saveProfileButton のクリック）と、ガイド再出現のコード経路（guideTrialMode → guideState → showGuide、index.html の fixed + z-index 1000）の読み合わせに依る。横取り要素の特定は推定のまま。
