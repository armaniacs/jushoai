# Chrome Web Store Listing - JushoAI

> Last Updated: 2026-11-16

本書は JushoAI の Chrome ウェブストア公開に関する Single Source of Truth である。ストアの入力欄と本書の対応する章の内容が食い違った場合、本書を正としてストア側を直す。

## Store Listing

**Extension Name** [REQUIRED]

JushoAI

(manifest の name と一致。75 文字以内)

**Short Description** [REQUIRED]

日本語:

日本の申込フォームを1クリックで入力。姓名・フリガナ・分割住所に対応。入力前にプレビューで確認。

English:

Fill Japanese application forms in one click: split names, furigana, addresses. Review in a preview first.

(132 文字以内。検索結果とタイルに表示される。日本語の拡張のため日英を用意し、文言は README.md / README.en.md と整合させている)

**Detailed Description** [REQUIRED]

日本語:

JushoAI は、日本式の申込フォーム (姓名・フリガナ・分割された住所など) を、登録したプロファイルから正しい欄に1クリックで入力する拡張機能です。

主な機能
- 姓と名、フリガナ (全角カナ・ひらがな・半角カナ) 、郵便番号、電話番号、都道府県から番地・建物名までの分割欄に、欄ごとの形に合わせて入力します
- 欄の判定はまずルールで行い、迷う欄だけ、設定で選んだ AI (OpenAI 互換 API、Gemini、ブラウザー内蔵 AI) で分類します。入力する値は決まった処理で作り、AI に値を考えさせません
- 入力の前に、欄と値の一覧をプレビューで確認できます。入力済みの欄は上書きせず、最大文字数を超える値は警告して入力しません
- プロファイルも住所も10件まで登録できます。住所は使うプロファイルに結び付けられます
- フォームの近くに出る「JushoAI で入力」ボタンから使います。ボタンが邪魔なときはドラッグでどかせます
- AI を呼び出すたびに、送った内容と応答の記録を端末内に7日間だけ残します。設定ページの「通信の監査ログ」で確認・ダウンロード・削除できます

使い方
1. 拡張機能の設定ページで、プロファイル (氏名・フリガナ・メール・電話番号) と住所を登録します
2. フォームの近くに出る「JushoAI で入力」を押します
3. プレビューで欄と値の一覧を確認し、「入力する」を押します

プライバシーと権限のお願い
- 登録したプロファイルの値は外部に送りません。AI を使う設定にしたときだけ、ルールで判定できない欄の情報 (欄の名前・ラベル・入力例・見出しなど) を、選んだプロバイダーに送ります
- 「すべてのサイトのデータを読み取って変更する」の確認は、どの申込ページでも入力欄を見分けるために使います。ページを開いただけでは何も読み取らず、何も送りません
- 画面の表示は日本語専用です (意図的な仕様です)

サポート
- 要望・不具合は https://github.com/armaniacs/jushoai/issues/new/choose からお寄せください。公開の場なので氏名・住所・電話番号などの個人情報は書かないでください
- 使い方は https://armaniacs.github.io/jushoai/ にあります

English:

JushoAI fills Japanese application forms (split names, furigana, split addresses) from your saved profiles into the right fields in one click.

Key features
- Handles family/given name fields, furigana in three styles, postal codes, phone numbers, and addresses split from prefecture down to building name, shaping each value to its field
- Fields are classified by built-in rules first; only fields the rules cannot decide go to the AI provider you choose (an OpenAI-compatible API, Gemini, or the browser built-in AI). Entered values are produced by fixed processing, never invented by AI
- Before anything is entered, a preview lists every field and value for your approval. Fields that already have input are left alone, and values longer than the field limit are skipped with a warning
- Save up to 10 profiles and 10 addresses. Each address belongs to the profile that uses it
- Start from the "Fill with JushoAI" button near the form. If the button covers anything, drag it aside
- Every AI call leaves a log of the sent content and the reply on your device for 7 days. Review, download, or delete it from the audit log page in settings

How to use
1. Register your profile (name, furigana, email, phone) and addresses on the extension settings page
2. Press "Fill with JushoAI" near the form
3. Check the field and value list in the preview, then press "入力する"

Privacy and permission notes
- Your saved profile values are never sent anywhere. Only when you turn AI on, information about fields the rules cannot decide (field names, labels, examples, nearby headings) goes to the provider you chose
- The "read and change data on all sites" prompt is needed to tell fields apart on any application page. Merely opening a page reads and sends nothing
- The extension screens are intentionally Japanese-only

Support
- Send requests and bug reports via https://github.com/armaniacs/jushoai/issues/new/choose. Issues are public, so do not write personal information such as names, addresses, or phone numbers
- Usage guides are at https://armaniacs.github.io/jushoai/en/

(16,000 文字以内。ストアは書式を除去するので、箇条書きはハイフン、見出しは平文で書いている。実装の仕組みではなく、利用者の得られる結果だけを書いている)

