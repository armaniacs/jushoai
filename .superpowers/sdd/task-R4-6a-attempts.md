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
| 21 | https://www.lib.city.katsushika.lg.jp/ | 除外 | hub・検索窓のみ (HTTP 200「トップページ」。静的form 3は文字サイズ切替・蔵書検索導線のみ) |
| 22 | https://www.lib.city.katsushika.lg.jp/menucontents?pid=38 | 除外 | フォームなし (HTTP 200「レファレンスサービス」。静的form 1は文字サイズ切替のみの案内頁) |
| 23 | https://www.lib.city.katsushika.lg.jp/mailform | 有望 P1 | 静的実フォーム (HTTP 200「【利用登録のない方】Ｅメールレファレンスの入力はこちら」。`action=./mailform`、text `txtName/txtKana/txtMail/txtTel`・radio `radioReply`・textarea `txtQtext`。LiCS系。氏名/カナ/mail/tel+本文で多様性◎。ログイン不要版のため取込容易) |
| 24 | https://www.lib.city.ota.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200「トップページ」。静的form 2は文字サイズ切替・蔵書検索導線のみ) |
| 25 | https://www.lib.city.ota.tokyo.jp/bookinguserlist | 除外 | ログイン必須 (HTTP 200「利用者メニュー」。静的form 2は `./login` 宛ログインのみ。座席予約 `すわろっか` も認証壁内) |
| 26 | https://www.lib.city.ota.tokyo.jp/contents?pid=537 | 除外 | フォームなし (HTTP 200「登録・貸出・予約など」。form・inputなしの案内頁) |
| 27 | https://www.lib.city.shibuya.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200。静的form 2は `site-search/` 宛サイト内検索のみ) |
| 28 | https://www.lib.city.shibuya.tokyo.jp/guidance/requests/ | 除外 | フォームなし (HTTP 200「予約・リクエストについて」。静的form 2は `site-search/` 宛検索のみの案内頁) |
| 29 | https://www.lib.city.shibuya.tokyo.jp/guidance/reference-service/ | 除外 | フォームなし (HTTP 200「レファレンスサービス」。館内formは検索のみ。`frmMain` は外部・国会図書館レファレンス共同DB検索窓で当館フォームではない) |
| 30 | https://www.lib.city.shibuya.tokyo.jp/guidance/volunteer/ | 除外 | フォームなし (HTTP 200「図書館ボランティア」。静的form 2は `site-search/` 宛検索のみの案内頁) |
| 31 | https://www.library.city.suginami.tokyo.jp/ | 除外 | hub・検索窓のみ (HTTP 200。静的form 1は `/search/` 宛サイト内検索のみ) |
| 32 | https://www.library.city.suginami.tokyo.jp/guidance/registration/ | 除外 | フォームなし (HTTP 200「図書館利用登録」。静的form 1は `/search/` 宛検索のみの案内頁) |
| 33 | https://www.library.city.suginami.tokyo.jp/guidance/reservation/ | 除外 | フォームなし (HTTP 200「予約・リクエスト」。静的form 1は `/search/` 宛検索のみの案内頁) |
| 34 | https://www.library.city.suginami.tokyo.jp/guidance/group/ | 除外 | フォームなし (HTTP 200「団体利用」。静的form 1は `/search/` 宛検索のみの案内頁) |
| 35 | https://www.library.city.suginami.tokyo.jp/research/reference/ | 除外 | フォームなし (HTTP 200「レファレンス (資料探しの相談など)」。静的form 1は `/search/` 宛検索のみの案内頁) |
| 36 | https://library.city.tokyo-nakano.lg.jp/ | 除外 | OPAC検索窓のみ (HTTP 200「中野区立図書館」。静的form 2はOPAC検索 `kn.licsre-saas.jp/.../searchinp` とイベント絞込 `/event` のみ) |
| 37 | https://library.city.tokyo-nakano.lg.jp/guide/ | 除外 | フォームなし (HTTP 200「利用案内」。form・inputなしの案内頁) |
| 38 | https://library.city.tokyo-nakano.lg.jp/guide/regist.html | 除外 | フォームなし (HTTP 200「利用者登録」。form・inputなしの案内頁) |
| 39 | https://library.city.tokyo-nakano.lg.jp/reference/ | 除外 | フォームなし (HTTP 200「調べもの相談」。館内formは外部・国会図書館レファレンス共同DB検索窓のみ) |
| 40 | https://library.city.tokyo-nakano.lg.jp/contact/ | 除外 | フォームなし (HTTP 200「お問合せ」。formなし。mailto `toshokan@nakano-library.jp`・電話/FAX・区民の声リンクの案内頁) |
| 41 | https://www.city.tokyo-nakano.lg.jp/kusei/public/goiken/kuseihenogoiken.html | 除外 | フォームなし (HTTP 200「区政へのご意見・ご要望をお寄せください」。formなしの広聴案内頁。実窓口は提案箱アーカイブ→No.42) |
| 42 | https://www.city.tokyo-nakano.lg.jp/kusei/public/goiken/teianbako/index.html | 除外 | フォームなし (HTTP 200「区政への提案箱」。formなし。過去の提案・回答の公表アーカイブ) |
| 43 | https://www.library.city.kita.lg.jp/ | 除外 | OPAC検索窓のみ (HTTP 200。静的form 3は館内検索 `viewer/search/info.html` とOPAC検索 `OPWSRCHLIST.CSP` のみ) |
| 44 | https://www.library.city.kita.lg.jp/viewer/info.html?id=344 | 除外 | フォームなし (HTTP 200「北区メールマガジン登録」。館内formは検索2+問合せ1だが、問合せ `opinion.html` は直GETで404→No.45。告知頁自体に静的フォームなし) |
| 45 | https://www.library.city.kita.lg.jp/viewer/opinion.html | 除外 | 到達不能 (HTTP 404。TRC系ご意見フォーム。info頁のformは `method=get action=../viewer/opinion.html` だがcurl直GET・クエリ付きともに404。セッション依存とみられる) |
| 46 | https://www.library.city.kita.lg.jp/viewer/info.html?id=87 | 除外 | フォームなし (HTTP 200「予約取置等連絡用メールアドレスについて」。館内formは検索2+問合せ(→No.45と同様404)のみ) |
| 47 | https://www.lib.nerima.tokyo.jp/index.html | 除外 | OPAC検索窓のみ (HTTP 200。静的form 3は館内検索 `viewer/search/info.html` とOPAC検索 `OPWSRCHLIST.CSP` のみ) |
| 48 | https://www.lib.nerima.tokyo.jp/viewer/info.html?id=2939 | 除外 | フォームなし (HTTP 200「図書館利用者アンケート」。静的form 2は館内検索のみ。回答は別導線の告知頁) |
| 49 | https://www.lib.nerima.tokyo.jp/viewer/info.html?id=2248 | 除外 | フォームなし (HTTP 200「大泉図書館 ボランティア部」。静的form 2は館内検索のみの案内頁) |
| 50 | https://www.lib.nerima.tokyo.jp/viewer/opinion.html | 除外 | 到達不能 (HTTP 404。TRC系ご意見フォームなし。No.45と同形) |
| 51 | https://www.lib-minato.jp/ | 除外 | 検索窓のみ (HTTP 200。静的form 4は Google CSE とOPAC検索 `licsxp-opac/WOpac*` のみ) |
| 52 | https://www.lib-minato.jp/contact/ | 除外 | フォームなし (HTTP 200「お問い合わせ」。静的form 3は Google CSE とOPAC検索のみ。実問合せはOPAC/電話導線) |
| 53 | https://www.lib-minato.jp/reserve | 除外 | OPAC検索窓のみ (HTTP 200「蔵書検索・予約」。静的form 3は Google CSE とOPAC検索のみ。予約自体はOPAC認証壁内) |
| 54 | https://www.lib-minato.jp/news2/?id=319 | 除外 | フォームなし (HTTP 200「電子申請サービス再開のお知らせ」。静的form 3は検索のみ。電子申請本体は外部・認証壁) |
| 55 | https://www.city.itabashi.tokyo.jp/library/index.html | 除外 | 検索窓のみ (HTTP 200「板橋区立図書館」。静的form 2はサイト内検索CSEと蔵書検索 `SearchForm` のみ) |
| 56 | https://www.city.itabashi.tokyo.jp/cgi-crm/CRM030/CRM030_004/G7507000000/2000033 | 有望 P2 | 静的フォーム (HTTP 200「教育委員会事務局中央図書館への問い合わせ」。区CMSゲートウェイ、text `MailAddress/MailAddressKakunin`(email確認2欄)+Token。メールアドレス確認ステップの実フォーム。後続ステップ要確認のためP2) |
| 57 | https://www.city.taito.lg.jp/library/index.html | 除外 | OPAC検索窓のみ (HTTP 200「台東区立図書館」。静的form 1はOPAC検索 `OPWSRCHLIST.CSP` のみ) |
| 58 | https://www.city.taito.lg.jp/library/download/index.html | 除外 | フォームなし (HTTP 200「申請書ダウンロード」。静的form 2は Google CSE のみ。申請書DL案内頁) |
| 59 | https://www.city.taito.lg.jp/library/service/sonota/reference.html | 除外 | フォームなし (HTTP 200「中央図書館レファレンス休止」。静的form 2は Google CSE のみのお知らせ頁) |
| 60 | https://www.city.meguro.tokyo.jp/kosodatekyouiku/shakaikyouiku/library/index.html | 除外 | 検索窓のみ (HTTP 200「目黒区立図書館」。静的form 2は区サイト内検索のみ) |
| 61 | https://www.city.meguro.tokyo.jp/contact.html | 除外 | フォームなし (HTTP 200「お問い合わせ」。静的form 2は区サイト内検索のみ。区の連絡先ディレクトリ頁) |
| 62 | https://www.city.meguro.tokyo.jp/kouhou/kusei/kouchou/homepage.html | 除外 | フォームなし (HTTP 200「目黒区公式ウェブサイト利用者アンケート」。静的form 2は区サイト内検索のみ。実アンケートは外部LoGo→No.63) |
| 63 | https://logoform.jp/form/KeTk/51125 | 除外 | 到達不能 (HTTP 403 bot遮断。本文空。目黒区サイトアンケートのLoGoフォーム。自治体LoGoフォーム機構の利用例として記録) |
| 64 | https://logoform.jp/f/bFtSC | 除外 | 到達不能 (HTTP 403 bot遮断。本文空。文京区立図書館利用者アンケートのLoGoフォーム→No.65の回答先。機構記録) |
| 65 | https://www.lib.city.bunkyo.tokyo.jp/viewer/info.html?id=901 | 除外 | フォームなし (HTTP 200「令和8年度文京区立図書館利用者アンケート」。静的form 2は館内検索のみ。実回答は外部LoGo→No.64) |
| 66 | https://www.city.adachi.tokyo.jp/bunka/library/index.html | 除外 | 検索+起動ボタンのみ (HTTP 200「足立区立図書館トップページ」。館内formは検索とメールフォーム起動POST `simple_faq/form.cgi` のみ。実フォームはPOSTゲートウェイ内→No.68) |
| 67 | https://www.city.adachi.tokyo.jp/toshokan/tikyuunoarukikata.html | 除外 | 検索+起動ボタンのみ (HTTP 200トークイベント頁。館内formは検索とメールフォーム起動POSTのみ。問合せ先は中央図書館利用サービス係・電話/FAX併記) |
| 68 | https://www.city.adachi.tokyo.jp/cgi-bin/simple_faq/form.cgi | 除外 | 到達不能相当 (HTTP 200「入力エラー」。直GETは「許可されていないサイトからのアクセス」。リファラ/POST必須の区メールフォームゲートウェイ。足立区の機構として記録) |
| 69 | https://www.library.city.edogawa.tokyo.jp/ (→/toshow/index.php) | 除外 | フォームなし (HTTP 200「江戸川区立図書館ホームページ」。formなし。PDFお知らせと電子図書・指定管理案内へのリンク集→No.70/71) |
| 70 | https://www.library.city.edogawa.tokyo.jp/toshow/edogawa_library_e_book_service.html | 除外 | フォームなし (HTTP 200電子図書案内。form・inputなし) |
| 71 | https://www.library.city.edogawa.tokyo.jp/toshow/sitei_kanri.html | 除外 | フォームなし (HTTP 200指定管理案内。form・inputなし) |
| 72 | https://library.city.shinagawa.tokyo.jp/ | 除外 | postbackのみ (HTTP 200。静的form 1はDNN `__VIEWSTATE` 系postbackのみ。実問合せは区連絡先→No.76・電子申請→No.75) |
| 73 | https://library.city.shinagawa.tokyo.jp/tabid/171/Default.aspx | 除外 | フォームなし (HTTP 200「よくある質問 (ボランティア)」。formは `__VIEWSTATE` 系postbackのみのFAQ頁) |
| 74 | https://library.city.shinagawa.tokyo.jp/tabid/173/Default.aspx | 除外 | フォームなし (HTTP 200「よくある質問 (予約)」。同上FAQ頁) |
| 75 | https://s-kantan.jp/city-shinagawa-u/profile/userLogin_initDisplay.action | 除外 | ログイン必須 (HTTP 200「品川区電子申請サービス：利用者ログイン」。`userLoginForm` はID/パスワードのみ。レファレンス申込等の実手続は認証壁内。s-kantan機構の記録) |
| 76 | https://www.city.shinagawa.tokyo.jp/contacts/kyoikuiinkai/1004815.html | 除外 | フォームなし (HTTP 200「教育委員会事務局品川図書館」。静的form 1は区サイト内検索のみ。連絡先案内頁) |
| 77 | https://www.city.setagaya.lg.jp/shisetsu/library/category/12004.html | 除外 | 検索窓のみ (HTTP 200「図書館」。静的form 3は区サイト内検索のみ。分館一覧の案内頁→No.78/79) |
| 78 | https://www.city.setagaya.lg.jp/02261/9017.html | 除外 | フォームなし (HTTP 200「烏山図書館」。静的form 3は区サイト内検索のみの分館案内頁) |
| 79 | https://www.city.setagaya.lg.jp/02261/9022.html | 除外 | フォームなし (HTTP 200「経堂図書館」。同上の分館案内頁) |
| 80 | https://www.koto-lib.tokyo.jp/ | 除外 | OPAC検索窓のみ (HTTP 200。静的form 3は館内検索 `viewer/search/info.html` とOPAC検索 `OPWSRCHLIST.CSP` のみ) |
| 81 | https://www.koto-lib.tokyo.jp/viewer/info.html?id=2265 | 除外 | フォームなし (HTTP 200「亀戸図書館ボランティア募集」。館内formは検索2+問合せ1のみ。申込方法はカウンター・電話) |
| 82 | https://www.koto-lib.tokyo.jp/viewer/opinion.html | 有望 P1 | 静的実フォーム (HTTP 200「お問い合わせ送信フォーム」。TRC系、`item0` 氏名・`item1` 住所・`item2_0/1/2` tel3分割・`item3/4`・textarea `item5`・radio `item6`。氏名/住所/tel分割+本文で多様性◎) |
| 83 | https://ebwebreserve7.tackport.co.jp/eboothweb_itbs2/areainfo/login | 除外 | JS描画のみ (HTTP 200「板橋区立中央図書館WEB予約」。form・inputなし。座席予約はJS+認証壁内) |
| 84 | https://opc.library.shinjuku.tokyo.jp/winj/opac/login.do?lang=ja&dispatch=/opac/mylibrary.do | 除外 | ログイン必須 (HTTP 200。`LoginForm` は利用者番号/パスワードのみの認証壁) |
| 85 | https://opc.library.shinjuku.tokyo.jp/winj/opac/search-detail.do?lang=ja | 除外 | OPAC検索窓のみ (HTTP 200。`SearchDetailForm` は蔵書詳細検索で実フォームなし。input 98・select 18は検索条件) |
| 86 | https://opc.library.chiyoda.tokyo.jp/winj/opac/search-standard.do?lang=ja | 除外 | OPAC検索窓のみ (HTTP 200。`SearchForm/SearchDetailForm` は蔵書検索で実フォームなし) |
| 87 | https://library.city.tokyo-nakano.lg.jp/event | 除外 | 絞込のみ (HTTP 200「イベント」。館内form 1は `evt_filter` カレンダー絞込 hidden のみ) |
| 88 | https://www.lib.nerima.tokyo.jp/viewer/info.html?id=2904 | 除外 | フォームなし (HTTP 200「ボランティアの時間」。静的form 2は館内検索のみの告知頁) |
| 89 | https://www.library.sumida.tokyo.jp/info?pid=5352 | 除外 | 申込受付終了 (HTTP 200まちかどコンサート申込案内。`bookingPanel` formは「満員」表示のみで入力欄なし。LiCSイベント予約は認証壁内の機構として記録) |
| 90 | https://www.lib.city.ota.tokyo.jp/info?pid=616 | 除外 | フォームなし (HTTP 200読み聞かせボランティア講座。form・inputなしの告知頁。申込は別手段) |
| 91 | https://www.library.city.suginami.tokyo.jp/library/koenji/ | 除外 | 検索のみ (HTTP 200「高円寺図書館」。館内formはサイト内検索と館選択selectのみの分館案内頁) |
| 92 | https://www.library.city.chuo.tokyo.jp/login | 除外 | ログイン必須 (HTTP 200「ログイン」。`loginPage` は利用者番号/パスワードのみの認証壁) |
| 93 | https://www.koto-lib.tokyo.jp/opw/OPW/OPWSRCHLIST.CSP | 除外 | フォームなし (HTTP 200「検索結果一覧」。直GETは結果頁でformなし。OPAC検索窓の到達先) |
| 94 | https://www.lib-minato.jp/news/?id=309 | 除外 | フォームなし (HTTP 200図書館アンケート告知。静的form 3は検索のみ。実回答は別導線) |
| 95 | https://www.city.adachi.tokyo.jp/toshokan/chiikibunka/toshokan/1129hotsuka.html | 除外 | フォームなし (HTTP 200保塚図書館イベント。静的form 2は区サイト内検索のみの告知頁) |
| 96 | https://www.city.adachi.tokyo.jp/toshokan/chiikibunka/toshokan/100111241.html | 除外 | 検索+起動ボタンのみ (HTTP 200江南コミュニティ図書館イベント。館内formは検索とメールフォーム起動POSTのみ→No.68) |
| 97 | https://www.city.setagaya.lg.jp/02261/9029.html | 除外 | フォームなし (HTTP 200「下馬図書館」。静的form 3は区サイト内検索のみの分館案内頁) |
| 98 | https://library.city.tokyo-nakano.lg.jp/facility/chuo.html | 除外 | フォームなし (HTTP 200「中央図書館」。form・inputなしの施設案内頁) |
| 99 | https://www.city.itabashi.tokyo.jp/library/bologna/fair/2000287/2000998.html | 除外 | フォームなし (HTTP 200ボローニャ絵本展。静的form 1はサイト内検索のみの展示案内頁) |
| 100 | https://www.library.city.kita.lg.jp/viewer/info.html?id=468 | 除外 | フォームなし (HTTP 200パソコン席Web予約のお知らせ。館内formは検索2+問合せ(→No.45と同様404)のみ。実予約は認証壁) |
| 101 | https://www.lib.city.ota.tokyo.jp/contents?pid=593 | 除外 | フォームなし (HTTP 200座席予約システム「すわろっか」。form・inputなしの案内頁。実予約は認証壁内) |
| 102 | https://www.library.sumida.tokyo.jp/login | 除外 | ログイン必須 (HTTP 200「ログイン」。`loginPage` は利用者番号/パスワードのみの認証壁) |
| 103 | https://www.library.city.arakawa.tokyo.jp/login | 除外 | ログイン必須 (HTTP 200「ログイン」。`loginPage` は利用者番号/パスワードのみの認証壁) |
| 104 | https://www.lib.city.katsushika.lg.jp/login | 除外 | ログイン必須 (HTTP 200「ログイン」。`loginPage` は利用者番号/パスワードのみの認証壁) |
| 105 | https://www.library.toshima.tokyo.jp/menucontents?pid=23 | 除外 | フォームなし (HTTP 200「利用案内」。form・inputなしの案内頁) |
| 106 | https://www.library.toshima.tokyo.jp/menucontents?pid=39 | 除外 | フォームなし (HTTP 200「図書館案内」。form・inputなしの案内頁) |
| 107 | https://www.city.toshima.lg.jp/142/bunka/shogai/toshokan/2211201521.html | 除外 | フォームなし (HTTP 200「豊島の図書館 (統計)」。formなしの区統計頁) |
| 108 | https://www.library.toshima.tokyo.jp/rentallist | 除外 | ログイン必須 (HTTP 200「ログイン」。貸出利用状況照会は `loginPage` 認証壁内) |
| 109 | https://www.library.city.edogawa.tokyo.jp/opac/ | 除外 | 到達不能相当 (HTTP 200→`/toshow/errpage.html` に転送。OPACパスなし。`winj/opac/search-standard.do` も同一エラー頁。江戸川のOPACは館サイト外導線) |
| 110 | https://www.nakano-lib.jp/0000000041.html | 除外 | 対象外 (HTTP 200「パスワードについて」。ドメイン `nakano-lib.jp` は長野県中野市立図書館で、東京都中野区ではない。同ドメインのトップも中野市。混同注意として記録。正規の中野区立図書館は `library.city.tokyo-nakano.lg.jp`→No.36-40) |

