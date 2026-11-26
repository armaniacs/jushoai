# リリース手順

## 事前確認

1. `make check`（typecheck + test + build）が通る
2. `make site` が通る
3. `samples/` のサンプルフォームで、入力とプレビューを手動確認する
4. `package.json` の `version` と `CHANGELOG.md` の見出しを、リリースするバージョンにする

## GitHub Release

タグを push しても Release はすぐには作られない。`.github/workflows/release.yml` は
build と submit の 2 job に分かれている。build job は資格情報を持たないため承認なしで
そのまま実行され、submit job は environment `release` に束ねられているため、ストア資格情報の
使用には人の承認が必要である（承認前に資格情報が使われることはない）。

1. `package.json` の `version` と CHANGELOG の `## [X.Y.Z]` 節を整えて、main にコミットする
2. 注釈付きタグを作って push する（タグ名は `vX.Y.Z`。署名は必須ではない）
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main vX.Y.Z
   ```
3. build job がすぐ実行される。タグと `package.json` の version の一致を確かめ、`make check`、
   `make zip`、`make zip-firefox` を実行する。続いて zip の SHA256SUMS を作り、zip 群・
   SHA256SUMS・リリースノートを upload し、zip の来歴証明を付ける（`gh attestation verify` で
   このリポジトリの Release ワークフローで作られたことを確かめられる）
4. submit job は environment `release` の承認待ちで止まる。GitHub の Actions
   実行画面で内容を確認し、承認する（却下した場合は Release を作らずに終了する）
5. 承認後、submit job が成果物を受け取り、`sha256sum -c` で照合してから
   `publish-browser-extension` で Chrome・Edge・
   Firefox の 3 ストアへ審査提出する（詳細は下の「ストア自動提出」）。提出が成功したら
   CHANGELOG の該当節を本文にして、
   `jushoai-X.Y.Z-chrome.zip`、`-firefox.zip`、`-sources.zip`、`SHA256SUMS` を添付した
   Release を作る。提出に失敗したときは Release を作らずに失敗する（半端な Release を残さない順序）
6. main への push で、GitHub Pages のワークフローがサイトをデプロイする。`https://armaniacs.github.io/jushoai/` を開き、日英のトップとライセンスのページ、Issue ボタンのリンク先を確認する

CHANGELOG に該当節がない、またはタグと version が違うときは、Release を作らずに失敗する。ローカルで本文を確認するには `node scripts/release-notes.mjs X.Y.Z`。

## ストア自動提出（publish-browser-extension）

運用手順の全体は [store-submit.md](store-submit.md) にある（初回セットアップ・通常リリース・
ストアごとの違い・失敗時の対処）。ここは仕組みの要点だけを残す。

`release.yml` の submit job は、固定版の `publish-browser-extension` 6.2.0 だけを
別の作業ディレクトリに入れて直接呼ぶ。`npx wxt submit` が委譲する先と同じバイナリのため、
同じ env 変数で等価であり、プロジェクトの依存は入れない（依存コードが資格情報に触れない）。
3 ストアは `Promise.allSettled` で並行提出されるため、1 件の失敗が
他の提出を止めない。失敗したストアはログで判別できる。いずれも審査通過後は自動公開する
（下書き止めの `skip-submit-review` 系は付けていない）。

### Secrets（environment `release` に登録）

