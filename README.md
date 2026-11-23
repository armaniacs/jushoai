# JushoAI

日本式フォーム（姓名・フリガナ・分割された住所）を、正しい欄に 1 クリックで入力する Chromium 系ブラウザ（Chrome / Edge）と Firefox 128 以上向けの拡張機能。フィールドの分類はルールで行い、判定できない欄だけ AI で補助できる（OpenAI 互換 API、Gemini、またはブラウザ内蔵 AI から選ぶ）。値の整形は決定的なコードで行い、プロファイルの値は外部に送信しない（AI を設定した場合のみ、入力欄のメタデータが選択したプロバイダに送られる）。入力する前に、プレビューで確認できる。本拡張は日本語ユーザーのための拡張であり、画面表示（UI）は日本語専用としています（意図的な仕様であり、英語表示には対応していません）。

![JushoAI で入力の流れ。ボタンを押すとプレビューが出て、「入力する」で欄に入る](https://armaniacs.github.io/jushoai/assets/demo.gif)

動いているところは [紹介動画](https://www.youtube.com/watch?v=Y3y9ofrsyFo)（約 2 分）でも見られる。

使うだけなら「使い方」まで読めば足ります。開発に参加する人は「開発者向け」から読んでください。

<!-- README-I18N:START -->

**日本語** | [English](./README.en.md)

<!-- README-I18N:END -->

- ユーザーガイド（Markdown で読む）: [docs/user-guide.md](./docs/user-guide.md)
- ドキュメント（Web / GitHub Pages）: https://armaniacs.github.io/jushoai/
- 要望・不具合: [Issue を作成する](https://github.com/armaniacs/jushoai/issues/new/choose)（機能の要望、入力できなかったフォーム、不具合のフォームが開く）
- ライセンス: GPL-3.0-only（[LICENSE](./LICENSE)、条件の要旨は[ライセンス](./site/content/ja/license.md) / [Web 版](https://armaniacs.github.io/jushoai/guides/license/)）

## インストール

Chrome は [Chrome ウェブストア](https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl?hl=ja)から、Edge は [Edge アドオン](https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi?hl=ja)から、Firefox は [Firefox アドオン（AMO）](https://addons.mozilla.org/ja/firefox/addon/jushoai/)からインストールできる。

1. ストアを使わず zip から読み込む場合は、Chrome は `chrome://extensions`、Edge は `edge://extensions` を開き、デベロッパーモードを有効にする
   - Firefox 用は `jushoai-<バージョン>-firefox.zip` を展開し、`about:debugging#/runtime/this-firefox` を開いて「一時的なアドオンを読み込む」で、展開したフォルダ内の `manifest.json` を選ぶ。一時的なアドオンは Firefox を終了すると外れ、登録したプロファイル・住所と暗号化キーも一緒に失われる。使うたびに読み込み直して、登録し直す
2. 「パッケージ化されていない拡張機能を読み込む」で、展開したフォルダを選ぶ
3. 拡張機能の設定ページで、プロファイルと住所を登録する

## 使い方

1. 拡張機能の設定ページでプロファイル（最大 10 件）と住所（最大 10 件）を登録する（別々に保存でき、住所は使うプロファイルに紐付けられる）。実データを入れる前に試したいときは、設定ページ上部の「架空の名前と住所を作って試す」から架空のサンプルデータですぐ始められる
2. フォームの付近に出る「JushoAI で入力」を押す
3. プレビュー（「入力内容の確認」）で先頭の件数（`x / y 欄に入力できます（承認後に注入します）`）と欄・値の一覧を確認し、「入力する」を押す
4. 入力後は結果画面（「入力結果」）が表示され、直後であれば「元に戻す」で JushoAI が入れた欄だけを元の空状態に戻せる

ボタンは入力欄と重ならない位置に出る。それでも重なって邪魔なときは、ボタンをドラッグ（またはフォーカスして矢印キー）でどかせる。ボタンの背景は半透明のため、重なっても下の入力が見える。ボタン・プレビュー・ダイアログは OS のダークモードに自動で追従する。

ツールバーのアイコンから、登録内容と使用中のプロファイルを確認できる。入力済みの欄は上書きせず、最大文字数を超える値や欄の `pattern` に合わない値は入力せずに警告する。

### 主な便利機能

- **児童用・保護者用の役割別プロファイル選択**: 学校や塾の申込フォームなど児童向けと保護者向けの欄が両方ある画面で役割を自動判定し、別々のプロファイルから 1 回で入力できる
- **保存せず 1 回だけ使える「ゲストで入力」**: ツールバーから設定に保存しない 1 回限りの入力ができ、タブ内のメモリだけで完結する
- **再訪時の短縮プレビューと URL ごとの候補提示**: 同じフォーム再訪時は前回と同じ行を `前回と同じ` に折りたたみ、ホストごとに前回使ったプロファイルを優先候補に出す
- **複数ページ申込での入力値引き継ぎ**: 同じタブ内の後続ページへ、前のページで入力した値を候補として引き継ぐ（タブ内メモリ限定）
- **補助候補の提案（チェック承認制）**: 文字数超過時の建物名略記候補（`略記して入れる`）、カナ未登録時の端末内読み辞書候補、郵便番号からの都道府県・市区町村候補（`補助候補を入れる`）を提示する
- **1 欄だけの入力と「直す」での学習**: `Alt+J` または右クリック「JushoAI: この欄に入力」で 1 欄だけ入力できるほか、プレビューの「直す」で教えた対応付けは次回から優先され、AI にも送らない
- **フォームから取り込む・JSON 移行**: 開いているフォームの値から下書きを取り込めるほか、JSON エクスポート／インポートで別環境へ移行できる
- **幅広い欄のサポート**: 会社名・部署・役職、学校名・学部学科・学校の学年・塾名、生年月日 1 欄型（`type=date`）、FAX 番号、3 分割の緊急連絡先欄にも対応する

詳しくは [docs/user-guide.md](./docs/user-guide.md) と [シーン別の使いこなし](./site/content/ja/scenarios.md) を参照。

### 起動しないURL

表計算やメールなど入力補完が不要なページでは、設定ページの「起動しないURL」またはフォーム上のボタンから登録して動かさないようにできる。

- **ページ上のボタンから登録**: 「JushoAI で入力」の右上にある「X」（`このボタンを隠す`）を押すとボタンが隠れ、登録ダイアログが開く。「このページだけ」または「この配下全体」（ルート URL では「このサイト全体」）を選んで登録でき、15 秒で自動的に閉じる（ポインターを重ねている間やフォーカス中は閉じない）。隠した直後は「元に戻す」、登録直後は「登録を取り消す」で取り消せる
- **一致の仕組み**: オリジンとパス単位で判定する（大文字小文字は区別しない）。たとえば `https://example.com/pay` は `https://example.com/payment` には一致しない。`https://docs.google.com/spreadsheets/` を登録すると配下のスプレッドシートで起動しなくなり、同じホストの `https://docs.google.com/document/` には影響しない
- **反映と上限**: 保存すると開いているタブにもすぐ反映される（ボタンが消える）。`http://` / `https://` の URL を最大 100 件まで登録できる

手順と画面の説明は [フォームへの入力とツールバー](./site/content/ja/popup-and-fill.md)（[Web 版](https://armaniacs.github.io/jushoai/guides/popup-and-fill/)）にある。

## 対応しないもの

- クレジットカード番号・口座番号などの機微情報（プロファイルに保存できるのは日常の連絡先の情報に限る）
- 認証コード・SMS 確認コード・2 段階認証
- ページ読み込み時の自動入力（プレビュー確認なしに注入しないため。「JushoAI で入力」のボタンから実行する）
- クロスオリジン iframe 内のフォーム（埋め込みウィジェットなど。調査の結果、対象外としている）
- PDF・印刷帳票
- チェックボックス、性別・年代以外のラジオボタン（サイト内検索窓なども誤入力防止のため意図的に飛ばす。欄の一覧は [対応する入力欄](./site/content/ja/supported-fields.md) / [Web 版](https://armaniacs.github.io/jushoai/guides/supported-fields/)）

## 要望・不具合の連絡

GitHub の Issue で受け付けている。[Issue を作成する](https://github.com/armaniacs/jushoai/issues/new/choose)から、種類に合うフォームを選ぶ。Issue は公開されるため、氏名・住所・電話番号などの個人情報は書かない。

## ライセンス

GNU General Public License v3.0 のみ（GPL-3.0-only）。Copyright (C) 2026 armaniacs。使用・複製・改変・再配布ができ、配布するときは同じ GPLv3 の条件でソースコードを提供する。全文は [LICENSE](./LICENSE)。

## AI 判定を使うには

ルールで判定できない欄だけ、AI で補助できる。初期状態は「オフ」で、設定ページの「AI 判定」でプロバイダを選ぶ。AI が使えなくてもルールによる入力は動作する。

- OpenAI 互換 API: ベース URL・モデル名・API キーを入力する。OpenAI / Groq / Mistral / Ollama / LM Studio はプリセットからベース URL を埋められる
- Google Gemini: モデル名・API キーを入力する
- ブラウザ内蔵 AI: Chrome（Gemini Nano）または Edge（Phi-mini）。フラグの有効化と再起動が必要（Firefox では利用できない）
  - Chrome: `chrome://flags/#prompt-api-for-gemini-nano`
  - Edge: `edge://flags/#edge-llm-prompt-api-for-phi-mini`

保存すると、選んだプロバイダへの通信の許可をブラウザが確認する。許可しないと AI は使われない。OpenAI 互換 API で新しい接続先を保存したときは、初回送信前に設定ページで DNS 解決された IP アドレスを確認し、「この接続先を承認する」を押すまで何も送らない。設定後に接続テストで動作を確認できる。

OpenAI のリーズニング系モデルや json_schema に対応しないサーバーには、自動で互換リクエストに切り替えて 1 回だけ再試行する。

ブラウザ内蔵 AI のモデルが未ダウンロードの場合、最初に「入力」を押したときにダウンロードを試みる。ブラウザによっては自動で始まらないことがある。

### 送信されるデータ

通信が発生するのは「JushoAI で入力」「AI で分析」を押したときと接続テストのときだけで、ページを開いただけでは何も送らない。AI を使う設定にした場合、ルールで判定できない入力欄のメタデータ（name・id・label・placeholder・見出し・type・maxlength）だけが送られ、プロファイルの値や欄に入っている値は送らない。さらにルールで判定できない欄を AI に送る前には「AI判定で送る内容」パネルが開き、送る予定のメタデータを確認できる。個人情報らしい文言を含む欄は「（要確認）」付きで既定で「送らない」になっており行ごとに切り替えられ、「ルールのみで入力する」を選べば何も送らず続行できる。プレビューの「直す」で教えた欄（覚えた対応付け）も AI に送らない。

なお、ラベルや見出しにはページ上の文言が含まれるため、ページに表示されている個人情報が含まれることがある。ブラウザ内蔵 AI は端末内で動作し、外部には何も送らない。API キーは暗号化して保存する（ストレージだけが流出しても復号できないが、この拡張機能自身のコードからは読み出せる）。

Firefox では、プロバイダの保存時にホストの許可と合わせて、ウェブサイトのコンテンツ（欄のメタデータ）を送ることへの同意（データ収集の権限）を求める。

Ollama を使う場合は、Ollama 側の `OLLAMA_ORIGINS` に `chrome-extension://<拡張機能の ID>` を許可する。Firefox では `moz-extension://<UUID>` を許可する。UUID は設定ページに表示され、インストールごとに変わる。

状態は「JushoAI で入力」の横のバッジに表示され、押すと原因と対処のガイドが開く。設定の詳細は [AI プロバイダの設定](./site/content/ja/ai-providers.md) にある。

### 通信の監査ログ

AI を呼び出すたびに、モデルに送った内容と応答がこの端末に記録される。設定ページの左メニュー「通信の監査ログ」で、一覧の確認、TSV ダウンロード、削除ができる。記録は 7 日間だけ保存される。詳しくは [プライバシーと送信データ](./site/content/ja/privacy.md)（[Web 版](https://armaniacs.github.io/jushoai/guides/privacy/)）を参照。

## 開発者向け

### 開発

    make install       # 依存の取得
    make dev           # 開発ビルド（Chrome が起動する）
    make build         # dist/chrome-mv3 に出力
    make build-firefox # dist/firefox-mv3 に出力
    make lint-firefox  # web-ext lint
    make test-build    # 両ブラウザのビルドと manifest を検査
    make e2e-firefox   # 実 Firefox で E2E（FIREFOX_BIN でバイナリ指定、HEADLESS=1 でヘッドレス）
    make zip-firefox   # Firefox 用の配布 zip を作る
    make test          # Vitest
    make typecheck     # tsc --noEmit
    make check         # typecheck + test + 両ブラウザのビルド + manifest 検査 + web-ext lint
    make zip           # dist に配布用 zip を作る
    make site          # ドキュメントサイトを site-dist に生成して検査する
    make site-serve    # site-dist を http://127.0.0.1:4173 で確認する
    make eval          # samples の corpus でルール分類の指標をローカル計測する（通信なし）
    make clean         # 生成物を削除

`make help` で一覧を表示する。

Firefox 向けの検査は `make test` に含まれない。manifest の検査は `tests/build/`（`*.build.ts`）、実 Firefox の E2E は `tests/e2e/`（`*.e2e.ts`）にある。

- Firefox の manifest は `data_collection_permissions`（`required: ['none']`、`optional: ['websiteContent']`）を宣言する。AI は、ユーザーがクラウドプロバイダを有効にしたときだけ入力欄のメタデータを送る。
- `strict_min_version` が 128.0 のため、`make lint-firefox` はこのキーが Firefox 140 / Android 142 未満で無視される旨の警告を 2 件出す。想定どおりで、対処は不要。
- E2E は Selenium と geckodriver で動かす。WebDriver は `moz-extension://` への遷移を拒否するため、拡張のページは Firefox の chrome コンテキストから開き、geckodriver は `--allow-system-access` で起動する。macOS では、ターミナルから Firefox を起動するために、ターミナルに `~/Library/Application Support/Firefox` へのアクセス（フルディスクアクセス）が必要。

### ソースからのビルド（AMO 審査用）

リリースには拡張機能の zip に加えて `jushoai-<バージョン>-sources.zip` を添付する。Node.js 24 と npm（動作確認は npm 11）で、展開したソースから次の手順で同じ zip を作れる。

    npm ci
    make zip-firefox   # dist/jushoai-<バージョン>-firefox.zip と -sources.zip

### 手動確認（Firefox）

実 Firefox での自動テスト（`make e2e-firefox`）が通っても、次の項目は自動化していないため手で確認する。

1. クラウドプロバイダを保存したとき、ホストの許可に加えてウェブサイトのコンテンツ送信への同意（データ収集の権限）の確認が出て、拒否するとバッジが「AI 権限なし」になる
2. API キーの保存と復号（IndexedDB と WebCrypto）が、保存後に設定ページを開き直しても働く
3. `about:debugging#/runtime/this-firefox` で拡張機能の背景ページ（イベントページ）を停止し、その後に「JushoAI で入力」を押しても、ボタンが反応して入力できる（一時的なアドオンは Firefox を終了すると登録内容ごと消えるため、再起動後の動作は確認できない）

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

`site/` に日本語と英語のサイトのソースがある。ガイドは `site/content/{ja,en}/*.md`、ランディングの文言は `site/i18n/{ja,en}.json`。ガイド内のリンクには相対パス `./<slug>.md` を使うため、同じファイルを GitHub の Markdown 表示でも GitHub Pages でもそのまま辿れる（Markdown 版の入口は `docs/user-guide.md` と `docs/user-guide.en.md`）。日英で見出しの数や文言のキーが違うとビルドが失敗する。`make site` で `site-dist/` に生成して検査し、`make site-serve` で確認する。公開は `.github/workflows/pages.yml`（main への push で GitHub Pages にデプロイ）。リポジトリ側で Pages の Source を GitHub Actions にする必要がある。
