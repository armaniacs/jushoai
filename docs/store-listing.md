# Chrome Web Store 掲載情報

開発者ダッシュボードの各欄に貼り付ける文面。事実は README、`site/content/*/privacy.md`、`wxt.config.ts` に合わせる。

## ストア掲載情報

### 名前

JushoAI

### 概要（132 文字以内）

- ja: 日本式フォームの姓名・フリガナ・分割された住所を 1 クリックで入力。ルール主体で、入力前にプレビューで確認できます。
- en: Fill Japanese web forms (split names, furigana, split addresses) in one click, with a preview before anything is entered.

### 詳細な説明（ja）

```
日本のウェブフォームに多い「姓・名」「セイ・メイ」「郵便番号」「都道府県・市区町村・番地・建物名」と細かく分かれた入力欄を、1 回のクリックで正しい欄に入力します。

特長
- 入力前にプレビューで確認できます。承認するまで、ページには何も入力しません
- 欄の判定はルールが主体です。ルールで判定できない欄だけ、AI で補助できます
- 氏名のフリガナ変換、郵便番号のハイフン判定、電話番号の 3 分割、住所の分割と半角化を、AI ではなく決められた処理で行います
- 入力済みの欄は上書きしません。maxlength を超える値は切り詰めず、警告して入力しません
- React や Vue で作られたフォームにも入力できます
- 英語のページでは、姓名をローマ字、住所を英語住所の項目で入力します

プライバシー
- 初期設定では AI を使わず、外部への通信はありません
- プロファイル（氏名・住所など）の値を外部へ送ることはありません
- AI を使う設定にした場合だけ、ルールで判定できない欄の情報（name、id、label、placeholder、見出し、type、maxLength）を、選んだプロバイダへ送ります
- AI プロバイダは「使わない」「ブラウザ内蔵 AI」「OpenAI 互換」「Gemini」から 1 つ選びます。ブラウザ内蔵 AI は端末内で動き、外部へ送りません
- API キーは暗号化して端末内に保存します
- AI を呼び出した記録は端末内に 7 日間だけ残り、設定ページで確認・削除できます

使い方
1. 設定ページでプロファイルを登録します
2. フォームのあるページで「JushoAI で入力」を押します
3. プレビューを確認して承認します

ソースコードは GitHub で公開しています（GPL）。
```

### 詳細な説明（en）

```
Fills the finely split fields common on Japanese web forms (family name, given name, furigana, postal code, prefecture, city, street, building) in one click.

Features
- Review everything in a preview first. Nothing is entered into the page until you approve
- Field detection is rule-based. AI assists only with fields the rules cannot identify
- Furigana conversion, postal-code hyphen handling, phone number splitting, address splitting and half-width conversion are done by deterministic code, not by AI
- Fields that already have a value are never overwritten. Values longer than maxlength are not truncated; they are skipped with a warning
- Works with forms built with React or Vue
- On English pages, fills names in romaji and addresses in English-style fields

Privacy
- By default no AI is used and nothing is sent anywhere
- The values in your profile (name, address, etc.) are never sent
- Only if you enable an AI provider, metadata of fields the rules could not identify (name, id, label, placeholder, nearby heading, type, maxLength) is sent to the provider you chose
- Choose one provider: none, built-in browser AI, OpenAI-compatible, or Gemini. Built-in AI runs on your device and sends nothing out
- API keys are encrypted and stored on your device
- A log of AI calls is kept on your device for 7 days only, and can be viewed or deleted on the settings page

How to use
1. Register your profile on the settings page
2. Press "JushoAI で入力" on a page with a form
3. Review the preview and approve

The source code is published on GitHub (GPL).
```

### カテゴリ・言語

- カテゴリ: 仕事効率化（Productivity）
- 言語: 日本語（既定）、英語

### URL

- ホームページ: `https://armaniacs.github.io/jushoai/`
- サポート: `https://github.com/armaniacs/jushoai/issues`
- プライバシーポリシー: `https://armaniacs.github.io/jushoai/guides/privacy/`