| 変数 | 用途・取り方 |
|---|---|
| `CHROME_EXTENSION_ID` | 拡張 ID（ストア URL 末尾の32文字） |
| `CHROME_PUBLISHER_ID` | 開発者ダッシュボードの URL（`devconsole/<ID>`）に表示される公開者 ID |
| `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` | GCP（プロジェクト `jushoai-store`）のサービスアカウントの client email |
| `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | 同 private key。JSON 内の `\n` 表記ではなく**実際の改行入り**で登録する（手順は store-submit.md） |
| `EDGE_PRODUCT_ID` | Partner Center のダッシュボードに表示される Product ID |
| `EDGE_CLIENT_ID` | Partner Center の「API を公開する」で発行した Client ID |
| `EDGE_API_KEY` | 同時に発行した API キー |
| `FIREFOX_EXTENSION_ID` | `jushoai@armaniacs.github.io`（`wxt.config.ts` の gecko id と同じ） |
| `FIREFOX_JWT_ISSUER` | AMO の API キー発行画面の JWT issuer |
| `FIREFOX_JWT_SECRET` | 同 JWT secret |

Chrome は API v2＋サービスアカウントを使う（`CHROME_API_VERSION=v2`）。
組織ポリシー（iam.disableServiceAccountKeyCreation）はプロジェクト `jushoai-store`
に限ってオーバーライドで無効化済み。API v1.1＋OAuth は 2026-10-15 で Google が
停止するため使わない（経緯は store-submit.md）。
`FIREFOX_CHANNEL` は `listed` 固定。Edge は Chromium 系のため Chrome 向け zip をそのまま使う。

### ローカル確認（dry-run）

`.env.submit` は git 管理外（`.gitignore` 済み）。テンプレートは `.env.submit.example`。

```bash
cp .env.submit.example .env.submit  # 値を埋める。ZIP の版数も合わせる
make zip && make zip-firefox
npx wxt submit --dry-run  # 認証のみ確認し、zip は送らない
```

### CI での確認（dry-run）

本番タグ `v*` の push は実提出になるため、CI の検証はタグを打たずに
`workflow_dispatch` で行う。`dry_run` 入力（初期値 true）のまま実行すると、
submit job は `--dry-run`（認証確認のみ）で走り、Release は作られない。
承認ゲート自体は残るため、submit job の承認は必要である。

```bash
gh workflow run release.yml --ref <ブランチ名> -f dry_run=true
```

### 再実行手順

- 提出失敗時は Release が作られていないため、原因（Secrets 不足・審査リジェクト・保留中審査との競合等）を
  解消してワークフローを再実行する（タグの打ち直しは不要）。
- Chrome で保留中の審査と競合するときは、次回リリースで `--chrome-cancel-pending` の要否を判断する。
- 成功済みストアへの二重提出を避けたいときは、Actions のログで成功分を確認してから再実行する
  （失敗分だけ直して全体を回し直す運用）。

## リポジトリ設定（GitHub の設定画面での手作業）

以下の設定はソースでは強制できず、リポジトリ側の設定である。リリースを出す前に状態を確認すること
（`gh api repos/armaniacs/jushoai/environments` と `gh api repos/armaniacs/jushoai/rulesets`）。

現在の状態（2026-10-12）:

- environment `release` を作成済みで、required reviewers に `armaniacs` を設定している
  （Settings → Environments → `release` → Required reviewers）。これによりタグ push だけでは
  Release は作られず、Actions の画面で承認するまで job は待機する。`prevent_self_review` は
  false なので、タグを push した本人も承認できる（単独メンテナでリリースを止めないため）
- `v*` タグを ruleset で保護済み。設定は: 名前 `Protect release tags`、対象 `tag`、
  パターン `refs/tags/v*`、規則は作成・更新・削除の制限、bypass は maintainer（`armaniacs`）
  のみ。これにより maintainer 以外は `v*` タグを作成・移動・削除できない
- タグの署名は必須としない（2026-10-12 に方針変更）。リリースタグは注釈付きタグ
  （`git tag -a`）で作り、タグ名が `package.json` の `version` と一致することを release
  workflow が検査する。署名したい場合は `git tag -s` を使ってもよいが、承認の前提条件には
  しない。GPG 鍵を持たない環境でもリリースを止めないための判断である
- 可能であれば、タグが main の履歴に含まれること（ancestry）をリリース前に確認する
  (`git merge-base --is-ancestor vX.Y.Z main`)。main 外のコミットを指すタグの承認は行わない

## ストア公開の準備

掲載文、権限の利用理由、データ使用の申告は `docs/store-listing.md` にまとめている。提出物は `make zip` が作る `dist/jushoai-X.Y.Z-chrome.zip`。

- 必要な画像: スクリーンショット（1280x800 または 640x400）、小プロモタイル（440x280）
- プライバシーポリシー: ドキュメントサイトの `guides/privacy/`（日英）
- 掲載状況: Chrome ウェブストア（2026-10-10）、Edge アドオン（2026-10-12）、Firefox アドオン（AMO、2026-10-12）。どの URL も `docs/store-listing.md` にある。Edge は Chromium 系のため、Chrome 向けの zip をそのまま提出する。Firefox アドオンへの提出は `make zip-firefox` の zip と sources.zip を使う

## 郵便番号辞書の更新（年 1 回程度）

郵便番号の補助候補の表（`src/core/zip-dict-data.ts`）は、日本郵便の公開データから作る。日本郵便は月 1 回程度データを更新するが、3 桁 prefix の対応が変わることはまれなため、JushoAI では年 1 回程度の更新で足りる。新設の住宅地などで候補が出ない報告があれば、その都度更新する。

配布形態（2026-11-27 確認）: 日本郵便のサイト再構築で配布パスが移動し、旧パス（`https://www.post.japanpost.jp/zipcode/dl/oogaki/zip/`）は恒久 404（全員に。WAF 遮断ではなかった）。現行の配布ページ（`https://www.post.japanpost.jp/service/search/zipcode/download/oogaki-zip.html`）からは**都道府県別 47 ファイル**（新パス配下）と月次差分（`add_`/`del_`）、全国一括 `ken_all.zip`（新パスで存続）が取得できる。年 1 回の更新では 47 ファイルを使う（単一 URL 依存を避ける。スクリプトは 1 件でも取得に失敗すると書き出さない）。

