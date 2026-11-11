# Task R4-4a 試行ログ — 東証5000番台以降企業の候補URLリスト

- 目的: 証券コード5000番以降 (5000〜9999) の東証上場企業から実フォーム持ち静的ページ候補を100件以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-4b 以降)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外URLは理由を記録。
- 既存44件 (`tests/target-url.md`) および R4-1 試行済み183件 (`.superpowers/sdd/task-R4-1-attempts.md`) との重複なし (全件URL照合済み。末尾スラッシュ差異の実質重複も排除)。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、`<form`・`input`・`textarea`・`select` の有無と action・欄種を目視/計数。動的取得フォーム (JS描画) は「除外: JS描画のみ」。
- 有望の優先順位: P1 (欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい・コード化項目) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-4b 以降が `make addurl` で行う。

## 試行ログ

| # | URL | 判定 | 除外理由 / フォーム概要 |
|---|-----|------|--------------------------|
| 1 | https://www.nipponsteel.com/contact/ | 除外 | フォームなし (日本製鉄5401。HTTP 200「お問い合わせ」ハブ。静的formは `/search.html` 検索のみ。実フォームは spiral-site・`/product/contact/` 別導線) |
| 2 | https://www.jfe-holdings.co.jp/contact/ | 除外 | 到達不能 (JFE-HD5411。HTTP 404) |
| 3 | https://www.tokyosteel.co.jp/contact/ | 有望 P1 | 静的実フォーム (東京製鐵5423。HTTP 200。`action=./`、input 10・textarea 1・select 1。`company`・`department`・`name`・`tel`・`email`確認2欄・`fax`・`message`。鉄鋼メーカー。多様性◎) |
| 4 | https://www.mitsui-kinzoku.co.jp/contact/ | 除外 | 到達不能 (三井金属5706。HTTP 404) |
| 5 | https://www.mmc.co.jp/contact/ | 除外 | 到達不能 (三菱マテリアル5711。HTTP 404) |
| 6 | https://www.smm.co.jp/contact/ | 除外 | フォームなし (住友金属鉱山5713。HTTP 200ハブ。静的formは `/search/` 検索2件のみ。実フォームは `/contact/product/` 等別導線) |
| 7 | https://www.dowa.co.jp/contact/ | 除外 | フォームなし (DOWA-HD5714。`hd.dowa.co.jp/ja/index.html` に転送。静的formは検索のみ。実窓口は `/ja/contact.html` 別導線) |
| 8 | https://www.furukawa.co.jp/contact/ | 除外 | 到達不能 (古河電工5801。HTTP 404「お探しのページは見つかりません」。静的formは検索のみ。実フォームは spiral-site→No.167で検証) |
| 9 | https://www.sei.co.jp/contact/ | 除外 | フォームなし (住友電工5802。`sumitomoelectric.com/jp/contact-us` に転送。静的formは検索2件のみ) |
| 10 | https://www.fujikura.co.jp/contact/ | 除外 | フォームなし (フジクラ5803。HTTP 200ハブ。静的formは `/search.html` 検索のみ。実フォームは `/contact/company/` 等別導線) |
| 11 | https://www.agc.com/contact/ | 除外 | フォームなし (AGC5201。HTTP 200ハブ。静的formは検索のみ) |
| 12 | https://www.nsg.com/contact/ | 除外 | 到達不能 (日本板硝子5202。HTTP 404) |
| 13 | https://www.taiheiyo-cement.co.jp/contact/ | 有望 P1 | 静的実フォーム (太平洋セメント5233。HTTP 200。form.run宛 `action`、input 12・textarea 10・select 3。`name`・`kana`・`email`確認2欄・`postal`・`address`・`tel`・`fax`・`organization`。窯業。多様性◎) |
| 14 | https://www.toto.co.jp/contact/ | 除外 | 到達不能 (TOTO5332。HTTP 404 size 290) |
| 15 | https://www.ngk.co.jp/contact/ | 除外 | フォームなし (日本ガイシ5333。HTTP 200ハブ。静的formは検索のみ。実フォームは `/contact/input?form_type=N`→No.157で検証) |
| 16 | https://www.toyo-seikan.co.jp/contact/ | 除外 | 到達不能 (東洋製罐5901。HTTP 404) |
| 17 | https://www.lixil.com/jp/contact/ | 除外 | フォームなし (LIXIL5938。HTTP 200ハブ。静的formは検索のみ。実フォームは SMP→No.158で検証) |
| 18 | https://www.rinnai.co.jp/contact/ | 除外 | フォームなし (リンナイ5947。HTTP 200ハブ。静的formは検索のみ) |
| 19 | https://www.okuma.co.jp/contact/ | 除外 | 到達不能 (オークマ6103。HTTP 404。静的formは google検索のみ) |
| 20 | https://www.amada.co.jp/contact/ | 除外 | 到達不能 (アマダ6113。HTTP 404) |
