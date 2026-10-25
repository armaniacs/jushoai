# ストア自動提出の運用ガイド

タグを push するだけで Chrome・Edge・Firefox の 3 ストアへ審査提出する仕組みの、
未来の自分向け手順書。前提知識ゼロから読めるように書いてある。
全体のリリース手順は [release.md](release.md)、掲載文面は [store-listing.md](store-listing.md)。

## 全体像（30秒で思い出す）

```
git tag -a vX.Y.Z → git push → Actions で承認 → make check → make zip 系
  → npx wxt submit（3ストアへ並行提出、審査通過後は自動公開）
  → GitHub Release 作成
```

- 提出に使うのは `wxt submit`（中身は publish-extension）。下書き止めにはしない。
- 提出が失敗したら Release は作られない。直して再実行すればよく、タグの打ち直しは不要。
- `main` への push とは別物。タグ push が引き金（`v*`）。
- environment `release` の承認（レビュアー `armaniacs`）を通さないと何も進まない。

## 公開中のストアと ID 控え（秘密ではないものだけ）

| ストア | 公開 URL | 提出時の ID |
|---|---|---|
| Chrome ウェブストア | `https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl` | Extension ID `ijlccdbapahelcgpcopgkhdjhkkicbpl` |
| Edge アドオン | `https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi` | Product ID は Partner Center の製品概要（Overview）画面の値を使う |
| Firefox AMO | `https://addons.mozilla.org/ja/firefox/addon/jushoai/` | `jushoai@armaniacs.github.io`（`wxt.config.ts` の gecko id と同じ） |

秘密鍵・API キー類はリポジトリに書かない。全部 environment `release` の Secrets にある。

## 初回セットアップ（まだの項目だけやる）

Secrets が揃っているかは値を見ずに名前だけ確認できる：

```bash
gh secret list --env release
```

10 個すべて揃っていれば初回セットアップは不要で、「通常リリース」へ進む。
足りないものがあれば、ストアごとに以下で発行して `gh secret set --env release <名前>` で登録する。

### Chrome（API v2・サービスアカウント方式）

1. GCP プロジェクト `jushoai-store` で Chrome Web Store API を有効にする。
2. 同プロジェクトにサービスアカウント（例 `jushoai-submit`）を作り、JSON 鍵を取得する。
   組織 `araki.net` のポリシー（`iam.disableServiceAccountKeyCreation`）で鍵作成が
   禁止されているため、事前にプロジェクト単位でオーバーライドして無効化する
   （組織のポリシー一覧→当該ポリシー→対象プロジェクトで「親のポリシーをオーバーライドする」→オフ）。
3. 開発者ダッシュボードの「設定」→「サービス アカウント」欄に、
   サービスアカウントのメールアドレスを入力して「サービス アカウントを追加」する。
4. 登録する Secrets（4 個）：`CHROME_EXTENSION_ID`（`ijlccdbapahelcgpcopgkhdjhkkicbpl`）、
   `CHROME_PUBLISHER_ID`（ダッシュボード URL `devconsole/<ID>` の ID）、
   `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`（JSON の `client_email`）、
   `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`。
   private key の注意：JSON 内は `\n` 表記だが、ツールは提出時に変換しない。
   GitHub Secret には**実際の改行入り**で登録すること。ダウンロードした JSON から直接入れる：
   ```bash
   node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).private_key)" ~/Downloads/XXXXXXXX.json | gh secret set --env release CHROME_SERVICE_ACCOUNT_PRIVATE_KEY
   ```
   （`XXXXXXXX.json` はダウンロードした鍵ファイル名に置き換える）。
   手で貼る場合は、複数行のまま貼って最後に Ctrl+D。
   `.env.submit`（ローカル確認用）では逆に、値を**ダブルクォートで囲んで `\n` 表記のまま**書く
   （dotenv が展開して改行に戻す。クォート無しだと `DECODER routines::unsupported` で落ちる）。

経緯のメモ：一時は API v1.1＋OAuth（クライアント＋Playground の
リフレッシュトークン）に切り替えていたが、v1.1 が 2026-10-15 で停止するため v2 に戻した。
v1.1 用の Secrets（`CHROME_CLIENT_ID` 等）が environment `release` に残っていても無害だが、
紛らわしければ消してよい。

### Edge（Partner Center の API キー）

1. Partner Center を開き、対象の拡張機能を選ぶ。
2. 製品概要（Overview）画面に表示される Product ID を控える。
   公開 URL 末尾の 32 文字と一致するはずだが、写す元はダッシュボード側にする。
3. 「API を公開する」（Publish the API）相当の画面で Client ID と API キーを発行する。
4. 登録する Secrets（3 個）：`EDGE_PRODUCT_ID`、`EDGE_CLIENT_ID`、`EDGE_API_KEY`。

### Firefox（AMO の JWT）

