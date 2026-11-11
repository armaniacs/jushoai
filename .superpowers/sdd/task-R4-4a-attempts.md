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
| 61 | https://www.furuno.co.jp/contact/ | 除外 | フォームなし (古野電気6814。HTTP 200だが静的入力欄は `__VIEWSTATE` 系のみ。実入力欄なし。実フォームは `/contact/cnt_marine*.html` 別導線) |
| 62 | https://www.yokogawa.co.jp/contact/ | 除外 | フォームなし (横河電機6841。HTTP 200ハブ。静的formは検索3件のみ) |
| 63 | https://www.azbil.com/jp/contact/ | 除外 | 到達不能 (アズビル6845。HTTP 404。静的formは検索のみ。実フォームは `form.azbil.com`→No.168で検証) |
| 64 | https://www.horiba.com/jp/contact/ | 除外 | 到達不能 (堀場製作所6856。curlタイムアウト・code=000) |
| 65 | https://www.advantest.com/ja/contact/ | 有望 P1 | 静的実フォーム (アドバンテスト6857。HTTP 200。`action=./`、input 8・textarea 2・select 1。`lname`・`fname`・`address`・`email`・`company`・`section`・`phone`・`subject`・`message`。半導体検査装置。多様性◎) |
| 66 | https://www.keyence.co.jp/contact/ | 除外 | フォームなし (キーエンス6861。HTTP 404「エラー」頁。静的formは検索のみ。実フォームは `/inquiry/*`→No.169で検証) |
| 67 | https://www.hioki.co.jp/contact/ | 除外 | フォームなし (HIOKI6866。製品頁に転送。静的formは検索のみ。実窓口は zendesk別導線) |
| 68 | https://www.sysmex.co.jp/contact/ | 除外 | フォームなし (シスメックス6869。HTTP 200ハブ。静的formは検索のみ。実フォームは `/contact/input?inquiry_type=N`→No.170で検証) |
| 69 | https://www.lasertec.co.jp/contact/ | 除外 | フォームなし (レーザーテック6920。HTTP 200ハブ。静的formは検索のみ。実フォームは SMP→No.171で検証) |
| 70 | https://www.stanley.co.jp/contact/ | 除外 | フォームなし (スタンレー電気6923。企業頁に転送。静的formは検索のみ。実窓口は `/jp/inquiry/` 別導線) |
| 71 | https://www.ushio.co.jp/jp/contact/ | 除外 | 到達不能 (ウシオ電機6925。HTTP 404。実窓口は `/jp/inquiry_menu.html` 別導線) |
| 72 | https://www.fanuc.co.jp/contact/ | 除外 | 到達不能 (ファナック6954。HTTP 404) |
| 73 | https://www.rohm.co.jp/contactus/ | 有望 P2 | 要精査 (ローム6963。HTTP 200。Liferay contactusポートレット静的form (`last_name`・`first_name` ほか)。項目名はコード化・ログイン導線併設のためP2。取込時確認) |
| 74 | https://www.hamamatsu.com/jp/ja/contact.html | 除外 | 到達不能 (浜松ホトニクス6965。HTTP 404。実窓口は `/all/en/support/inquiry/` 別導線) |
| 75 | https://www.kyocera.co.jp/contact/ | 除外 | 到達不能 (京セラ6971。HTTP 404。静的formは検索のみ) |
| 76 | https://www.murata.com/ja-jp/contact/ | 除外 | 到達不能 (村田製作所6981。HTTP 404。静的formは検索のみ。実窓口は `/ja-jp/support/contact` 別導線) |
| 77 | https://www.nichicon.co.jp/contact/ | 除外 | フォームなし (ニチコン6996。HTTP 200ハブ。静的formなし(selectのみ)。実フォームは `/contact/` 別導線) |
| 78 | https://www.isuzu.co.jp/contact/ | 除外 | 到達不能 (いすゞ7202。HTTP 404。静的formは検索のみ。実窓口は `/inquiry/` 別導線) |
| 79 | https://www.hino.co.jp/contact/ | 除外 | 到達不能 (日野自動車7205。HTTP 404。静的formは検索のみ。実窓口は `/inquiry/` 別導線) |
| 80 | https://www.mitsubishi-motors.com/jp/contact/ | 除外 | 到達不能 (三菱自動車7211。HTTP 404。静的formは検索のみ) |
| 81 | https://www.nok.co.jp/contact/ | 除外 | フォームなし (NOK7240。`nokgrp.com` に転送。静的formなし。実フォームは `/contact/*` 別導線) |
| 82 | https://www.kyb.co.jp/contact/ | 除外 | 到達不能 (KYB7242。HTTP 404) |
| 83 | https://www.aisin.com/jp/contact/ | 除外 | フォームなし (アイシン7259。HTTP 200ハブ。静的formは検索のみ。実フォームは製品別 contact 別導線) |
| 84 | https://www.yamaha-motor.co.jp/contact/ | 除外 | 到達不能 (ヤマハ発動機7272。HTTP 404。静的formなし) |
| 85 | https://www.koito.co.jp/contact/ | 除外 | フォームなし (小糸製作所7276。HTTP 200ハブ。静的formは google検索のみ) |
| 86 | https://www.exedy.co.jp/contact/ | 除外 | 到達不能 (エクセディ7278。curl失敗・code=000) |
| 87 | https://www.toyoda-gosei.co.jp/contact/ | 除外 | フォームなし (豊田合成7282。HTTP 200ハブだが静的formなし。実フォームは `/contact/seihin_form/`→No.172で検証) |
| 88 | https://www.shimano.com/jp/contact/ | 除外 | 到達不能 (シマノ7309。HTTP 403 Access Denied) |
| 89 | https://www.topcon.co.jp/contact/ | 除外 | フォームなし (トプコン7732。`/contact-us/` 転送のハブ一覧。静的formなし。実フォームは `/contact/*.php` 別導線) |
| 90 | https://www.olympus.co.jp/contact/ | 除外 | 到達不能 (オリンパス7733。HTTP 404。静的formは検索のみ) |
| 91 | https://www.hoya.com/contact/ | 除外 | フォームなし (HOYA7741。`hoya.com` トップ転送。静的formは検索のみ。実窓口は `/contact/` 別導線) |
| 92 | https://www.citizen.co.jp/contact/ | 除外 | フォームなし (シチズン7762。HTTP 200ハブだが静的formなし) |
| 93 | https://www.menicon.co.jp/contact/ | 除外 | 到達不能 (メニコン7780。HTTP 404。静的formは検索のみ。実窓口は `/contact/` 別導線) |
| 94 | https://www.itochu.co.jp/ja/contact/ | 除外 | 到達不能 (伊藤忠商事8001。HTTP 404。静的formは検索のみ) |
| 95 | https://www.marubeni.com/jp/contact/ | 除外 | 到達不能 (丸紅8002。HTTP 404。静的formは検索のみ。実フォームは `/jp/contact_form/`→No.173で検証) |
| 96 | https://www.toyotsu.co.jp/contact/ | 除外 | 到達不能 (豊田通商8015。curl失敗・code=000) |
| 97 | https://www.kanematsu.co.jp/contact/ | 除外 | 到達不能 (兼松8020。HTTP 404。静的formは検索のみ。実窓口は `/inquiry` 別導線) |
| 98 | https://www.mitsui.com/jp/ja/contact/ | 除外 | フォームなし (三井物産8031。HTTP 200ハブ。静的formは検索のみ。実フォームは `form.mitsui.com`→No.174で検証) |
| 99 | https://www.sumitomocorp.com/ja/jp/contact/ | 除外 | 到達不能 (住友商事8053。HTTP 404。静的formは検索のみ) |
| 100 | https://www.mitsubishicorp.com/jp/ja/contact/ | 除外 | フォームなし (三菱商事8058。HTTP 200「資料請求」頁だが静的formは検索のみ。実フォームは krs.bz→No.175で検証) |
| 101 | https://www.mos.co.jp/contact/ | 除外 | フォームなし (モスフード8153。HTTP 404「会社情報」頁。静的formなし。実窓口は `mos.jp/contact/` 別導線) |
| 102 | https://www.srs-holdings.co.jp/contact/ | 除外 | フォームなし (SRS-HD8163。Shopify英語頁に転送。静的formはログイン・検索のみ。住所・氏名欄なし) |
| 103 | https://www.royal-holdings.co.jp/contact/ | 除外 | フォームなし (ロイヤルHD8179。HTTP 200ハブだが静的formなし。FAQ詳細のみ) |
| 104 | https://www.yoshinoya-holdings.com/contact/ | 除外 | フォームなし (吉野家HD9861。HTTP 200ハブだが静的formなし。実フォームは `/contact/storeform/`→No.176で検証) |
| 105 | https://www.kfc.co.jp/contact/ | 除外 | 到達不能 (日本KFC9873。HTTP 404「ページがありません」。静的formなし) |
| 106 | https://www.yellowhat.jp/contact/ | 除外 | フォームなし (イエローハット9882。HTTP 200ハブ。静的formは空。実フォームは SMP→No.177で検証) |
| 107 | https://www.matsuyafoods.co.jp/contact/ | 除外 | 到達不能 (松屋フーズ9887。HTTP 503「サービス停止のお知らせ」) |
| 108 | https://www.plenus.co.jp/contact/ | 除外 | フォームなし (プレナス9945。HTTP 200ハブ。静的formは検索のみ。実窓口はブランド別 contact) |
| 109 | https://www.ministop.co.jp/contact/ | 除外 | 到達不能 (ミニストップ9946。HTTP 404。実窓口は `/inquiry/` 別導線) |
| 110 | https://www.misumi.co.jp/contact/ | 除外 | フォームなし (ミスミG本社9962。HTTP 200ハブだが静的formなし。実窓口は `jp.misumi-ec.com`→No.178で検証) |
| 111 | https://www.belluna.co.jp/contact/ | 除外 | 到達不能 (ベルーナ9997。HTTP 403) |
| 112 | https://www.smfg.co.jp/contact/ | 除外 | 到達不能 (SMFG8316。HTTP 404。静的formは検索のみ) |
| 113 | https://www.daiwa-grp.jp/contact/ | 除外 | 到達不能 (大和証券G8601。HTTP 404。静的formは検索のみ。実フォームは `/inquiry/`→No.179で検証) |
| 114 | https://www.nomura.com/jp/contact/ | 除外 | 到達不能 (野村HD8604。HTTP 404) |
| 115 | https://www.matsui.co.jp/contact/ | 除外 | 到達不能 (松井証券8628。HTTP 404。静的formなし。実窓口は `/support/contact/` 別導線) |
| 116 | https://www.jpx.co.jp/contact/ | 除外 | フォームなし (日本取引所G8697。HTTP 200ハブ。静的formは検索のみ。実フォームは `form.jpx.co.jp`→No.180で検証) |
| 117 | https://www.ms-ad-hd.com/ja/contact/ | 除外 | フォームなし (MS&AD8725。HTTP 200ハブ。静的formは検索のみ) |
| 118 | https://www.dai-ichi-life.co.jp/contact/ | 除外 | 到達不能 (第一生命8750。HTTP 404・文字化けタイトル) |
| 119 | https://www.tokiomarinehd.com/contact/ | 除外 | 到達不能 (東京海上8766。HTTP 404) |
| 120 | https://www.mec.co.jp/contact/ | 除外 | 到達不能 (三菱地所8802。HTTP 404 size 479) |
| 121 | https://www.tatemono.com/contact/ | 除外 | 到達不能 (東京建物8804。HTTP 404。静的formは検索のみ。実窓口は `tatemono.com/inquiry/` 別導線) |
| 122 | https://www.leopalace21.co.jp/contact/ | 除外 | フォームなし (レオパレス218848 → (レオパレス8848。HTTP 200ハブ。静的formは検索のみ。実フォームは forms.office.com等別導線) |
| 123 | https://www.starts.co.jp/contact/ | 除外 | フォームなし (スターツ8850。HTTP 200ハブだが静的formなし。実フォームは `/contact/*` 別導線) |
| 124 | https://www.goldcrest.co.jp/contact/ | 除外 | 到達不能 (ゴールドクレスト8871。HTTP 403) |
| 125 | https://www.tokyu.co.jp/contact/ | 除外 | 到達不能 (東急9005。HTTP 404。静的formは google検索のみ。実窓口は `/railway/contact/` 等別導線) |
| 126 | https://www.keisei.co.jp/contact/ | 除外 | 到達不能 (京成9009。HTTP 403) |
| 127 | https://www.westjr.co.jp/contact/ | 除外 | 到達不能 (JR西9021。文字化け404。静的formは検索のみ) |
| 128 | https://www.senko.co.jp/contact/ | 除外 | 到達不能 (センコーGHD9069。HTTP 404) |
| 129 | https://www.tonami.co.jp/contact/ | 除外 | フォームなし (トナミ運輸9070。HTTP 200ハブ。静的formは検索のみ。実フォームは `/contact/luggage/`→No.181で検証) |
| 130 | https://www.seino.co.jp/contact/ | 除外 | 到達不能 (セイノーHD9076。HTTP 404) |
| 131 | https://www.nyk.com/contact/ | 除外 | 到達不能 (日本郵船9101。HTTP 404。静的formは検索のみ。実窓口は `/scripts/contact_oth_jp/index.asp` 別導線) |
| 132 | https://www.mol.co.jp/contact/ | 除外 | フォームなし (商船三井9104。HTTP 200ハブだが静的formなし。実フォームは `/contact/*` 別導線) |
| 133 | https://www.kline.co.jp/contact/ | 除外 | 到達不能 (川崎汽船9107。HTTP 404) |
| 134 | https://www.nittsu.co.jp/contact/ | 除外 | フォームなし (NX-HD9147。`nipponexpress.com` 総合問合せハブに転送。静的formは検索のみ。実フォームは `/form/ja/*`→No.182で検証) |
| 135 | https://www.starflyer.jp/contact/ | 除外 | フォームなし (スターフライヤー9206。HTTP 404だが予約検索formあり。実フォームは `request-form.starflyer.jp`→No.183で検証) |
| 136 | https://www.ntt.co.jp/contact/ | 除外 | 到達不能 (NTT9432。HTTP 410 Site Has Moved) |
| 137 | https://group.softbank/jp/contact/ | 除外 | 到達不能 (ソフトバンクG9984。HTTP 404。静的formは検索のみ) |
| 138 | https://www.hikari.co.jp/contact/ | 有望 P2 | 要精査 (光通信9435。HTTP 200。静的入力欄 input 11・textarea 1: `inquiry_type`・`inquiry_text`・`reply_type`・`name`・`email`・`tel`・`agreement`。`action` 空=JS送信の可能性あり。取込時確認のためP2) |
| 139 | https://www.kadokawa.co.jp/contact/ | 除外 | 到達不能 (KADOKAWA9468。HTTP 404。静的formは検索のみ) |
| 140 | https://www.zenrin.co.jp/contact/ | 除外 | フォームなし (ゼンリン9474。HTTP 200ハブ。静的formは markeinfo検索のみ。実フォームは `/contact/index.html` 別導線) |
| 141 | https://www.shochiku.co.jp/contact/ | 除外 | フォームなし (松竹9601。HTTP 200ハブ。静的input 13は `action` なし。実フォームは `form.shochiku.co.jp`→No.184で検証) |
| 142 | https://www.toho.co.jp/contact/ | 除外 | 到達不能 (東宝9602。HTTP 404) |
| 143 | https://www.toei.co.jp/contact/ | 除外 | 到達不能 (東映9605。HTTP 404。実フォームは `f.msgs.jp`→No.185で検証) |
| 144 | https://www.nttdata.com/jp/ja/contact/ | 除外 | 到達不能 (NTTデータ9613。HTTP 404。静的formは検索のみ。実窓口は `/jp/ja/contact-us` 別導線) |
| 145 | https://www.square-enix.com/jp/contact/ | 除外 | 到達不能 (スクエニHD9684。HTTP 404) |
| 146 | https://www.capcom.co.jp/contact/ | 除外 | 到達不能 (カプコン9697。HTTP 202・空応答 size 0) |
| 147 | https://www.konami.com/contact/ | 除外 | 到達不能 (コナミG9766。HTTP 404) |
| 148 | https://www.secom.co.jp/contact/ | 除外 | フォームなし (セコム9735。HTTP 404だが店舗検索selectあり。実フォームは `/contact/shop/`→No.186で検証) |
| 149 | https://www.sagami.co.jp/contact/ | 除外 | 到達不能 (サガミHD9900。HTTP 404。実フォームは `form.sagami-holdings.co.jp/contact/` 別導線) |
| 150 | https://www.sandrug.co.jp/contact/ | 除外 | 到達不能 (サンドラッグ9989。curl失敗・code=000) |
| 151 | https://www.suzuken.co.jp/contact/ | 除外 | 到達不能 (スズケン9987。HTTP 404。実フォームは SMP別導線) |
| 152 | https://www.hakuyosha.co.jp/contact/ | 除外 | フォームなし (白洋舍9731。HTTP 200ハブ。静的formは検索のみ。実フォームは `/contact/` 別導線) |
| 153 | https://www.fujita-kanko.co.jp/contact/ | 除外 | 到達不能 (藤田観光9722。HTTP エラー頁。実窓口は `/inquiry/index.html` 別導線) |
| 154 | https://www.tokyodome.co.jp/contact/ | 除外 | 到達不能 (東京ドーム9681。curl失敗・code=000) |
| 155 | https://www.nomura-kougei.co.jp/contact/ | 除外 | 到達不能 (乃村工藝社9716。curl失敗・code=000) |
| 156 | https://www.trans-cosmos.co.jp/contact/ | 除外 | フォームなし (トランスコスモス9715。HTTP 200ハブだが静的formなし。実フォームは `transcosmos.com/ja-jp/contact` 別導線) |
| 157 | https://www.ngk.co.jp/contact/input?form_type=3 | 有望 P1 | 静的実フォーム (日本ガイシ5333・製品別窓口。HTTP 200。`action=/contact/input?form_type=3`、input 13・textarea 1。`name`・`name-kana`・`zip`・`address`・`tel`・`mail`・`business`・`department`・`inquiry`+同意。住所分割あり。多様性◎) |
| 158 | https://inquiry.lixil.co.jp/regist/is?SMPFORM=naoj-lctgtj-defd68f97cffa36b3ed5f3bcd2c68ca6&qcat=18 | 有望 P1 | 静的実フォーム (LIXIL5938・SMP。HTTP 200。`action=/regist/Reg2`、input 40・textarea 1・select 3。`company`・`name_sei`・`name_mei`・`kokyaku_sei_kana`・`kokyaku_mei_kana`・`post:a/t`・`pref_name`・`address1-4`・`telephone`・`mail`確認2欄。R4-1のSMP系と同型。多様性◎) |
| 159 | https://contact01.shi.co.jp/m?f=199 | 有望 P2 | 静的実フォーム (住友重機械6302。HTTP 200。input 15・textarea 1・select 1。`e_19823[zip]`+住所検索・`e_19826/27[tel]`分割あり。項目名コード化のためP2) |
| 160 | https://global.engine.kubota.co.jp/ja/contact/input.php?fid=01 | 有望 P1 | 静的実フォーム (クボタ6326エンジン事業部。HTTP 200。`action=confirm.php`、input 32・textarea 1・select 2。`last_name`・`last_kana`・`zipCode`・`pref_name`・`address`・`phone`・`email`確認2欄・`companyName`・`department`。g-recaptcha併設だが静的。多様性◎) |
