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