**Category** [REQUIRED]

Productivity

**Single Purpose** [REQUIRED]

登録したプロファイルから、日本式フォームの分割された氏名・フリガナ・住所欄に、プレビュー確認のうえで入力する。

(英語の Single Purpose 欄には次を入れる: Fills split Japanese name, furigana, and address fields from saved profiles after a preview check.)

**Primary Language** [REQUIRED]

Japanese (画面の表示は日本語専用。ストアの説明文は日本語利用者向けに日英を用意する)

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128x128 PNG | Ready | public/icon/128.png |
| Screenshot 1 [REQUIRED] | 1280x800 or 640x400 | Ready | promo/2026-11-16-store-assets/01-before.png |
| Screenshot 2 [RECOMMENDED] | 1280x800 or 640x400 | Ready | promo/2026-11-16-store-assets/02-preview.png |
| Screenshot 3 [RECOMMENDED] | 1280x800 or 640x400 | Ready | promo/2026-11-16-store-assets/03-after.png |
| Screenshot 4 | 1280x800 or 640x400 | Ready | promo/2026-11-16-store-assets/04-profile.png |
| Screenshot 5 | 1280x800 or 640x400 | Ready | promo/2026-11-16-store-assets/06-ai.png |
| Small Promo Tile [RECOMMENDED] | 440x280 | Ready | promo/2026-11-16-store-assets/07-promo-440x280.png |
| Marquee Promo Tile | 1400x560 | Ready | promo/2026-11-16-store-assets/08-marquee-1400x560.png |

(実在の確認: public/icon/16.png (16x16)、32.png (32x32)、48.png (48x48)、128.png (128x128) はいずれも実寸どおり存在する。スクリーンショットの6枚とプロモタイル2種は tmp/store/ にあったもの (2026-10-08撮影、寸法は file で実測確認・内容は目視確認済み) を promo/2026-11-16-store-assets/ に移して追跡可能にした。予備として 05-address.png (設定の住所ページ) も同梱。撮影から版が進んでいるため、提出時に現行画面との一致だけ目視すること。promo/2026-10-10-store-registration/images/ の画像は記事用の素材であり、ストア用規定寸法のものではないため計上しない)

### Screenshot Notes

- Screenshot 1: フォームの近くに出る「JushoAI で入力」ボタンと AI 状態バッジ。どのページのどの位置に出るかが分かる画面にする
- Screenshot 2: 入力前のプレビュー。「どの欄に何が入るか」の一覧と「AI判定」の印が見える画面にする
- Screenshot 3: 入力後のフォーム。分割された欄に正しい形で値が入った状態を見せる
- Screenshot 4 (任意): 設定ページのプロファイル登録。10件まで登録できることが分かる画面にする
- Screenshot 5 (任意): 通信の監査ログ。送った内容を確認・削除できることが分かる画面にする
- 画像は 2026-10-08 撮影のものを流用する。提出時に現行画面と一致しているか目視し、大きく変わっていれば撮り直すこと。個人情報を含めないこと

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | 設定ページで登録したプロファイル・住所・起動しない URL の一覧・AI の設定を、この端末のブラウザー内に保存して読み戻すために使います。保存した内容は入力候補の表示と入力の実行のためだけに読みます。 |
| contextMenus | permissions | ページ上で右クリックしたときに「この欄に入力」の項目を出すために使います。フォーム全体ではなく、指さした特定の欄だけを入力したいときに選びます。 |
| https://*/* | optional_host_permissions | AI 判定でクラウドのプロバイダー (OpenAI 互換 API または Gemini) を選んだとき、その選んだ宛先への分類の問い合わせを送るために使います。初期状態では送らず、設定の保存時に毎回ブラウザーの確認が出て、拒否した場合は AI を使わずルールだけで動作します。 |
| http://localhost/* | optional_host_permissions | 自分のパソコン上で動く AI (Ollama や LM Studio など) を使う設定のときに、その宛先への分類の問い合わせを送るために使います。外部のサイトには送りません。保存時のブラウザーの確認は https 宛先と同様に出ます。 |
| http://127.0.0.1/* | optional_host_permissions | 上と同じく、自分のパソコン上で動く AI を数字表記の宛先で使う設定のときの送り先として使います。外部のサイトには送らず、保存時のブラウザーの確認も同様に出ます。 |
| content_scripts <all_urls> | content_scripts matches | 「JushoAI で入力」を押したページで、入力欄の種類 (氏名・フリガナ・住所など) を見分けてプレビューの一覧を作るために、表示中のページの入力欄を読み取ります。ページを開いただけでは読み取りも送信も行わず、入力の実行はプレビューの承認があった欄だけです。 |

(審査官向けの具体的な理由を各1文以上で記載。「動くために必要」は使っていない)

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