## プライバシーへの取り組みタブ

### 単一用途の説明

日本式の入力フォームの氏名・フリガナ・住所の欄を、保存したプロファイルから補完する。

### 権限の利用理由

| 権限 | 理由 |
|---|---|
| `storage` | プロファイル、住所、設定を端末内に保存するため |
| ホスト権限（`<all_urls>` の Content Script） | 任意のページのフォームを検出し、「JushoAI で入力」を表示して入力を補完するため。ページの内容を外部へ送ることはない |
| `optional_host_permissions` | ユーザーが選んだ AI プロバイダへの通信を、設定ページの保存時にユーザーの許可を得て有効にするため。インストール時には要求しない |

### リモートコードの使用

いいえ。すべてのコードを拡張機能のパッケージに同梱している。

### データ使用の申告

| 項目 | 申告 |
|---|---|
| 個人を特定できる情報 | チェックしない（プロファイルは端末内のみで使い、外部へ送らない） |
| 認証に関する情報 | チェックする。AI を使う設定のときだけ、ユーザーが入力した API キーを、認証のためにユーザーが選んだプロバイダへ送る。開発者のサーバーへは送らない。端末内には暗号化して保存する |
| ウェブサイトのコンテンツ | チェックする。AI を使う設定のときだけ、欄のメタデータ（name、id、label、placeholder、見出し、type、maxLength）を、ユーザーが選んだプロバイダへ送る |
| 上記以外の項目 | チェックしない |

申告する 3 つの確認事項はすべてチェックする。

- 承認された以外のユースケースのために、ユーザーデータを第三者へ売却または転送しない
- アイテムの単一用途と関係のない目的で、ユーザーデータを使用または転送しない
- 信用度の判断や融資目的で、ユーザーデータを使用または転送しない

## 画像

| 種類 | サイズ | 用意するもの |
|---|---|---|
| アイコン | 128x128 | `public/icon/128.png`（zip に同梱） |
| スクリーンショット | 1280x800、最大 5 枚 | 下記の 5 枚 |
| 小プロモタイル | 440x280 | キャッチコピー「氏名・フリガナ・住所を 1 クリックで」 |
| マーキープロモタイル | 1400x560、アルファなしの PNG または JPEG | 同じキャッチコピーと、確認パネルの再現 |

スクリーンショットは `samples/demo-registration.html` と設定ページを使い、次の順に並べる。

1. 入力前のフォームと「JushoAI で入力」ボタン
2. 入力前のプレビュー
3. 入力後のフォーム
4. プロファイルの設定ページ
5. AI プロバイダの設定ページ

画像のファイルはリポジトリに含めない。個人情報が写り込まないよう、ダミーのプロファイルで撮る。

## プロモーション動画（任意）

YouTube に公開した動画の URL を、ダッシュボードの「全言語向けプロモーション動画」に入力する。公開設定は「限定公開」でもよい。音声は入れず、字幕だけで伝える。形式は MP4（H.264）、解像度は 1920x1080（最低 1280x720）の 16:9、長さは約 2 分とする。

### 台本（約 120 秒）

前半はルールだけの入力（3 ページ）、後半は AI 支援（設定画面と、ルールで判定できない欄を持つページ）を見せる。ページはどれも `samples/` のデモ用（`demo-registration.html`、`demo-shop-checkout.html`、`demo-request-info.html`、`demo-ai-ambiguous.html`）で、別々のクリップとして録って、場面の切り替えでつなぐ。プレビューが開いている間は、右上のパネルへ拡大する。クリックの瞬間には、カーソルの位置に波紋を出す。

