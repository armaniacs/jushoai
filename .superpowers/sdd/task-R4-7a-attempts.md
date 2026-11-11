# Task R4-7a 試行ログ — THE日本大学ランキング対象校の候補URLリスト

- 目的: brief指定の大学ランキング上位校 (brief記載verbatimの99校。表題は「上位100校」だが列挙は99校) の公式サイトから、実フォームを持つ静的ページ候補を100件以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-7b 以降)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外URLは理由を記録。
- 既存分 (`tests/target-url.md`) および R4-1 試行済み183件との重複なし (全件ドメイン照合。既存は学校系7件 nishimachi・gis・bst・isi・ois・kigakuen・seedome + 企業・自治体・フォームサービス、R4-1は企業・自治体中心で、大学ドメイン自体ゼロ。本リストは全件大学公式ドメインまたは大学公式サイトから辿れる外部フォーム機構)。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、`<form`・`input`・`textarea`・`select` の有無と action・欄種を目視/計数。動的取得フォーム (JS描画) は「除外: JS描画のみ」。
- 有望の優先順位: P1 (欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい・外部フォーム依存) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-7b 以降が `make addurl` で行う。
- 大学に多い外部機構の概要: テレメール進学サイト (`telemail.jp/shingaku`) は資料請求の業界標準外部サービス (検索結果頁自体に静的formなし) / e-apply (`e-apply.jp`) は出願システムでJS描画・ログイン必須が典型 / OCANs・admission-logi (`request.admission-logi.jp`)・postin-svr 等のイベント予約/資料請求外部フォームは静的formを持つ場合があり有望 / GoogleフォームはJS描画のため除外。

## 試行ログ