1. AMO の API キー管理画面（`https://addons.mozilla.org/ja/developers/addon/api/key/`）で
   キーを発行し、JWT issuer と JWT secret を控える。
2. 登録する Secrets（3 個）：`FIREFOX_EXTENSION_ID`（`jushoai@armaniacs.github.io`）、
   `FIREFOX_JWT_ISSUER`、`FIREFOX_JWT_SECRET`。

## 通常リリース（毎回これだけ）

```bash
make check
# package.json の version と CHANGELOG の ## [X.Y.Z] を整えて main にコミット
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main vX.Y.Z
```

あとは GitHub の Actions 実行画面で `release` ジョブを承認する。
承認後は自動で進み、3 ストアへの提出ログと GitHub Release ができる。
終わったら各ストアのダッシュボードで審査状態を確認する（審査期間はストア次第）。

提出前の疎通確認（任意だが初回は推奨）：

```bash
cp .env.submit.example .env.submit  # 値を埋める。ZIP の版数も合わせる
make zip && make zip-firefox
npx wxt submit --dry-run  # 認証だけ確認し、zip は送らない
```

`.env.submit` は git 管理外。絶対にコミットしないこと。

## ストアごとの違い（ハマりどころ）

| 観点 | Chrome | Edge | Firefox |
|---|---|---|---|
| 認証 | GCP サービスアカウント（email＋private key）。private key は改行のまま | Client ID＋ApiKey をヘッダーで送る | JWT（issuer＋secret）で署名 |
| 提出物 | `dist/jushoai-X.Y.Z-chrome.zip` | Chrome と同じ zip をそのまま使う（Chromium 系のため） | `-firefox.zip` と `-sources.zip` の両方が要る（AMO がソース審査するため） |
| 提出の段階 | API v2 で一発提出 | draft に zip を上げ→検証待ち→正式提出、の 2 段階（ツールが自動でやる。検証失敗だとここで落ちる） | 署名付き提出。`listed` チャンネル固定 |
| 版数 | 更新のたび引き上げ必須（タグ＝package.json の検査が守ってくれる） | 同左 | 同左。加えて sources.zip の中身が `wxt.config.ts` の `excludeSources` 通りか注意（緩すぎると肥大、締めすぎると再現ビルドできず差し戻し） |
| 審査 | 比較的速い | 検証（自動）＋審査 | 人手審査で一番遅いことが多い |
| 保留中がある場合 | 次回リリースで `--chrome-cancel-pending` の要否を判断する | 同左の事情は Chrome 側の設定に依存しない（各ストア独立） | 同左 |

共通の注意：

- 1 ストアの失敗は他の提出を止めない（並行提出）。Actions のログで成否を1件ずつ確認する。
- 失敗しても Release は作られない。原因を直してワークフローを再実行する（タグの打ち直し不要）。
- 成功済みストアへの二重提出が気になるときは、ログで成功分を確認してから再実行する。
- 版数を上げずに再提出はできない。各ストアは同じ版数の再受け付けをしない。

## 失敗パターン別の対処

| ログの様子 | 原因の当たり | 対処 |
|---|---|---|
| `No ZIP files detected to upload` | zip の env が渡っていない（Package 失敗か版数ずれ） | `make zip`／`make zip-firefox` の成果物名と版数を確認する |
| 設定エラー（Invalid config 等） | Secrets 不足・空文字 | `gh secret list --env release` で名前の有無を確認し、足りないものを登録して再実行 |
| Chrome の認証失敗 | サービスアカウント未連携・private key の改行崩れ・Publisher ID 間違い | ダッシュボードの連携状態と Secrets の登録し直し（private key は複数行のまま） |
| Edge の Validation failed | zip 内容が Edge の要件に合わない | ログの JSON を読み、指摘箇所を直して版数を上げて再提出 |
| Firefox の審査差し戻し | sources.zip の過不足・権限の説明不足 | `excludeSources` と掲載文面（store-listing.md）を見直す |
| 承認待ちで止まる | environment `release` の承認が未済 | Actions 画面で承認する（却下すると Release なしで終了） |

## 仕組みの覚え書き（半年後に読む）

- ワークフローは `.github/workflows/release.yml`。Submit to stores が Package の後、
  Release 作成の前にあるのは「提出失敗時に半端な Release を残さない」ため。
- `wxt submit` は `wxt` の submit エイリアスで、実体は publish-extension。
  `CHROME_ZIP` 等の env があるストアだけ提出対象になる。
- `CHROME_API_VERSION=v2` 固定（サービスアカウント方式。API v1.1＋OAuth は 2026-10-15 で Google が停止したため使わない）。
  `FIREFOX_CHANNEL=listed` 固定。
  自動公開のため `skip-submit-review` 系は付けていない。
- Edge 用に別ビルドはしない。`EDGE_ZIP` に chrome zip を渡している。
- 日英のサイト（`site/content`）とは無関係の手順書なので、日本語だけでよい。
