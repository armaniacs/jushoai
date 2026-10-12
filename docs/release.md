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
   `make zip`、`make zip-firefox` を実行する。CHANGELOG の該当節を本文にして、
   `dist/jushoai-X.Y.Z-chrome.zip`、`-firefox.zip`、`-sources.zip`（AMO 提出用）を添付した
   Release を作る
5. main への push で、GitHub Pages のワークフローがサイトをデプロイする。`https://armaniacs.github.io/jushoai/` を開き、日英のトップとライセンスのページ、Issue ボタンのリンク先を確認する

CHANGELOG に該当節がない、またはタグと version が違うときは、Release を作らずに失敗する。ローカルで本文を確認するには `node scripts/release-notes.mjs X.Y.Z`。

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