| # | URL | 大学名 | 判定 | 除外理由 / フォーム概要 |
|---|-----|--------|------|--------------------------|
| 1 | https://www.tohoku.ac.jp/en/misc/contact.html | 東北大学 | 除外 | フォームなし (HTTP 200「Contact Tohoku University / Tohoku」。静的form2件はサイト内検索のみ。EN Contact頁) |
| 2 | https://www.isct.ac.jp/en/inquiries | 東京科学大学 | 除外 | フォームなし (HTTP 200「General inquiries / Science Tokyo」。静的form1件はサイト内検索のみ。総合問合せ頁) |
| 3 | https://www.u-tokyo.ac.jp/ja/general/contact.html | 東京大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 東京大学」。静的form2件はサイト内検索のみ。総合問合せハブ) |
| 4 | https://www.kyoto-u.ac.jp/ja/education-campus/contact | 京都大学 | 除外 | フォームなし (HTTP 200「学生支援の窓口・証明書発行など / 京都大学」。静的form1件はサイト内検索のみ。学生支援窓口・証明書案内頁) |
| 5 | https://www.kyushu-u.ac.jp/ja/admission/contact | 九州大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 入試・入学 / 九州大学（KYUSHU UNIVE」。静的form2件はサイト内検索のみ。入試・入学問合せ頁だが実フォームは別導線とみられる) |
| 6 | https://www.osaka-u.ac.jp/ja/contact/list | 大阪大学 | 除外 | フォームなし (HTTP 200「」。静的formなし。静的formなし・窓口別リンク集 (225KBでJS描画のみの可能性)) |
| 7 | https://www.nagoya-u.ac.jp/contact/index.html | 名古屋大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 名古屋大学」。静的form2件はサイト内検索のみ。総合問合せハブ) |
| 8 | https://www.hokudai.ac.jp/sub/inquiry/inquiry.html | 北海道大学 | 除外 | フォームなし (HTTP 200「お問い合わせ先 / お問い合わせ / サイト案内 - 北海道大学」。静的form2件はサイト内検索のみ。お問い合わせ先案内) |
| 9 | https://www.tsukuba.ac.jp/contact/ | 筑波大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 筑波大学」。静的form4件はサイト内検索のみ。総合問合せハブ) |
| 10 | https://web.aiu.ac.jp/contact/inquiry/ | 国際教養大学 | 除外 | フォームなし (HTTP 200「大学事務局 連絡先一覧 / 公立大学法人 国際教養大学 / Akit」。静的form2件はサイト内検索のみ。事務局連絡先一覧) |
| 11 | https://www.icu.ac.jp/inquiry/ | 国際基督教大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜国際基督教大学（ICU）」。静的formなし。取材・問合せ案内リンク集) |
| 12 | https://www.keio.ac.jp/ja/contact-us/ | 慶應義塾大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 慶應義塾」。静的formなし。総合問合せハブ) |
| 13 | https://www.hiroshima-u.ac.jp/inquiry | 広島大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 広島大学」。静的formなし。問合せハブ) |
| 14 | https://www.waseda.jp/top/contact | 早稲田大学 | 除外 | フォームなし (HTTP 200「お問い合わせ &#8211; 早稲田大学」。静的form1件はサイト内検索のみ。総合問合せハブ) |
| 15 | https://www.kobe-u.ac.jp/site/contact/ | 神戸大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 16 | https://www.chiba-u.ac.jp/contact/index.html | 千葉大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 国立大学法人 千葉大学｜Chiba Univers」。静的form3件はサイト内検索のみ。総合問合せハブ) |
| 17 | https://www.hit-u.ac.jp/function/inquiry.html | 一橋大学 | 除外 | フォームなし (HTTP 200「お問合せ先一覧 / 大学案内 / 一橋大学」。静的form2件はサイト内検索のみ。お問合せ先一覧) |
| 18 | https://www.kanazawa-u.ac.jp/inquiry | 金沢大学 | 除外 | フォームなし (HTTP 200「大学に関するお問い合わせ &#8211; 金沢大学」。静的form1件はサイト内検索のみ。大学問合せハブ) |
| 19 | https://www.okayama-u.ac.jp/tp/contact/index.html | 岡山大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 国立大学法人 岡山大学」。静的form1件はサイト内検索のみ。総合問合せハブ) |
| 20 | https://www.tuat.ac.jp/contact/ | 東京農工大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 / お問い合わせ / 国立大学法人 東京農工大学」。静的form1件はサイト内検索のみ。問合せ一覧ハブ) |
| 21 | https://www.apu.ac.jp/home/contents/contact.html/ | 立命館アジア太平洋大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 立命館アジア太平洋大学」。静的form2件はサイト内検索のみ。総合問合せハブ) |
| 22 | https://www.kumamoto-u.ac.jp/contact | 熊本大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 / 熊本大学」。静的form1件はサイト内検索のみ。問合せ一覧リンク集) |
| 23 | https://www.sophia.ac.jp/jpn/contact/ | 上智大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜上智大学」。静的form1件はサイト内検索のみ。推測パスで到達した問合せハブ) |
| 24 | https://www.tufs.ac.jp/abouttufs/contactus/contact.html | 東京外国語大学 | 除外 | フォームなし (HTTP 200「問い合わせ先一覧 / キャンパス・お問い合わせ / 大学案内 / 東」。静的formなし。問合せ先一覧) |
| 25 | https://www.nagasaki-u.ac.jp/ja/contact/ | 長崎大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜長崎大学」。静的form4件はサイト内検索のみ。総合問合せハブ) |
| 26 | https://www.u-aizu.ac.jp/inquiry/ | 会津大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜会津大学 - University of Aizu」。静的form1件はサイト内検索のみ。問合せハブ) |
| 27 | https://www.ritsumei.jp/contact/ | 立命館大学 | 除外 | 到達不能 (curl失敗・code=000。https接続失敗 (code=000。再試行・UA変更・http試行でも到達不能。bot遮断の可能性)) |
| 28 | https://www.nagaokaut.ac.jp/contact/ | 長岡技術科学大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 長岡技術科学大学」。静的formなし。問合せハブ) |
| 29 | https://www.ynu.ac.jp/inquiry/ | 横浜国立大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 横浜国立大学」。静的formなし。問合せハブ) |
| 30 | https://www.kit.ac.jp/contact | 京都工芸繊維大学 | 有望 P2 | 静的実フォーム `toiawase_form` (POST)。問合せ種別radio約20・氏名 `sei/mei`・カナ `sei_kana/mei_kana`・所属 `org/unit`・tel・email確認2欄・本文textarea。住所欄なしのためP2 |
| 31 | https://www.shibaura-it.ac.jp/inquiry/ | 芝浦工業大学 | 除外 | フォームなし (HTTP 200「お問い合わせ先一覧｜芝浦工業大学」。静的formなし。問合せ先一覧) |
| 32 | https://www.omu.ac.jp/contact/ | 大阪公立大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 大阪公立大学」。静的formなし。総合問合せハブ) |
| 33 | https://www.nagoya-cu.ac.jp/inquiry/ | 名古屋市立大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 名古屋市立大学」。静的form1件はサイト内検索のみ。総合問合せハブ) |
| 34 | https://www.kuis.ac.jp/contact/ | 神田外語大学 | 除外 | 到達不能 (curl失敗・code=000。curl失敗 (code=000。再試行・UA変更でも到達不能。bot遮断の可能性)) |
| 35 | https://www.kaiyodai.ac.jp/overview/contact/ | 東京海洋大学 | 除外 | フォームなし (HTTP 200「お問合せ / 東京海洋大学について / 国立大学法人 東京海洋大学」。静的formなし。お問合せ案内 (selectは言語切替等)) |
| 36 | https://www.kyutech.ac.jp/contact/ | 九州工業大学 | 有望 P1 | 静的実フォーム (POST, multipart)。氏名 `name1/2`・カナ `kana1/2`・郵便2分割 `zip1/2`・都道府県select `pref_code`・住所 `address1/2`・tel・email・本文。言語select併設。欄構成豊かで即取込推奨 |
| 37 | https://www.ocha.ac.jp/about/contact.html | お茶の水女子大学 | 除外 | フォームなし (HTTP 200「お問合せ / お茶の水女子大学」。静的form1件はサイト内検索のみ。お問合せハブ) |
| 38 | https://www.tus.ac.jp/access/inquiry/ | 東京理科大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜東京理科大学」。静的form3件はサイト内検索のみ。総合問合せハブ) |
| 39 | https://www.rikkyo.ac.jp/contact/index.html | 立教大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 立教大学」。静的form2件はサイト内検索のみ。総合問合せハブ) |
| 40 | https://www.tut.ac.jp/about/overview/contact.html | 豊橋技術科学大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 豊橋技術科学大学」。静的formなし。問合せハブ) |
| 41 | https://www.doshisha.ac.jp/contact/index.html | 同志社大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 ｜同志社大学」。静的formなし。問合せ一覧リンク集) |
| 42 | https://www.uec.ac.jp/about/inquiry/ | 電気通信大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 国立大学法人 電気通信大学」。静的form1件はサイト内検索のみ。問合せハブ) |
| 43 | https://www.yokohama-cu.ac.jp/univ/inquiry.html | 横浜市立大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 横浜市立大学 YOKOHAMA CITY UNIV」。静的form1件はサイト内検索のみ。問合せハブ) |
| 44 | https://www.kwansei.ac.jp/contact/ | 関西学院大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜関西学院大学」。静的formなし。問合せハブ) |
| 45 | https://www.niigata-u.ac.jp/university/contact/ | 新潟大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 大学案内 / 新潟大学」。静的form1件はサイト内検索のみ。問合せハブ) |
| 46 | https://www.meiji.ac.jp/koho/information/inquiry/index.html | 明治大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 / 明治大学」。静的formなし。問合せ一覧) |
| 47 | https://www.fw-u.ac.jp/contact/ | 福岡女子大学 | 除外 | 到達不能 (curl失敗・code=000。curl失敗 (code=000。再試行・UA変更でも到達不能。bot遮断の可能性)) |
| 48 | https://www.aoyama.ac.jp/inquiry/ | 青山学院大学 | 除外 | フォームなし (HTTP 200「お問い合わせ・窓口（1/2） / 青山学院大学」。静的form2件はサイト内検索のみ。実窓口はform-mailer外部フォーム (No.199-200で検証)) |
| 49 | https://www.nitech.ac.jp/contact/index.html | 名古屋工業大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜国立大学法人名古屋工業大学」。静的formなし。入試問合せ頁だが静的formなし) |
| 50 | https://www.saga-u.ac.jp/inquiry/ | 佐賀大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜国立大学法人佐賀大学」。静的form1件はサイト内検索のみ。総合問合せハブ) |
| 51 | https://www.kansai-u.ac.jp/ja/info/contact | 関西大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧｜関西大学」。静的formなし。問合せ一覧) |
| 52 | https://www.akita-u.ac.jp/contact/ | 秋田大学 | 除外 | フォームなし (HTTP 200「404 Not Found｜国立大学法人 秋田大学」。静的form1件はサイト内検索のみ。実質404: HTTP 200だがタイトル404。出願はe-apply外部システム) |
| 53 | https://www.hosei.ac.jp/toiawase | 法政大学 | 除外 | フォームなし (HTTP 200「お問い合わせ :: 法政大学」。静的formなし。総合問合せハブ) |
| 54 | https://www.kagoshima-u.ac.jp/about/inquiry.html | 鹿児島大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 国立大学法人 鹿児島大学～進取の気風にあふれる総合」。静的formなし。問合せハブ) |
| 55 | https://www.gunma-u.ac.jp/contact | 群馬大学 | 除外 | フォームなし (HTTP 200「お問合せ / 国立大学法人群馬大学」。静的form2件はサイト内検索のみ。問合せハブ) |
| 56 | https://www.nanzan-u.ac.jp/Information/toiawase.html | 南山大学 | 除外 | フォームなし (HTTP 200「組織・問い合わせ先｜南山大学」。静的formなし。組織・問合せ先案内) |
| 57 | https://www.slcn.ac.jp/contact/ | 聖路加国際大学 | 除外 | 到達不能 (curl失敗・code=000。https接続失敗 (code=000。httpは301→httpsへ転送。bot遮断の可能性)) |
| 58 | https://www.shinshu-u.ac.jp/inquiry/ | 信州大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 信州大学」。静的form1件はサイト内検索のみ。総合問合せハブ (相談系はGoogleフォーム外部)) |
| 59 | https://www.juntendo.ac.jp/contact/ | 順天堂大学 | 除外 | 到達不能 (curl失敗・code=000。https接続失敗 (code=000。httpは空応答)) |
| 60 | https://www.yamagata-u.ac.jp/jp/inquiry/ | 山形大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜国立大学法人 山形大学」。静的form1件はサイト内検索のみ。問合せハブ) |
| 61 | https://www.soka.ac.jp/inquiry/ | 創価大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 62 | https://www.obihiro.ac.jp/contact | 帯広畜産大学 | 除外 | フォームなし (HTTP 200「お問い合わせ・各種窓口 &#8211; 国立大学法人北海道国立大学機」。静的form2件はサイト内検索のみ。各種窓口案内。問合せはGoogleフォーム/テレメール外部) |
| 63 | https://www.yamaguchi-u.ac.jp/info/contact/index.html | 山口大学 | 除外 | フォームなし (HTTP 200「」。静的formなし。問合せ先案内 (タイトル空)) |
| 64 | https://www.kitakyu-u.ac.jp/contact/ | 北九州市立大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 / 公立大学法人北九州市立大学」。静的form1件はサイト内検索のみ。問合せ一覧) |
| 65 | https://www.chuo-u.ac.jp/contact/ | 中央大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 66 | https://www.nara-wu.ac.jp/nwu/intro/contact/list/ | 奈良女子大学 | 除外 | フォームなし (HTTP 200「連絡先一覧｜大学案内｜奈良女子大学 Nara Women's Uni」。静的formなし。連絡先一覧) |
| 67 | https://www.tokushima-u.ac.jp/inquiry/ | 徳島大学 | 除外 | フォームなし (HTTP 200「主なお問い合わせ先 - 国立大学法人 徳島大学」。静的form2件はサイト内検索のみ。主なお問合せ先案内) |
| 68 | https://nyushi.ad.u-fukui.ac.jp/ | 福井大学 | 除外 | フォームなし (HTTP 200「LOOK FUKUDAI / 福井大学受験生応援サイト」。静的formなし。受験生サイトハブ。資料請求はテレメール外部サービス) |
| 69 | https://www.kobe-cufs.ac.jp/inquiry.html | 神戸市外国語大学 | 除外 | フォームなし (HTTP 200「お問合せ｜神戸市外国語大学」。静的form1件はサイト内検索のみ。お問合せハブ) |
| 70 | https://www.gakushuin.ac.jp/univ/contact/ | 学習院大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 71 | https://www.ehime-u.ac.jp/contact-list/ | 愛媛大学 | 除外 | フォームなし (HTTP 200「お問い合わせ先一覧 / 愛媛大学」。静的form1件はサイト内検索のみ。問合せ先一覧) |
| 72 | https://www.gifu-u.ac.jp/contact/ | 岐阜大学 | 除外 | フォームなし (HTTP 200「問い合わせ先 / 問い合わせ先 / 岐阜大学」。静的form2件はサイト内検索のみ。問合せ先案内) |
| 73 | https://nyushi.hirosaki-u.ac.jp/ | 弘前大学 | 除外 | フォームなし (HTTP 200「弘前大学 入試情報」。静的form2件はサイト内検索のみ。入試情報ハブ。資料請求はテレメール/出願はe-apply外部) |
| 74 | https://www.iwate-u.ac.jp/contact.html | 岩手大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜国立大学法人 岩手大学」。静的formなし。問合せハブ (OC案内。資料請求はテレメール外部)) |
| 75 | https://www.miyazaki-u.ac.jp/contact.html | 宮崎大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜宮崎大学」。静的form2件はサイト内検索のみ。お問合せハブ) |
| 76 | https://www.kansaigaidai.ac.jp/inquiry/ | 関西外国語大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 関西外国語大学」。静的form2件はサイト内検索のみ。総合問合せハブ) |
| 77 | https://www.kindai.ac.jp/contact/ | 近畿大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 / 近畿大学」。静的form1件はサイト内検索のみ。問合せ一覧 (selectは言語切替)) |
| 78 | https://www.u-toyama.ac.jp/contact/inquiry/ | 富山大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧 &#8211; 富山大学」。静的formなし。問合せ一覧) |
| 79 | https://www.kochi-tech.ac.jp/about/contact/ | 高知工科大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 大学案内 / 高知工科大学」。静的form1件はサイト内検索のみ。問合せハブ) |
| 80 | https://www.toyo.ac.jp/contact/ | 東洋大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 81 | https://www.utsunomiya-u.ac.jp/convenient/inquiry.php | 宇都宮大学 | 除外 | フォームなし (HTTP 200「お問い合わせ先一覧 / 宇都宮大学」。静的formなし。問合せ先一覧) |
| 82 | https://www.tottori-u.ac.jp/opencampus/ | 鳥取大学 | 除外 | フォームなし (HTTP 200「OPEN CAMPUS/鳥取大学」。静的form1件はサイト内検索のみ。OC案内 (ASP.NETの検索formのみ)) |
| 83 | https://www.shizuoka.ac.jp/inquiry/ | 静岡大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜静岡大学」。静的form2件はサイト内検索のみ。総合問合せハブ) |
| 84 | https://www.mie-u.ac.jp/contact/top.html | 三重大学 | 除外 | フォームなし (HTTP 200「三重大学 / お問い合わせ」。静的form4件はサイト内検索のみ。総合問合せハブ) |
| 85 | https://www.u-ryukyu.ac.jp/contact/ | 琉球大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 86 | https://www.shimane-u.ac.jp/inquiry/1/ | 島根大学 | 有望 P2 | 静的実フォーム `/inquiry/1/confirm_answers` (POST)。text2・email・select・textarea・captcha画像認証。項目名は `question_answers[N]` とコード化・住所欄なしのためP2 |
| 87 | https://www.uoeh-u.ac.jp/Exam/inquiry.html | 産業医科大学 | 有望 P1 | 入試問合せの静的実フォーム (POST)。氏名(漢字・カナ各姓/名)・郵便 `query_post_7`・tel・email・都道府県select `query_pref_8`・本文textarea。欄構成豊かで即取込推奨 |
| 88 | https://www.oita-u.ac.jp/category/f01toiawase.html | 大分大学 | 除外 | フォームなし (HTTP 200「お問合せ｜国立大学法人 大分大学」。静的form1件はサイト内検索のみ。お問合せハブ) |
| 89 | https://www.kochi-u.ac.jp/contact/ | 高知大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 高知大学」。静的formなし。問合せハブ (入力は文字サイズ/テーマ切替のみ)) |
| 90 | https://www.kpu.ac.jp/guidance/inquiry | 京都府立大学 | 除外 | フォームなし (HTTP 200「各種お問い合わせ / 大学案内 / 京都府立大学」。静的form1件はサイト内検索のみ。各種問合せ案内) |
| 91 | https://nyushi.adb.fukushima-u.ac.jp/ | 福島大学 | 除外 | フォームなし (HTTP 200「入試情報｜福島大学」。静的form1件はサイト内検索のみ。入試情報ハブ。資料請求はテレメール外部) |
| 92 | https://www.fukuoka-u.ac.jp/help/inquiry/ | 福岡大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / ご案内 / 福岡大学」。静的form2件はサイト内検索のみ。問合せハブ) |
| 93 | https://www.meio-u.ac.jp/contact/ | 名桜大学 | 除外 | フォームなし (HTTP 200「お問い合わせ・証明書｜名桜大学」。静的formなし。問合せ・証明書案内) |
| 94 | https://www.u-hyogo.ac.jp/contact/ | 兵庫県立大学 | 除外 | フォームなし (HTTP 200「お問い合わせ｜兵庫県立大学 University of Hyogo」。静的form3件はサイト内検索のみ。問合せハブ) |
| 95 | https://www.musashi.ac.jp/about/contact.html | 武蔵大学 | 除外 | フォームなし (HTTP 200「武蔵大学に関するお問い合わせ / 武蔵大学」。静的form2件はサイト内検索のみ。大学問合せハブ) |
| 96 | https://www.postin-svr.com/entry/showa-u/index.asp | 昭和大学 | 有望 P1 | postin-svr外部資料請求・問合せフォーム (POST `confirm.asp`)。漢字氏名・カナ・郵便・住所 `jusho35`・電話・メール・志望学科checkbox・資料種別checkbox。欄構成豊かで即取込推奨 |
| 97 | https://www.meijigakuin.ac.jp/admission/contact/ | 明治学院大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 98 | https://www.nufs.ac.jp/outline/inquiry/ | 名古屋外国語大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 大学案内 / 名古屋外国語大学 The World」。静的form1件はサイト内検索のみ。問合せハブ) |
| 99 | https://www.shiga-med.ac.jp/admission/contact | 滋賀医科大学 | 除外 | フォームなし (HTTP 200「その他 / 滋賀医科大学」。静的form1件はサイト内検索のみ。入試問合せハブ (Drupal)) |
| 100 | https://www.tnc.tohoku.ac.jp/contact/ | 東北大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 101 | https://www.isct.ac.jp/ja/inquiries | 東京科学大学 | 除外 | フォームなし (HTTP 200「総合お問い合わせ / Science Tokyo - 東京科学大学」。静的form1件はサイト内検索のみ) |
| 102 | https://www.u-tokyo.ac.jp/ja/admissions/contact.html | 東京大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 103 | https://www.kyoto-u.ac.jp/ja/contact | 京都大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 京都大学」。静的form1件はサイト内検索のみ) |
| 104 | https://www.kyushu-u.ac.jp/ja/contact | 九州大学 | 除外 | フォームなし (HTTP 200「九州大学（KYUSHU UNIVERSITY）」。静的form2件はサイト内検索のみ) |
| 105 | https://www.osaka-u.ac.jp/ja/admissions/contact | 大阪大学 | 除外 | フォームなし (HTTP 200「」。静的formなし) |
| 106 | https://www.nagoya-u.ac.jp/admission/contact/ | 名古屋大学 | 除外 | フォームなし (HTTP 200「名古屋大学 受験生応援サイト / NU START GUIDE」。静的formなし) |
| 107 | https://www.hokudai.ac.jp/admission/contact/ | 北海道大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 108 | https://soudan.sec.tsukuba.ac.jp/sogosodan/ | 筑波大学 | 除外 | フォームなし (HTTP 200「総合相談窓口 &#8211; 筑波大学学生相談室」。静的form2件はサイト内検索のみ。総合相談窓口頁だが実体は案内・リンク中心) |
| 109 | https://admission.aiu.ac.jp/event/opencampus/ | 国際教養大学 | 除外 | フォームなし (HTTP 200「オープンキャンパス - 国際教養大学 受験生応援サイト」。静的form2件はサイト内検索のみ。OC予約は受験生サイトの別システム導線とみられる) |
| 110 | https://www.icu.ac.jp/about/contact/ | 国際基督教大学 | 除外 | フォームなし (HTTP 200「本学への取材について｜国際基督教大学（ICU）」。静的formなし。取材案内リンク集) |
| 111 | https://www.keio.ac.jp/ja/admissions/contact/ | 慶應義塾大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 112 | https://www.hiroshima-u.ac.jp/nyugaku/soudan | 広島大学 | 除外 | フォームなし (HTTP 200「相談窓口 / 広島大学」。静的formなし。相談窓口案内) |
| 113 | https://www.waseda.jp/inst/admission/contact/ | 早稲田大学 | 除外 | フォームなし (HTTP 200「お問い合わせ &#8211; 早稲田大学 入学センター」。静的form1件はサイト内検索のみ。入学センター問合せ頁だが検索のみ) |
| 114 | https://www.kobe-u.ac.jp/admission/contact/ | 神戸大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 115 | https://www.chiba-u.ac.jp/admission/contact/ | 千葉大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 116 | https://www.hit-u.ac.jp/admission/contact/ | 一橋大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 117 | https://www.kanazawa-u.ac.jp/admission/contact/ | 金沢大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 118 | https://www.okayama-u.ac.jp/tp/admission/seikyuu_shiryo.html | 岡山大学 | 除外 | フォームなし (HTTP 200「大学案内等の請求方法 - 国立大学法人 岡山大学」。静的form1件はサイト内検索のみ。資料請求案内頁だが請求導線は別 (テレメール等の外部とみられる)) |
| 119 | https://www.tuat.ac.jp/admission/nyushi_gakubu/seikyu/ | 東京農工大学 | 除外 | フォームなし (HTTP 200「入試関係資料請求 / 学部：入試情報 / 入試情報 / 国立大学法人」。静的form1件はサイト内検索のみ。資料請求頁だが検索のみ。請求本体はテレメール外部サービス) |
| 120 | https://www.apumate.net/event/opencampus/ | 立命館アジア太平洋大学 | 除外 | フォームなし (HTTP 200「オープンキャンパス / イベント / 受験生サイト APUmate.」。静的formなし。OC予約はAPUmate外部イベントシステム導線とみられる) |
| 121 | https://www.kumamoto-u.ac.jp/nyuushi | 熊本大学 | 除外 | フォームなし (HTTP 200「入試案内 / 熊本大学」。静的form1件はサイト内検索のみ。入試案内頁 (空form)) |
| 122 | https://www.sophia.ac.jp/jpn/admissions/contact/ | 上智大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 123 | https://www.tufs.ac.jp/admission/contact/ | 東京外国語大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 124 | https://www.nagasaki-u.ac.jp/nyugaku/contact/ | 長崎大学 | 除外 | フォームなし (HTTP 200「大学・学部パンフレット＆資料請求｜長崎大学 受験生の入試情報サイト」。静的form1件はサイト内検索のみ。資料請求頁だが検索のみ。請求本体はテレメール外部サービス) |
| 125 | https://www.u-aizu.ac.jp/admission/contact/ | 会津大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 126 | https://www.ritsumei.jp/admission/contact/ | 立命館大学 | 除外 | 到達不能 (curl失敗・code=000。同上 (code=000)) |
| 127 | https://www.nagaokaut.ac.jp/admissions/request-information/ | 長岡技術科学大学 | 除外 | フォームなし (HTTP 200「資料請求 / 長岡技術科学大学」。静的formなし。資料請求頁だが静的formなし。請求本体はテレメール外部サービス) |
| 128 | https://www.ynu.ac.jp/admission/contact/ | 横浜国立大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 129 | https://www.kit.ac.jp/admission/contact/ | 京都工芸繊維大学 | 除外 | フォームなし (HTTP 200「Contact Us - 国立大学法人 京都工芸繊維大学」。静的form1件はサイト内検索のみ) |
| 130 | https://www.shibaura-it.ac.jp/admission/contact/ | 芝浦工業大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 131 | https://www.omu.ac.jp/admission/contact/ | 大阪公立大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 132 | https://www.nagoya-cu.ac.jp/admission/contact/ | 名古屋市立大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 133 | https://www.kuis.ac.jp/admissions/contact/ | 神田外語大学 | 除外 | 到達不能 (curl失敗・code=000。同上 (code=000)) |
| 134 | https://www.kaiyodai.ac.jp/campuslife/inquirycounter/ | 東京海洋大学 | 除外 | フォームなし (HTTP 200「相談窓口 / 学生生活 / 国立大学法人 東京海洋大学」。静的formなし。相談窓口案内 (入力は表示切替checkboxのみ)) |
| 135 | https://www.kyutech.ac.jp/admission/contact/ | 九州工業大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 136 | https://www.ocha.ac.jp/ao/contact.html | お茶の水女子大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 137 | https://www.tus.ac.jp/admissions/university/entry/ | 東京理科大学 | 除外 | フォームなし (HTTP 200「出願案内｜東京理科大学」。静的form3件はサイト内検索のみ。出願案内頁) |
| 138 | https://www.rikkyo.ac.jp/admissions/visit/opencampus/index.html | 立教大学 | 除外 | フォームなし (HTTP 200「オープンキャンパス / 立教大学」。静的form2件はサイト内検索のみ。OC頁だが検索のみ) |
| 139 | https://www.tut.ac.jp/admission/contact/ | 豊橋技術科学大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 140 | https://www.doshisha.ac.jp/admissions/contact/ | 同志社大学 | 除外 | フォームなし (HTTP 200「お探しのページがみつかりません ｜同志社大学」。静的formなし。実質404: HTTP 200だが「お探しのページ」内容。静的formなし) |
| 141 | https://www.uec.ac.jp/admission/contact/ | 電気通信大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 142 | https://www.yokohama-cu.ac.jp/admission/contact/ | 横浜市立大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 143 | https://www.kwansei.ac.jp/admissions/contact/ | 関西学院大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 144 | https://www.niigata-u.ac.jp/admission/contact/ | 新潟大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 145 | https://www.meiji.ac.jp/exam/contact/ | 明治大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 146 | https://www.fw-u.ac.jp/admission/contact/ | 福岡女子大学 | 除外 | 到達不能 (curl失敗・code=000。同上 (code=000)) |
| 147 | https://www.aoyama.ac.jp/admission/contact/ | 青山学院大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 148 | https://www.nitech.ac.jp/examination/contact.html | 名古屋工業大学 | 除外 | フォームなし (HTTP 200「入試に関するお問い合わせ｜国立大学法人名古屋工業大学」。静的formなし。入試問合せ頁だが静的formなし) |
| 149 | https://www.saga-u.ac.jp/koho/corp_contact.html | 佐賀大学 | 除外 | フォームなし (HTTP 200「取材申し込み ｜ 佐賀大学広報室」。静的form1件はサイト内検索のみ。取材申込頁だが検索のみ。申込本体はGoogleフォーム外部) |
| 150 | https://www.kansai-u.ac.jp/admission/contact/ | 関西大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 151 | https://www.akita-u.ac.jp/nyushi/contact/ | 秋田大学 | 除外 | フォームなし (HTTP 200「404 Not Found｜国立大学法人 秋田大学」。静的form1件はサイト内検索のみ。同上 (実質404)) |
| 152 | https://www.hosei.ac.jp/admission/contact/ | 法政大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 153 | https://www.kagoshima-u.ac.jp/admission/contact/ | 鹿児島大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 154 | https://www.gunma-u.ac.jp/admission/contact/ | 群馬大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 155 | https://www.nanzan-u.ac.jp/admission/contact/ | 南山大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 156 | https://www.slcn.ac.jp/admission/contact/ | 聖路加国際大学 | 除外 | 到達不能 (curl失敗・code=000。同上 (code=000)) |
| 157 | https://www.shinshu-u.ac.jp/admission/contact/ | 信州大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 158 | https://www.juntendo.ac.jp/admission/contact/ | 順天堂大学 | 除外 | 到達不能 (curl失敗・code=000。同上 (code=000)) |
| 159 | https://www.yamagata-u.ac.jp/admission/contact/ | 山形大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 160 | https://www.soka.ac.jp/admission/contact/ | 創価大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 161 | https://www.obihiro.ac.jp/contact-info | 帯広畜産大学 | 除外 | フォームなし (HTTP 200「教務窓口案内 &#8211; 国立大学法人北海道国立大学機構 帯広畜」。静的form2件はサイト内検索のみ。教務窓口案内) |
| 162 | https://www.yamaguchi-u.ac.jp/nyushi/ | 山口大学 | 除外 | フォームなし (HTTP 200「」。静的form1件はサイト内検索のみ。入試ハブ) |
| 163 | https://www.kitakyu-u.ac.jp/entrance-exam/event/opencampus.html | 北九州市立大学 | 除外 | フォームなし (HTTP 200「オープンキャンパス / 公立大学法人北九州市立大学」。静的form1件はサイト内検索のみ。OC頁だが検索のみ) |
| 164 | https://www.chuo-u.ac.jp/admission/contact/ | 中央大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 165 | https://www.nara-wu.ac.jp/admission/contact/ | 奈良女子大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 166 | https://www.tokushima-u.ac.jp/admission/contact/ | 徳島大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 167 | https://www.u-fukui.ac.jp/contact/ | 福井大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 168 | https://www.kobe-cufs.ac.jp/admission/contact/ | 神戸市外国語大学 | 除外 | フォームなし (HTTP 200「ページが見つかりません｜神戸市外国語大学」。静的form1件はサイト内検索のみ。実質404: HTTP 200だが「ページが見つかりません」内容) |
| 169 | https://www.gakushuin.ac.jp/admission/contact/ | 学習院大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 170 | https://www.ehime-u.ac.jp/entrance/open-campus/ | 愛媛大学 | 除外 | フォームなし (HTTP 200「オープンキャンパス / 入試 / 愛媛大学」。静的form1件はサイト内検索のみ。OC頁だが検索のみ) |
| 171 | https://www.gifu-u.ac.jp/admission/contact/ | 岐阜大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 入試・入学案内 / 岐阜大学」。静的form2件はサイト内検索のみ。入試問合せ頁だが検索のみ) |
| 172 | https://www.hirosaki-u.ac.jp/contact/ | 弘前大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 弘前大学」。静的formなし) |
| 173 | https://www.iwate-u.ac.jp/admission/iwateuniv/open-campus.html | 岩手大学 | 除外 | フォームなし (HTTP 200「岩手大学オープンキャンパス｜国立大学法人 岩手大学」。静的formなし。OC案内) |
| 174 | https://www.miyazaki-u.ac.jp/admission/contact/ | 宮崎大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 175 | https://www.kansaigaidai.ac.jp/information-request/ | 関西外国語大学 | 除外 | フォームなし (HTTP 200「資料請求 / 関西外国語大学」。静的form2件はサイト内検索のみ。資料請求頁だが検索のみ) |
| 176 | https://www.kindai.ac.jp/admission/contact/ | 近畿大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 177 | https://www.u-toyama.ac.jp/admission/contact/ | 富山大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 178 | https://www.kochi-tech.ac.jp/admission/contact/ | 高知工科大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 179 | https://www.toyo.ac.jp/nyushi/contact/ | 東洋大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 180 | https://www.utsunomiya-u.ac.jp/admission/contact/ | 宇都宮大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 181 | https://www.tottori-u.ac.jp/contact/ | 鳥取大学 | 除外 | フォームなし (HTTP 200「お問い合わせ一覧/鳥取大学」。静的form1件はサイト内検索のみ。問合せ一覧 (ASP.NETの検索formのみ)) |
| 182 | https://www.shizuoka.ac.jp/nyushi/form/ | 静岡大学 | 除外 | フォームなし (HTTP 200「資料請求｜静岡大学」。静的form2件はサイト内検索のみ。資料請求頁だが検索のみ。請求本体はテレメール外部サービス) |
| 183 | https://www.mie-u.ac.jp/admission/contact/ | 三重大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 184 | https://www.u-ryukyu.ac.jp/admission/contact/ | 琉球大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 185 | https://www.shimane-u.ac.jp/admission/contact/ | 島根大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 186 | https://www.uoeh-u.ac.jp/admission/contact/ | 産業医科大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 187 | https://www.oita-u.ac.jp/06nyushi/05shiryo.html | 大分大学 | 除外 | フォームなし (HTTP 200「資料請求／入試情報｜国立大学法人 大分大学」。静的form1件はサイト内検索のみ。資料請求頁だが検索のみ。請求本体はテレメール外部サービス) |
| 188 | https://www.kochi-u.ac.jp/admission/contact/ | 高知大学 | 除外 | フォームなし (HTTP 200「お問い合わせ - 高知大学」。静的formなし。同上 (問合せハブ)) |
| 189 | https://www.kpu.ac.jp/admission/contact/ | 京都府立大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 190 | https://gakusei.adb.fukushima-u.ac.jp/i_toiawase.html | 福島大学 | 除外 | フォームなし (HTTP 200「」。静的formなし。問合せ先案内 (静的formなし)) |
| 191 | https://request.admission-logi.jp/form/doc/9015/1/6932/ | 福岡大学 | 有望 P1 | admission-logi外部資料請求フォーム (POST `/form/ck/`)。氏名・カナ・郵便 `zipcode`・住所 `city/address/build`・都道府県 `pref`・tel・性別・学校select・生年月日select。欄構成豊かで即取込推奨 |
| 192 | https://www.meio-u.ac.jp/admission/contact/ | 名桜大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 193 | https://www.u-hyogo.ac.jp/admission/contact/ | 兵庫県立大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 194 | https://www.musashi.ac.jp/admissions/contact.html | 武蔵大学 | 除外 | フォームなし (HTTP 200「入試情報に関するお問い合わせ / 武蔵大学」。静的form2件はサイト内検索のみ。入試問合せ頁だが検索のみ) |
| 195 | https://www.showa-u.ac.jp/contact/ | 昭和大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 196 | https://www.meijigakuin.ac.jp/contact/ | 明治学院大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 197 | https://www.nufs.ac.jp/admission/contact/ | 名古屋外国語大学 | 除外 | 到達不能 (HTTP 404。当該パスなし) |
| 198 | https://www.shiga-med.ac.jp/contact | 滋賀医科大学 | 除外 | フォームなし (HTTP 200「お問い合わせ / 滋賀医科大学」。静的form1件はサイト内検索のみ。総合問合せハブ (相談系はGoogleフォーム外部)) |
| 199 | https://business.form-mailer.jp/fms/25b2d0e0137776 | 青山学院大学 | 有望 P2 | 青学公式の問合せ頁から辿れるform-mailer外部フォーム (青山キャンパス所属学生用)。姓/名分割・email確認2欄・tel 3分割・checkbox・textarea。住所欄なしのためP2 |
| 200 | https://ssl.form-mailer.jp/fms/08ff74b0839409 | 青山学院大学 | 有望 P2 | 青学公式の問合せ頁から辿れるform-mailer外部フォーム (相模原キャンパス就職・キャリア)。姓名・email確認・radio・textarea。住所欄なしのためP2 |