(登録したプロファイルと設定を端末内に保存し、AI 設定時のみ欄の情報を送信するため Yes と申告する)

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | Yes (登録した氏名・住所などを端末内に保存) | No (プロファイルの値は外部に送らない) | 保存した値を申込フォームに入力する | No |
| Health info | No | No | - | No |
| Financial info | No | No | - | No |
| Authentication info | Yes (AI 用 API キーを暗号化して端末内に保存) | Yes (AI 設定時のみ、選んだプロバイダーへの呼び出しの認証に使う) | 選んだ AI プロバイダーの利用認証 | 選んだプロバイダーのみ |
| Personal communications | No | No | - | No |
| Location | No | No | - | No |
| Web history | No | No | - | No |
| User activity | No | No | - | No |
| Website content | Yes (入力実行時に表示中の入力欄とそのラベル・見出しを読み取る) | AI 設定時のみ Yes (ルールで判定できない欄の情報だけを、選んだプロバイダーに送る。ブラウザー内蔵 AI は端末内で動き、外部に送らない) | 入力欄の分類 | 選んだクラウドのプロバイダーのみ (ブラウザー内蔵 AI の場合はなし) |

(実装との一致: プロファイル値は外部送信しないこと、AI 利用時のみ欄の情報 (name・label・placeholder・見出し・type・maxlength など) を選択プロバイダーに送ること、API キーは AES-GCM の封筒 (エンベロープ) で暗号化したまま保存し使うときだけ復号すること、通信先 host 権限は optional で設定保存時に要求することは、src/ai/* と src/llm/* の実装のとおりである。ラベルや見出しはページ上の文言のため、ページに表示されている個人情報が送信内容に含まれることがある)

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://armaniacs.github.io/jushoai/guides/privacy/

(ドキュメントサイトの「プライバシーと送信データ」の頁。提出前に URL が公開状態で開くことを目視確認すること。開かない場合は公開設定を直してから提出する)

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]

armaniacs (package.json の author と一致)

**Contact Email** [REQUIRED]

公開用のメールアドレスは設けず、下の Support URL (GitHub Issues) を連絡先とする。ダッシュボードの連絡先欄には開発者の Google アカウントのメールが入るため、公開欄の追加は不要と判断した (2026-11-16 確定)。

**Support URL / Email** [RECOMMENDED]

https://github.com/armaniacs/jushoai/issues/new/choose

**Homepage URL** [RECOMMENDED]

https://armaniacs.github.io/jushoai/ (package.json の homepage と一致)

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.39 | 2026-11-20 | fixture 雛形の type=date 対応と上書きガード、開発依存の更新（node-forge 脆弱性解消）、誕生日語 1 欄型判定の拡張、oxlint 導入。 | Submitted (release.yml 自動) |
| 0.1.38 | 2026-11-18 | 除外登録の即時取り消しと解除先案内、ダイアログの a11y（Esc・フォーカス・読み上げ）、除外 URL 一致規則の修正（origin + セグメント境界）、mail 語誤判定の修正、クラウド分類の待ち時間上限の復元、pattern ReDoS の fall-open。 | Submitted (release.yml 自動) |
| 0.1.37 | 2026-11-18 | ドキュメントサイトの全面改修（表とコード枠のキーボードスクロール、コピー結果の表示統一、現在地表示、FAQ アニメ、動画の遅延読込と MP4 化）。 | Submitted (release.yml 自動) |
| 0.1.36 | 2026-11-16 | samples corpus を 311 件に拡張。検索窓・会社名・FAX・email 読みの分類修正。除外登録の紹介動画と CHROMEWEBSTORE.md の新規作成。 | Submitted (release.yml 自動) |
| 0.1.35 | 2026-11-16 | 本書を新規作成。公開用メモの初版 (package.json の現行版)。 | Draft |

(0.1.36 以降の ZIP は release.yml がタグ push に反応してストアへ自動提出するため、本書の更新はリリースごとに版履歴 1 行を足すだけでよい。審査の通過状況はストアのコンソールで確認すること。スクリーンショットは 2026-10-08 撮影のままのため、UI を変える版を提出するときは現行画面との一致を目視してからにすること)

## Review Notes

### Known Issues / Limitations

審査や利用者の問い合わせで挙がりそうな点を事前に記す。

- 画面の表示は日本語専用である (意図的な仕様。英語表示には対応しない)
- クレジットカード番号・口座番号などの機微情報、認証コード・SMS 確認コード・2段階認証には対応しない
- ページ読み込み時の自動入力はしない。必ずプレビューの承認を経て入力する
- クロスオリジン iframe 内のフォーム、PDF・印刷帳票には対応しない
- チェックボックス、性別・年代以外のラジオボタンには対応しない
- すべてのサイトでの動作を保証するものではなく、判定できない欄は空欄のまま残す

### Rejection History

本書作成時点で記録なし。

| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| - | - | - | - |

(却下を受けたら本章に追記してから再提出する)
