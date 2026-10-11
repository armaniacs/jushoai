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
2. 署名付きタグを作り、検証してから push する
   ```bash
   git tag -s vX.Y.Z -m "vX.Y.Z"
   git tag -v vX.Y.Z
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

以下の設定はソースでは強制できず、手作業である。リリースを出す前に確認すること。

- environment `release` に required reviewers を追加する（Settings → Environments →
  `release` → Required reviewers）。承認者なしではタグ push だけでは Release が作られない
  ことがこの PBI の前提である。workflow 側は environment 名の宣言までを行い、
  承認者の有無は検査の対象外である
- `v*` タグを ruleset で保護する（Settings → Rules → Rulesets → タグ名パターン `v*`）。
  タグの作成・更新・削除を許可する actor を制限し、bypass を許可しない
- 署名付きタグの運用: リリースタグは必ず `git tag -s` で署名し、`git tag -v` で検証する。
  検証に使う公開鍵（GPG）の fingerprint はメンテナ間で共有し、検証に失敗したタグの
  Release 承認は行わない
- 可能であれば、タグが main の履歴に含まれること（ancestry）をリリース前に確認する
  (`git merge-base --is-ancestor vX.Y.Z main`)。main 外のコミットを指すタグの承認は行わない

## ストア公開の準備

掲載文、権限の利用理由、データ使用の申告は `docs/store-listing.md` にまとめている。提出物は `make zip` が作る `dist/jushoai-X.Y.Z-chrome.zip`。

- 必要な画像: スクリーンショット（1280x800 または 640x400）、小プロモタイル（440x280）
- プライバシーポリシー: ドキュメントサイトの `guides/privacy/`（日英）
