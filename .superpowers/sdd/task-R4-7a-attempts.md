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
