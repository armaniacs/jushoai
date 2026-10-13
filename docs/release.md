# リリース手順

## 事前確認

1. `make check`（typecheck + test + build）が通る
2. `make site` が通る
3. `samples/` のサンプルフォームで、入力とプレビューを手動確認する
4. `package.json` の `version` と `CHANGELOG.md` の見出しを、リリースするバージョンにする

## GitHub Release

タグを push しても Release はすぐには作られない。`.github/workflows/release.yml` の
release job は environment `release` に束ねられており、Release の生成には人の承認が必要である。

1. `package.json` の `version` と CHANGELOG の `## [X.Y.Z]` 節を整えて、main にコミットする
2. 注釈付きタグを作って push する（タグ名は `vX.Y.Z`。署名は必須ではない）
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main vX.Y.Z
   ```
3. ワークフローの実行が environment `release` の承認待ちで止まる。GitHub の Actions
   実行画面で内容を確認し、承認する（却下した場合は Release を作らずに終了する）
4. 承認後、ワークフローがタグと `package.json` の version の一致を確かめ、`make check`、
   `make zip`、`make zip-firefox` を実行する。続いて `npx wxt submit` で Chrome・Edge・
   Firefox の 3 ストアへ審査提出する（詳細は下の「ストア自動提出」）。提出が成功したら
   CHANGELOG の該当節を本文にして、
   `dist/jushoai-X.Y.Z-chrome.zip`、`-firefox.zip`、`-sources.zip`（AMO 提出用）を添付した
   Release を作る。提出に失敗したときは Release を作らずに失敗する（半端な Release を残さない順序）
5. main への push で、GitHub Pages のワークフローがサイトをデプロイする。`https://armaniacs.github.io/jushoai/` を開き、日英のトップとライセンスのページ、Issue ボタンのリンク先を確認する

CHANGELOG に該当節がない、またはタグと version が違うときは、Release を作らずに失敗する。ローカルで本文を確認するには `node scripts/release-notes.mjs X.Y.Z`。

## ストア自動提出（wxt submit）

運用手順の全体は [store-submit.md](store-submit.md) にある（初回セットアップ・通常リリース・
ストアごとの違い・失敗時の対処）。ここは仕組みの要点だけを残す。

`release.yml` の Submit to stores が `npx wxt submit`（publish-extension 6.2.0 の別名）で
3 ストアへ並行提出する。3 ストアは `Promise.allSettled` で提出されるため、1 件の失敗が
他の提出を止めない。失敗したストアはログで判別できる。いずれも審査通過後は自動公開する
（下書き止めの `skip-submit-review` 系は付けていない）。

### Secrets（environment `release` に登録）

| 変数 | 用途・取り方 |
|---|---|
| `CHROME_EXTENSION_ID` | 拡張 ID（ストア URL 末尾の32文字） |
| `CHROME_CLIENT_ID` | OAuth クライアント ID（デスクトップアプリ。GCP の認証情報画面） |
| `CHROME_CLIENT_SECRET` | 同クライアントシークレット |
| `CHROME_REFRESH_TOKEN` | OAuth Playground で取得したリフレッシュトークン |
| `EDGE_PRODUCT_ID` | Partner Center のダッシュボードに表示される Product ID |
| `EDGE_CLIENT_ID` | Partner Center の「API を公開する」で発行した Client ID |
| `EDGE_API_KEY` | 同時に発行した API キー |
| `FIREFOX_EXTENSION_ID` | `jushoai@armaniacs.github.io`（`wxt.config.ts` の gecko id と同じ） |
| `FIREFOX_JWT_ISSUER` | AMO の API キー発行画面の JWT issuer |
| `FIREFOX_JWT_SECRET` | 同 JWT secret |

Chrome は API v1.1＋OAuth を使う（`CHROME_API_VERSION=v1.1`）。サービスアカウント方式
（v2）は組織ポリシー（iam.disableServiceAccountKeyCreation）で鍵作成が禁止されているため
使わない。ポリシーが解除できたら v2 に戻すことを検討する（store-submit.md 参照）。
`FIREFOX_CHANNEL` は `listed` 固定。Edge は Chromium 系のため Chrome 向け zip をそのまま使う。

### ローカル確認（dry-run）

`.env.submit` は git 管理外（`.gitignore` 済み）。テンプレートは `.env.submit.example`。

```bash
cp .env.submit.example .env.submit  # 値を埋める。ZIP の版数も合わせる
make zip && make zip-firefox
npx wxt submit --dry-run  # 認証のみ確認し、zip は送らない
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