手順は次のとおり。

1. 47 ファイルを取得する。取得できる環境では引数なしの `npm run zip-dict` が 47 ファイルを取得・マージする（1 件でも失敗したら何も書き出さない）。ブラウザ等で保存した場合はディレクトリにまとめて `npm run zip-dict -- --input <保存先ディレクトリ>`（`--input <zip>` の繰り返し指定も可）。マージは常にファイル名の辞書順で、同じ入力セットからは同じ表が出る（バイト同一）。
2. 生成物の統計（ファイル数・行数・範囲数・除外数）を確認し、`git diff --stat` で表の差分を見る。除外された prefix（複数の都道府県にまたがる 3 桁）は候補が出ず警告のままになるため、件数と内容を PBI-286 の実装記録に残す。
3. `make check`（`tests/build/zip-dict-size.build.ts` が表 200KB 以下と content script 350KB 以下を検査する）を通す。
4. 表の更新はコードの変更と分けてコミットする（例: `feat(zip): 郵便番号辞書を都道府県別データで更新する`）。

いまの表は東京 23 区と主な都市のシードのままである。データを取得できない環境では seed を残し、PBI-286 の引継ぎに記録する（やっていないことをやったと書かない）。

## 0.2.0 リリースゲート (PBI-282)

`0.2.0` を版付けする前に、下の項目をすべて満たすこと。未完了の項目がある間は版付けを見送り、どの項目が残っているかをこの一覧で確かめる。

- [x] `make check-all` が緑（両ブラウザの E2E を含む）
- [x] `make eval` の pin が緑
- [x] PBI-276（統合後の再スキャン）の結果が出て、指摘の扱いが決まっている
- [ ] 1.0 必須の PBI が完了している（274 release 分離、275 報告方針、277 依存監視、281 manifest 検査、283 保存形式の互換性）（275 / 277 / 281 / 283 は完了。274 の CI dry-run の実行と environment 承認が残る）
- [x] ストア掲載文とプライバシー文書の整合を確認している（`docs/store-listing.md` とサイトの privacy 日英）
- [x] CHANGELOG に `0.2.0` 節がある
- [x] 未マージの作業ブランチが無い（統合の記録は PBI-282 の「実装記録」を参照）

状態（2026-11-27 再確認）: `make check-all` が緑（2026-11-27 実行。check は 197 ファイル / 3403 passed + 期待失敗 1、site は 32 ページ、e2e-firefox 25/25、e2e-chrome 28/28）。版付け時（Task 16）に既知の失敗として残っていた chrome の translucent banner 1 件は、ライトセッションが OS の外観（dark モードの Mac）に従うことが原因で、ライト側にも BiDi メディアオーバーライドでカラースキームを pin する修正（tests/e2e/harness.ts）で解消した。`make eval` は pin 緑。276 は完了（新規 0 件、前回 4 件は修正 3・受容 1、要約は CHANGELOG の 0.2.0 節）。275 / 277 / 281 / 283 は完了（2026-11-27 にアーカイブ）。残る未達は 274 の CI dry-run（`gh workflow run release.yml --ref <ブランチ> -f dry_run=true` の実行と submit の environment 承認。ユーザー作業）のみで、これが済めば 7 項目すべてにチェックが付く。ストア掲載文と privacy 日英・権限は一致。CHANGELOG に 0.2.0 節あり。旧作業ブランチ 4 本は origin/main に統合済み。

## 版方針

バージョンは semver（major.minor.patch）に従う（CHANGELOG の冒頭の宣言どおり）。

- 正式版 `0.2.0` の後は、拡張の major が同じ間は保存形式の読み書き互換を保つ。minor と patch では保存形式を壊さない。
- 保存データと JSON エクスポートは形式の版番号（`src/storage.ts` の `FORMAT_VERSION`、初期値は 1）を持つ。版番号の無い既存データは版 0 として読み込む。
- 版番号が `FORMAT_VERSION` より新しい保存データも読み込める。既知の項目は通常どおり動作し、未知の項目と版番号は編集・保存の往復で保持され、設定ページの転送の節に更新を促す表示が出る。
- JSON ファイルの取り込みは、形式の版が新しすぎる場合は理由を添えて拒否する。版番号の無い 1.0 以前のエクスポートは受け入れる。
- 版上げの手順と形式の来歴は PBI-283 の「実装記録」に残す。転送の設計書（`docs/superpowers/specs/2026-10-21-profile-transfer-design.md`）の版管理の節も参照する。
