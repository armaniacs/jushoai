# JushoAI

日本式フォーム（姓名・フリガナ・分割された住所）を、正しい欄に 1 クリックで入力する Chromium 系ブラウザ（Chrome / Edge）向けの拡張機能。フィールドの分類はルールで行い、判定できない欄だけ AI で補助できる（OpenAI 互換 API、Gemini、またはブラウザ内蔵 AI から選ぶ）。値の整形は決定的なコードで行い、プロファイルの値は外部に送信しない（AI を設定した場合のみ、欄のメタデータが選択したプロバイダに送られる）。入力する前に、プレビューで確認できる。

English: [README.en.md](README.en.md)

- ドキュメント: https://armaniacs.github.io/jushoai/
- 要望・不具合: [Issue を作成する](https://github.com/armaniacs/jushoai/issues/new/choose)（機能の要望、入力できなかったフォーム、不具合のフォームが開く）
- ライセンス: GPL-3.0-only（[LICENSE](LICENSE)、条件の要旨は[ドキュメント](https://armaniacs.github.io/jushoai/guides/license/)）

## インストール

ストアには公開していない。[GitHub Releases](https://github.com/armaniacs/jushoai/releases) の zip を展開するか、ソースからビルドして読み込む。

1. Chrome は `chrome://extensions`、Edge は `edge://extensions` を開き、デベロッパーモードを有効にする
2. 「パッケージ化されていない拡張機能を読み込む」で、展開したフォルダ、またはビルドで出来た `dist/chrome-mv3` を選ぶ
3. 拡張機能の設定ページで、プロファイルと住所を登録する

ソースからビルドする場合は `make install` と `make build`。詳しくは[ガイド「はじめに」](https://armaniacs.github.io/jushoai/guides/getting-started/)を参照。

## 使い方

1. 拡張機能の設定ページでプロファイル（10 件まで）と住所を登録する。住所は使うプロファイルに紐付けられる
2. フォームの付近に出る「JushoAI で入力」を押す
3. プレビューで内容を確認し、「入力する」を押す

ツールバーのアイコンから、登録内容と使用中のプロファイルを確認できる。入力済みの欄は上書きせず、最大文字数を超える値は入力せずに警告する。

## 要望・不具合の連絡

GitHub の Issue で受け付けている。[Issue を作成する](https://github.com/armaniacs/jushoai/issues/new/choose)から、種類に合うフォームを選ぶ。Issue は公開されるため、氏名・住所・電話番号などの個人情報は書かない。

## ライセンス

GNU General Public License v3.0 のみ（GPL-3.0-only）。Copyright (C) 2026 armaniacs。使用・複製・改変・再配布ができ、配布するときは同じ GPLv3 の条件でソースコードを提供する。全文は [LICENSE](LICENSE)。

## AI 判定を使うには

ルールで判定できない欄だけ、AI で補助できる。初期状態は「オフ」で、設定ページの「AI 判定」でプロバイダを選ぶ。AI が使えなくてもルールによる入力は動作する。

- OpenAI 互換 API: ベース URL・モデル名・API キーを入力する。OpenAI / Groq / Mistral / Ollama / LM Studio はプリセットからベース URL を埋められる
- Google Gemini: モデル名・API キーを入力する
- ブラウザ内蔵 AI: Chrome（Gemini Nano）または Edge（Phi-mini）。フラグの有効化と再起動が必要
  - Chrome: `chrome://flags/#prompt-api-for-gemini-nano`
  - Edge: `edge://flags/#edge-llm-prompt-api-for-phi-mini`

保存すると、選んだプロバイダへの通信の許可をブラウザが確認する。許可しないと AI は使われない。接続テストで設定を確認できる。

OpenAI のリーズニング系モデルや json_schema に対応しないサーバーには、自動で互換リクエストに切り替えて 1 回だけ再試行する。

ブラウザ内蔵 AI のモデルが未ダウンロードの場合、最初に「入力」を押したときにダウンロードを試みる。ブラウザによっては自動で始まらないことがある。

### 送信されるデータ

通信が発生するのは「JushoAI で入力」を押したときだけで、ページを開いただけでは何も送らない。AI を使う設定にした場合、ルールで判定できない入力欄のメタデータ（name・label・placeholder・見出し・type・maxlength）が、選んだプロバイダに送られる。メタデータにはページに表示されている文字（ラベルや見出し）が含まれるため、ページ上に表示されている個人情報が送信内容に含まれることがある。プロファイルの値や、欄にすでに入っている値は送らない。ブラウザ内蔵 AI は端末内で動作し、外部には何も送らない。API キーは暗号化して保存する（ストレージだけが流出しても復号できないが、この拡張機能自身のコードからは読み出せる）。

Ollama を使う場合は、Ollama 側の `OLLAMA_ORIGINS` に `chrome-extension://<拡張機能の ID>` を許可する。

状態は「JushoAI で入力」の横のバッジに表示され、押すと原因と対処のガイドが開く。

## 開発者向け

### 開発

    make install       # 依存の取得
    make dev           # 開発ビルド（Chrome が起動する）
    make build         # dist/chrome-mv3 に出力
    make test          # Vitest
    make typecheck     # tsc --noEmit
    make check         # typecheck + test + build
    make zip           # dist に配布用 zip を作る
    make site          # ドキュメントサイトを site-dist に生成して検査する
    make site-serve    # site-dist を http://127.0.0.1:4173 で確認する
    make clean         # 生成物を削除

`make help` で一覧を表示する。

### 手動確認（AI プロバイダ）

1. 初期状態でバッジが「AI: オフ」になり、押すとガイドと「AI 設定を開く」ボタンが出る
2. Ollama: プリセットを選び、モデル名を入れて保存し、権限の確認で許可して、接続テストが成功する。403 になる場合は `OLLAMA_ORIGINS` を確認する
3. OpenAI 互換のクラウド API または Gemini: 保存して通信を許可し、接続テストが成功する。`samples/single-field-form.html` を開いて「JushoAI で入力」を押すと、Residence / Handset がプレビューで「AI判定」の印付きで出る
4. API キーを間違えると、接続テストが認証失敗になり、バッジが「AI 認証エラー」になる。キーを直して保存すると戻る
5. 権限の確認を拒否すると、バッジが「AI 権限なし」になる。ルールによる入力は動作する
6. 設定ページを開き直すと、キーは「保存済み」と表示され、値は見えない。削除のチェックを付けて保存するとキーが消える
7. キーを入力し直さずにベース URL のホストを変えて保存すると、保存済みのキーは引き継がれず削除される
8. Service Worker の DevTools の Network タブで、リクエスト本文にプロファイルの値が含まれていない

### 構成

- `src/core/` 分類ルール・値整形・注入値の計画（DOM と LLM に依存しない）
- `src/dom/` フォーム走査と値注入
- `src/ai/` AI プロバイダの設定・API キーの暗号化・クラウド分類器
- `src/llm/` Prompt API のラッパー、background のメッセージハンドラ、Content Script からのゲートウェイ
- `src/ui/` ボタンとプレビュー（Shadow DOM）
- `samples/` 手動確認用のフォーム
- `site/` ドキュメントサイト（Markdown と文言から静的 HTML を生成する。公開は GitHub Pages）

### ドキュメントサイト

`site/` に日本語と英語のサイトのソースがある。ガイドは `site/content/{ja,en}/*.md`、ランディングの文言は `site/i18n/{ja,en}.json`。日英で見出しの数や文言のキーが違うとビルドが失敗する。`make site` で `site-dist/` に生成して検査し、`make site-serve` で確認する。公開は `.github/workflows/pages.yml`（main への push で GitHub Pages にデプロイ）。リポジトリ側で Pages の Source を GitHub Actions にする必要がある。
