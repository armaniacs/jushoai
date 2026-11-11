# Task R4-1 試行ログ — PBI-208 Round4 候補URLリスト (再送)

- 目的: 就活人気・東証上場・日本TOP10000サイトの範囲で実フォーム持ち静的ページ候補を100件以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-2 以降)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外URLは理由を記録。
- 既存19件 (`tests/target-url.md` @ base 39d2aaf) との重複なし (全件ドメイン・パス照合済み)。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、`<form`・`input`・`textarea`・`select` の有無と action・欄種を目視/計数。動的取得フォーム (JS描画) は「除外: JS描画のみ」。
- 有望の優先順位: P1 (多様性が高く欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい/外部フォーム依存) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-2 以降が `make addurl` で行う。

## 試行ログ

| # | URL | 判定 | 除外理由 / フォーム概要 |
|---|-----|------|--------------------------|
| 1 | https://www.toyota.co.jp/inquiry/ | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 2 | https://www.honda.co.jp/customer/ | 除外 | フォームなし (HTTP 200「Q＆A・お問い合わせ」だが静的formは `action=/customer/qa-search/` の検索(search:q)1欄のみ。実窓口は別導線) |
| 3 | https://www.nissan.co.jp/INQUIRY/ | 除外 | 到達不能 (HTTP 404) |
| 4 | https://www.mazda.co.jp/inquiry/ | 除外 | フォームなし (HTTP 200→`/siteinfo/`「このサイトについて」に転送。静的formは `sitesearch.mazda.jp` 宛検索2件のみ) |
| 5 | https://www.subaru.co.jp/customer/ | 除外 | 到達不能 (HTTP 404「Page Not Found」。静的formは検索のみ) |
| 6 | https://www.suzuki.co.jp/about/contact/ | 除外 | 到達不能 (HTTP 200→`/error/404.html`「お探しのページがみつかりません」。formなし) |
| 7 | https://www.panasonic.com/jp/about/contact.html | 除外 | 到達不能 (HTTP 403 Access Denied・bot遮断) |
| 8 | https://www.sharp.co.jp/support/contact/ | 除外 | 到達不能 (curl失敗・code=000。接続不可/タイムアウト) |
| 9 | https://www.canon.jp/contact | 除外 | 到達不能 (curl失敗・code=000) |
| 10 | https://www.nikon.co.jp/support/contact/ | 除外 | 到達不能 (HTTP 404「ページが見つかりません」。formなし) |
| 11 | https://www.fujifilm.com/jp/ja/contact | 除外 | フォームなし (HTTP 200「お問い合わせ」ハブ。静的formなし。実フォームは `/jp/ja/form/*` 別導線→No.124-126で検証) |
| 12 | https://www.sony.com/ja/contact/ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 13 | https://www.toshiba.co.jp/contact/ | 除外 | フォームなし (HTTP 200→`global.toshiba/jp/contact/corporate.html`「お問い合わせ」ハブ。checkbox 1のみ。実フォームは外部 `go6.global.toshiba/GX/contactform`→No.168で検証) |
| 14 | https://www.mitsubishi-electric.co.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 15 | https://www.hitachi.co.jp/contact/ | 除外 | 到達不能 (HTTP 404) |
| 16 | https://www.fujitsu.com/jp/contact/ | 除外 | 到達不能 (HTTP 429 Vercel Security Checkpoint・bot/rate遮断) |
| 17 | https://www.nec.com/ja-jp/contact/ | 除外 | 到達不能 (HTTP 404) |
| 18 | https://www.shiseido.co.jp/contact/ | 除外 | 到達不能 (HTTP 404) |
| 19 | https://www.kao.com/jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは `kao.com/global/en/search/` 検索のみ) |
| 20 | https://www.kose.co.jp/contact/ | 除外 | 到達不能 (HTTP 404) |
| 21 | https://www.muji.com/jp/ja/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 22 | https://www.nitori-hd.co.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 23 | https://www.fastretailing.com/jp/about/contact/ | 除外 | 到達不能 (HTTP 404) |
| 24 | https://www.seven-eleven.co.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 25 | https://www.aeon.info/contact/ | 除外 | フォームなし (HTTP 200「お問い合わせ」だが静的formは `action=/` の検索(text:s)のみ。実窓口はSalesforce別導線→No.176で検証) |
| 26 | https://www.ito-yokado.co.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 27 | https://www.ajinomoto.co.jp/contact/ | 除外 | 到達不能 (HTTP 404「お探しのページが見つかりません」。静的formは `/jp/search/` 検索のみ) |
| 28 | https://www.meiji.co.jp/customer/ | 除外 | 到達不能 (HTTP 404。静的formは `search.meiji.co.jp` 検索のみ) |
| 29 | https://www.morinaga.co.jp/contact/ | 除外 | フォームなし (HTTP 200→`/faq/`「お問い合わせ窓口」。静的formは検索/FAQ絞込5件のみ。実窓口は別導線) |
| 30 | https://www.kikkoman.co.jp/customer/ | 除外 | フォームなし (HTTP 200「お客様相談センター」。静的formは `/search/` 検索のみ。実フォームは `form.kikkoman.co.jp`→No.156-158で検証) |
| 31 | https://www.jreast.co.jp/info/ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 32 | https://www.jr-central.co.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 33 | https://www.tokyometro.jp/support/inquiry/ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 34 | https://www.tobu.co.jp/contact/ | 除外 | 到達不能 (HTTP 404「404エラー」。formなし) |
| 35 | https://www.seibu-group.co.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 36 | https://www.ana.co.jp/ja/jp/support/contact/ | 除外 | 到達不能 (HTTP 404「指定されたページが見つかりません」。静的formは `search.ana.co.jp` 検索のみ) |
| 37 | https://www.jal.co.jp/jp/ja/support/contact/ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 38 | https://www.tepco.co.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは `search-tepco.dga.jp` 検索のみ) |
| 39 | https://www.tokyo-gas.co.jp/contact/ | 除外 | 到達不能 (HTTP 404「該当ページがございません」。formなし) |
| 40 | https://www.docomo.ne.jp/support/inquiry/ | 除外 | フォームなし (HTTP 200「お問い合わせ」だが実体は検索2件+ページ評価アンケート(radio survey_q1/q5・checkbox15・select1、`action=#` JS送信)。住所・氏名欄なしのため対象外) |
| 41 | https://www.au.com/support/inquiry/ | 除外 | フォームなし (HTTP 200「お問い合わせ」。静的form 8件すべて検索/FAQ検索系。実窓口は別導線→No.182で検証) |
| 42 | https://www.softbank.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは `/search_result/` 検索のみ) |
| 43 | https://www.mizuho-fg.co.jp/contact/ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 44 | https://www.smbc.co.jp/contact/ | 除外 | JS描画のみ (HTTP 200・size 1976・文字化けタイトル。静的formなし) |
| 45 | https://www.bk.mufg.jp/contact/ | 除外 | 到達不能 (HTTP 404「ファイルが見つかりません」) |
| 46 | https://www.japanpost.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは `/search/` 検索のみ) |
| 47 | https://www.kuronekoyamato.co.jp/contact/ | 除外 | フォームなし (HTTP 200→`/ytc/contact/`「お問い合わせ」ハブ。静的formは検索のみ。実フォームは `business.kuronekoyamato.co.jp/contact/form/`→No.161で検証) |
| 48 | https://www.sagawa-exp.co.jp/contact/ | 除外 | フォームなし (HTTP 200「お問い合わせ」ハブ。静的formは検索のみ。実窓口はe-service→No.163で検証) |
| 49 | https://www.nhk.or.jp/contact/ | 除外 | 到達不能 (HTTP 404「エラーが発生、もしくはページにアクセスできません」。formなし) |
| 50 | https://www.ntv.co.jp/contact/ | 除外 | 到達不能 (HTTP 404。formなし) |
| 51 | https://www.metro.tokyo.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404「お探しのページは見つかりません」。formなし) |
| 52 | https://www.city.shibuya.tokyo.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 53 | https://www.city.shinjuku.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404。formなし) |
| 54 | https://www.city.yokohama.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 55 | https://www.city.osaka.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 56 | https://www.city.nagoya.jp/contact/ | 除外 | 到達不能 (HTTP 404。formなし) |
| 57 | https://www.city.sapporo.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 58 | https://www.city.fukuoka.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404。formなし) |
| 59 | https://www.city.kyoto.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは `google.com/cse` 検索のみ) |
| 60 | https://www.pref.osaka.lg.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 61 | https://www.pref.kanagawa.jp/contact/ | 除外 | 到達不能 (HTTP 404「エラー404」。静的formは検索のみ) |
| 62 | https://www.city.kawasaki.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 63 | https://www.city.saitama.jp/contact/ | 除外 | 到達不能 (HTTP 404→`.lg.jp`。静的formは検索のみ) |
| 64 | https://www.city.chiba.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 65 | https://www.city.kobe.lg.jp/contact/ | 除外 | フォームなし (HTTP 200「神戸市：お問い合わせ」ハブ。静的formは検索2件のみ。実フォームは `contact.city.kobe.lg.jp` Webフォーム→No.139で検証) |
| 66 | https://www.yodobashi.com/ec/support/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 67 | https://www.biccamera.com/bc/support/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 68 | https://www.zozo.jp/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 69 | https://www.rakuten.co.jp/contact/ | 除外 | フォームなし (HTTP 200だが実体は楽天市場の店舗頁「ユーカ」。静的formは商品検索のみ。無関係頁) |
| 70 | https://www.amazon.co.jp/gp/help/customer/contact-us | 除外 | 到達不能 (HTTP 403・bot遮断。本文空。ログイン必須の可能性あり) |
| 71 | https://www.nissen.co.jp/contact/ | 除外 | 到達不能 (HTTP 404。NPSアンケート radio×11+textareaはあるが住所・氏名欄なしのため対象外) |
| 72 | https://www.bellemaison.co.jp/contact/ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 73 | https://www.felissimo.co.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 74 | https://www.his-j.com/contact/ | 除外 | 到達不能 (HTTP 404・文字化けタイトル。formなし) |
| 75 | https://www.jtb.co.jp/contact/ | 除外 | 到達不能 (HTTP 200→`Error/404Error.asp`。formなし) |
| 76 | https://www.gurunavi.com/contact/ | 除外 | 到達不能 (curl失敗・code=000) |
| 77 | https://www.ncgm.go.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formはGoogle検索のみ) |
| 78 | https://www.ncc.go.jp/jp/contact/ | 除外 | 到達不能 (HTTP 404「リニューアル」。静的formは検索のみ) |
| 79 | https://www.hosp.keio.ac.jp/contact/ | 除外 | 到達不能 (HTTP 404。formなし) |
| 80 | https://www.mhlw.go.jp/contact/ | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
