# リリース手順

## 事前確認

1. `make check`（typecheck + test + build）が通る
2. `make site` が通る
3. `samples/` のサンプルフォームで、入力とプレビューを手動確認する
4. `package.json` の `version` と `CHANGELOG.md` の見出しを、リリースするバージョンにする

## GitHub Release

タグを push すると、`.github/workflows/release.yml` が Release を作る。

1. `package.json` の `version` と CHANGELOG の `## [X.Y.Z]` 節を整えて、main にコミットする
2. `git tag vX.Y.Z && git push origin main vX.Y.Z`
3. ワークフローが、タグと `package.json` の version の一致を確かめ、`make check`、`make zip`、`make zip-firefox` を実行する。CHANGELOG の該当節を本文にして、`dist/jushoai-X.Y.Z-chrome.zip`、`-firefox.zip`、`-sources.zip`（AMO 提出用）を添付した Release を作る
4. main への push で、GitHub Pages のワークフローがサイトをデプロイする。`https://armaniacs.github.io/jushoai/` を開き、日英のトップとライセンスのページ、Issue ボタンのリンク先を確認する

CHANGELOG に該当節がない、またはタグと version が違うときは、Release を作らずに失敗する。ローカルで本文を確認するには `node scripts/release-notes.mjs X.Y.Z`。

## ストア公開の準備

掲載文、権限の利用理由、データ使用の申告は `docs/store-listing.md` にまとめている。提出物は `make zip` が作る `dist/jushoai-X.Y.Z-chrome.zip`。

- 必要な画像: スクリーンショット（1280x800 または 640x400）、小プロモタイル（440x280）
- プライバシーポリシー: ドキュメントサイトの `guides/privacy/`（日英）
