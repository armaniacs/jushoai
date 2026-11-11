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
