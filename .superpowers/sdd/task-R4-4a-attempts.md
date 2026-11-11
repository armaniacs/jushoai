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
| 21 | https://www.dmgmori.co.jp/contact/ | 除外 | 到達不能 (DMG森精機6141。HTTP 404) |
| 22 | https://www.disco.co.jp/contact/ | 除外 | フォームなし (ディスコ6146。`/index.html` に転送。静的formなし) |
| 23 | https://www.toyota-shokki.co.jp/contact/ | 除外 | フォームなし (豊田自動織機6201。HTTP 200だが静的formなし。実窓口は豊田自動織機外・繊維機械系別導線) |
| 24 | https://www.smcworld.com/contact/ | 除外 | 到達不能 (SMC6273。HTTP 403 bot遮断) |
| 25 | https://www.komatsu.jp/contact/ | 除外 | 到達不能 (コマツ6301。HTTP 404「お探しのページ」。静的formは検索のみ。実窓口は `/ja/inquiry` 別導線) |
| 26 | https://www.shi.co.jp/contact/ | 除外 | フォームなし (住友重機械6302。HTTP 200ハブ。静的formは検索のみ。実フォームは `contact01.shi.co.jp`→No.159で検証) |
| 27 | https://www.hitachicm.com/contact/ | 除外 | 到達不能 (日立建機6305。HTTP 404) |
| 28 | https://www.kubota.co.jp/contact/ | 除外 | フォームなし (クボタ6326。HTTP 200ハブ。静的formは検索のみ。実フォームはエンジン事業部→No.160で検証) |
| 29 | https://www.ebara.co.jp/contact/ | 除外 | 到達不能 (荏原6361。`ebara.com` 転送後 HTTP 403 Access Denied) |
| 30 | https://www.daikin.co.jp/contact/ | 除外 | フォームなし (ダイキン6367。HTTP 200「総合」ハブ。静的formは検索のみ。実窓口は `/contact/consumer` 等別導線) |
| 31 | https://www.kurita.co.jp/contact/ | 除外 | 到達不能 (栗田工業6370。curl失敗・code=000) |
| 32 | https://www.daifuku.com/jp/contact/ | 除外 | フォームなし (ダイフク6383。HTTP 200だが静的formなし。実フォームは `inquiry.daifuku.com` 別導線) |
| 33 | https://www.tadano.co.jp/contact/ | 有望 P3 | 要精査 (タダノ6395。HTTP 200。静的欄あり input 16・textarea 1・select 2: `inquirytype`・`name`・`name-pronunciation`・`company-or-school-name`・`zip`・`in_prefecture`・`in_address`〜`3`・`tel`・`email`。ただし `action=#contact-form-container` でJS送信の可能性。取込時確認のため予備P3) |
| 34 | https://www.fujitec.co.jp/contact/ | 除外 | 到達不能 (フジテック6406。HTTP 404) |
| 35 | https://www.ckd.co.jp/contact/ | 除外 | 到達不能 (CKD6407。HTTP 404。静的formは検索のみ) |
| 36 | https://www.amano.co.jp/contact/ | 除外 | フォームなし (アマノ6436。HTTP 200ハブ。静的formは検索のみ。実フォームは form.run→No.161で検証) |
| 37 | https://www.juki.co.jp/contact/ | 除外 | フォームなし (JUKI6440。HTTP 200ハブだが静的formなし。実フォームは工業用ミシン系→No.162で検証) |
| 38 | https://www.max-ltd.co.jp/contact/ | 除外 | 到達不能 (マックス6454。HTTP 404。実窓口は `/toiawase/` 別導線) |
| 39 | https://www.glory.co.jp/contact/ | 除外 | フォームなし (グローリー6457。HTTP 200ハブ。静的formは検索のみ。実フォームは `form.glory.co.jp`→No.163で検証) |
| 40 | https://www.segasammy.co.jp/contact/ | 除外 | 到達不能 (セガサミーHD6460。HTTP 404。実フォームは `webcomms.segasammy.co.jp`→No.164で検証) |
| 41 | https://www.hoshizaki.co.jp/contact/ | 除外 | フォームなし (ホシザキ6465。`/contact/contact.pdf` に転送。PDFのみで静的formなし) |
| 42 | https://www.nsk.com/contact/ | 除外 | 到達不能 (日本精工6471。HTTP 404) |
| 43 | https://www.ntn.co.jp/contact/ | 除外 | 到達不能 (NTN6472。HTTP 403 Cloudflare) |
| 44 | https://www.jtekt.co.jp/contact/ | 除外 | フォームなし (ジェイテクト6473。トップ頁に転送。静的formは検索のみ。実窓口は `/support/contact.html`→No.165で検証) |
| 45 | https://www.nachi-fujikoshi.co.jp/contact/ | 除外 | フォームなし (不二越6474。HTTP 200ハブ。静的formは検索のみ。実フォームは `/contact/*.html` 別導線) |
| 46 | https://www.minebea.co.jp/contact/ | 除外 | 到達不能 (ミネベアミツミ6479。curl失敗・code=000) |
| 47 | https://www.thk.com/jp/contact/ | 除外 | フォームなし (THK6481。トップ頁に転送。静的formは製品検索のみ) |
| 48 | https://www.fuji.co.jp/contact/ | 除外 | フォームなし (FUJI6504。HTTP 200ハブ。静的formは検索のみ。実フォームは IR系→No.166で検証) |
| 49 | https://www.yaskawa.co.jp/contact/ | 除外 | フォームなし (安川電機6506。HTTP 200ハブ。静的formは検索のみ) |
| 50 | https://www.meidensha.co.jp/contact/ | 除外 | フォームなし (明電舎6508。HTTP 200ハブ。静的formは検索のみ) |
| 51 | https://www.nidec.com/jp/contact/ | 除外 | 到達不能 (ニデック6594。HTTP 404。静的formなし) |
| 52 | https://www.jvckenwood.com/jp/contact/ | 除外 | 到達不能 (JVCケンウッド6632。HTTP 404「Sorry」頁。静的入力欄はタブ切替用のみ。実窓口は `/jp/inquiry/` 別導線) |
| 53 | https://www.eizo.co.jp/contact/ | 除外 | フォームなし (EIZO6737。HTTP 200ハブ。静的formは google検索のみ。実窓口は採用エントリー等別導線) |
| 54 | https://www.nohmi.co.jp/contact/ | 除外 | 到達不能 (能美防災6744。HTTP 404。静的formは検索のみ) |
| 55 | https://www.elecom.co.jp/contact/ | 除外 | 到達不能 (エレコム6750。HTTP 403 Access Denied) |
| 56 | https://www.anritsu.com/ja-jp/contact/ | 除外 | 到達不能 (アンリツ6754。HTTP 404→Anritsu America頁。国選択のみで実フォームなし) |
| 57 | https://www.fujitsu-general.com/jp/contact/ | 除外 | フォームなし (富士通ゼネラル6755。HTTP 200だが静的formなし。実窓口は `/jp/contact/*.html` 別導線) |
| 58 | https://www.alpsalpine.com/j/contact/ | 除外 | 到達不能 (アルプスアルパイン6770。HTTP 403) |
| 59 | https://www.hirose.com/jp/contact/ | 除外 | 到達不能 (ヒロセ電機6806。HTTP 404。静的formなし) |
| 60 | https://www.maxell.co.jp/contact/ | 除外 | 到達不能 (マクセル6810。HTTP 404。実窓口は `/contacts/` 別導線) |
