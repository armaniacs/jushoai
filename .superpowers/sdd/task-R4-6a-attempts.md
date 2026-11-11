# Task R4-6a 試行ログ — 東京23区の区立図書館 候補URLリスト

- 目的: 東京23区の区立図書館サイトから実フォーム持ち静的ページ候補を100件以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-6b 以降)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須 (利用登録・電子申請の認証壁)・フォームなし・到達不能は除外。除外URLは理由を記録。OPAC蔵書検索窓のみのページはフォームなしとして除外。
- 既存44件 (`tests/target-url.md` @ base) および R4-1 試行済み183件 (`.superpowers/sdd/task-R4-1-attempts.md`) との重複なし (全件ドメイン・パス照合。既存は学校・企業・自治体総合窓口中心、本リストは区立図書館ドメイン中心で重複ドメイン自体なし。重複疑義が出た場合は当該Noに注記)。
- 確認方法: `curl -sL --max-time 20` + Chrome UA (macOS) で取得し、`<form`・`input`・`textarea`・`select` の有無と action・欄種を目視/計数。TRC系 (`viewer/opinion.html` 等)・LiCS系 (`mailform`)・ ward CMS系の静的フォームを有望とする。
- 有望の優先順位: P1 (欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい/機構が特殊) > P3 (予備)。
- 本ファイルおよび `task-R4-6a-report.md` のみ変更。`tests/target-url.md` への登録は R4-6b 以降が `make addurl` で行う。

## 自治体電子申請の機構 (概要メモ)

- 東京都共同電子申請 (`www.shinsei.elg-front.jp/tokyo2/` 系): 都内区市町村共通の申請ポータル。図書館の利用登録・ボランティア等が手続として載ることがあるが、到達にはログイン/利用者登録が要る場合が多く、curl 直取得では認証壁に当たる。個別手続URLは R4-6b で要精査。
- `s-kantan.jp` (品川区のレファレンス申込等): ログイン必須の簡易申請フォーム。curl ではログインページのみ。到達不能 (ログイン必須) として除外。
- 各区CMSのメールフォームゲートウェイ (板橋 `cgi-crm/CRM030`、足立 `cgi-bin/simple_faq/form.cgi`、新宿 `fb/fb.php`): 区公式サイト内の静的フォーム。項目はメールアドレス確認中心のことが多く、取込時は後続ステップを確認する。
- TRC系図書館サイト (`viewer/opinion.html` ご意見フォーム: 江東・北・練馬・文京と同系): 氏名/住所/電話3分割/本文/radio の静的フォーム。`opinion.html` 直GETで404になる館 (北・練馬) があり、セッション/リファラ依存とみられる。
- NEC LiCS系 (`mailform`: 中央・墨田・豊島・荒川・葛飾・大田と同系): `mailform` パスに Eメールレファレンス/お問い合わせの静的フォームがある館と404の館が混在。

## 試行ログ

| # | URL | 判定 | 除外理由 / フォーム概要 |
|---|-----|------|--------------------------|
| 1 | https://www.library.chiyoda.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200。form 4は `site-search/` 宛サイト内検索とOPAC検索 `opc.library.chiyoda` のみ。実問合せは別導線) |
| 2 | https://www.library.chiyoda.tokyo.jp/contact/ | 除外 | フォームなし (HTTP 200「お問い合わせ」。静的form 3はすべて `site-search/` 宛検索のみ。連絡先案内頁) |
| 3 | https://www.library.chiyoda.tokyo.jp/space/ | 除外 | フォームなし (HTTP 200「施設貸出・予約」。静的form 3はすべて `site-search/` 宛検索のみ。施設案内頁) |
| 4 | https://www.library.chiyoda.tokyo.jp/guidance/services/reference/ | 除外 | フォームなし (HTTP 200「調べ方の相談 (レファレンス)」。静的form 3はすべて `site-search/` 宛検索のみ) |
| 5 | https://www.library.city.chuo.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200「トップページ」。静的form 1は文字サイズ切替のみ。蔵書検索はJS/OPAC導線) |
| 6 | https://www.library.city.chuo.tokyo.jp/menucontents?pid=4020 | 除外 | フォームなし (HTTP 200「レファレンスサービス (調べもの相談)」。form・inputなしの案内頁) |
| 7 | https://www.library.city.chuo.tokyo.jp/contents?pid=4025 | 除外 | フォームなし (HTTP 200「団体貸出」。form・inputなしの案内頁) |
| 8 | https://www.library.city.chuo.tokyo.jp/mailform | 除外 | 到達不能 (HTTP 404 apache error。LiCS系mailformなし。荒川・葛飾には同系formあり→No.20/24) |
| 9 | https://www.library.shinjuku.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200。静的form 2は Google CSE とOPAC検索 `opc.library.shinjuku/.../search-stand` のみ) |
| 10 | https://www.city.shinjuku.lg.jp/soshiki/tosyo_00001.html | 有望 P3 | 静的フォーム (HTTP 200「中央図書館へのご意見・お問い合わせ：新宿区」。`action=/fb/fb.php`、hidden 8・radio q2/q3×各3・submit。区CMSゲートウェイ。欄が小さく後続ステップ要確認のためP3) |
| 11 | https://www.library.shinjuku.tokyo.jp/guide/index.html | 除外 | フォームなし (HTTP 200「利用案内」。静的form 1は Google CSE のみ) |
| 12 | https://www.library.shinjuku.tokyo.jp/download/index.html | 除外 | フォームなし (HTTP 200「各種ダウンロード」。静的form 1は Google CSE のみ。申請書DL案内頁) |
| 13 | https://www.lib.city.bunkyo.tokyo.jp/ | 除外 | OPAC検索窓のみ (HTTP 200。静的form 3は館内検索 `viewer/search/info.html` とOPAC検索 `OPW/OPWSRCHLIST.CSP` のみ) |
| 14 | https://www.lib.city.bunkyo.tokyo.jp/contact | 除外 | 到達不能 (HTTP 404「お探しのページを表示できません」。formなし) |
| 15 | https://www.library.sumida.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200「トップページ」。静的form 2は文字サイズ切替と蔵書検索導線のみ) |
| 16 | https://www.library.sumida.tokyo.jp/contents?pid=25 | 除外 | フォームなし (HTTP 200「図書館に関する問い合わせ」。静的form 1は文字サイズ切替のみ。問合せ先案内頁) |
| 17 | https://www.library.toshima.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200「トップページ」。静的form 1は文字サイズ切替のみ) |
| 18 | https://www.library.toshima.tokyo.jp/contents?pid=221 | 除外 | フォームなし (HTTP 200「お問い合わせ」。form・inputなしの問合せ先案内頁) |
| 19 | https://www.library.city.arakawa.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200「トップページ」。静的form 1は文字サイズ切替のみ) |
| 20 | https://www.library.city.arakawa.tokyo.jp/mailform | 有望 P1 | 静的実フォーム (HTTP 200「お問い合わせ」。`action=./mailform`、text `textName/textAddress/textMail/textTel`・radio `groupKind/groupReply`・textarea `textMessage`。LiCS系。氏名/住所/mail/tel+本文で多様性◎) |