| 時間 | 画面 | 字幕 |
|---|---|---|
| 0:00-0:04 | ロゴと名前 | 氏名・フリガナ・住所を 1 クリックで |
| 0:04-0:26 | 会員登録の空のフォーム。ボタンを押し、プレビューの各行を確認して、「入力する」で全欄が入力される | 細かく分かれたフォームも、1 クリックで / 入力前に、欄ごとの値をプレビューで確認 / 承認すると、正しい欄に入力されます |
| 0:26-0:43 | 配送先入力のページ（右側に注文内容）。同じ操作で入力する | サイトが変わっても、操作は同じです / 郵便番号・電話番号は、欄の書式に合わせて入力 / 入力は、承認したあとだけ行われます |
| 0:43-1:07 | 資料請求のページ。メールアドレスだけ先に手で入力しておく。プレビューのメール行に「入力済みのため上書きしません」が出て、他の欄だけが入る。ご質問欄は空のまま | 入力済みの欄は、上書きしません / プレビューにも、入力済みと表示されます / 対象外の欄には、触れません |
| 1:07-1:12 | 黒背景に字幕だけ | ルールでは判定できない欄は、AI が補います / AI は任意。使う設定にしたときだけ、欄の情報を送ります |
| 1:12-1:27 | 設定ページ。プロファイルと住所は 3 倍速（右上に「×3」）、AI 判定は等速。プロバイダは Google Gemini、モデル名は `gemini-3.5-flash`、API キー欄は「保存済み」 | まず、プロファイルを登録します / 住所も、1 度だけ登録します / AI は任意。使うプロバイダとモデルを選びます / 送るのは、欄の情報だけ。入力する値は送りません |
| 1:27-1:49 | `demo-ai-ambiguous.html`。ボタンの表示は「AI: Gemini」。押すと、AI の応答を待つ。プレビューの AI が判定した行に「AI判定」のバッジが付く。「入力する」で全欄が入力される | ラベルが曖昧なフォーム / AI が欄を判定しています… / AI が判定した欄には、バッジが付きます / 値は、設定したプロファイルから入力されます |
| 1:49-1:55 | 黒背景に字幕だけ | ルールが主体。AI は任意の補助 / 初期設定では、外部に送りません |
| 1:55-2:00 | ロゴと名前 | 氏名・フリガナ・住所を 1 クリックで |

- 「郵便番号・電話番号は、欄の書式に合わせて入力」は、欄の placeholder と maxLength を見てハイフンの有無を決める挙動に基づく（`src/core/planner.ts` の `wantsHyphen`）。
- AI の応答を待つ間の画面は、応答が遅いときに、3 秒を超える分を 8 倍速で飛ばす。
- 最後の場面に「Chrome ウェブストアで公開中」は入れない。公開後に差し替えるときは、動画を撮り直さず、字幕だけを直す。

### 撮影手順

1. ダミーのプロファイル（氏名: 試験 太郎、住所: 千代田区千代田1-1・サンプルビル101）を登録する。前半（ルールだけの場面）は AI 判定を「使わない」、後半（AI の場面）は「Google Gemini」にして、プロバイダとモデルを保存した状態の、別のブラウザプロファイルで録る。
2. API キーは、録画の前に、設定ページから保存しておく。動画に映すのは「保存済み」の表示だけにして、キーの文字列は、画面にも字幕にも出さない。API キーの入力操作は録画しない。
3. 各ページを、ローカルの HTTP サーバー（`http://127.0.0.1`）から開く。`file://` では、拡張機能のコンテンツスクリプトが動かない。
4. 1920x1080 のビューポートで、ページごとに別のクリップとして録画する。16:10 のままだと、YouTube の再生画面に黒い帯が出る。
5. マウスはゆっくり動かし、各場面で 1 秒止める。録画にはカーソルが映らないので、カーソルの矢印とクリックの波紋を、ページに重ねて描く。
6. 字幕、拡大、早送り、場面の切り替えは、動画編集ソフト（Remotion など）で入れる。
7. ブラウザの枠（アドレスバー、アカウントのアイコン）は写さず、ページだけを録る。
8. AI のモデルは、応答が数秒以内で安定するものを選ぶ。応答が 20 秒を超えると、拡張機能が待つのをやめて、AI の判定なしのプレビューを出す（`gemini-3.8-flash` は応答が 8〜12 秒で、時々 503 を返したため、`gemini-3.5-flash`（約 1.5 秒）にした）。