## 集計

- 試行総数: 110件 (No.1-110。要求100件以上を満たす)
- 有望: 5件 (P1 3件・P2 1件・P3 1件)
  - P1 (3): No.20 (荒川 mailform・氏名/住所/mail/tel+本文)、No.23 (葛飾 Eメールレファレンス・氏名/カナ/mail/tel+本文)、No.82 (江東 opinion・氏名/住所/tel3分割+本文/radio)
  - P2 (1): No.56 (板橋 CRM・MailAddress確認2欄。後続ステップ要確認)
  - P3 (1): No.10 (新宿 fb.php・radio小規模。区CMSゲートウェイ)
- 除外: 105件 (内訳: フォームなし・検索窓のみ 71 / ログイン必須 10 / 到達不能・404 9 / JS描画のみ 1 / POSTゲートウェイ・受付終了等その他 12 / 対象外1・重複疑義0)
- 既存44件 (`tests/target-url.md`) との重複: なし (全110件をドメイン・パス照合。既存は学校・企業・自治体総合窓口中心で区立図書館ドメインなし)
- R4-1試行済み183件との重複: URL重複なし (全110件を照合)。host重複は1件のみ: `www.city.shinjuku.lg.jp` (R4-1 No.53 `/contact/` は404除外 vs 本リストNo.10 `/soshiki/tosyo_00001.html` は200実フォーム。pathが異なる別頁のため重複に当たらない。なお中野区/中野市の表記ゆれはNo.110で明示)
- 区別件数 (23区まんべんなく3件以上): 千代田5・中央5・港5・新宿6・文京4・台東3・墨田4・江東4・品川5・目黒4・大田5・世田谷4・渋谷4・中野9・杉並6・豊島6・北5・荒川3・板橋4・練馬5・足立5・葛飾4・江戸川4 (+対象外1)
- 有望の多様性: LiCS系mailform (荒川・葛飾) / TRC系opinion (江東) / 区CMSゲートウェイ (板橋CRM・新宿fb)。いずれも氏名・住所/tel・メール・本文の組合せで、既存corpus (学校・企業中心) と機構が異なる。葛飾はログイン不要版レファレンスのため取込容易性が高い
- 機構メモ: 東京都共同電子申請・s-kantan (品川)・LoGoフォーム (目黒・文京アンケート) はいずれも認証壁/bot遮断でcurl不可。足立 `simple_faq/form.cgi` はPOSTゲートウェイ。北・練馬のTRC系opinionは直GETで404 (セッション依存)
