# Task R4-8a 試行ログ — 大手学習塾・予備校20社+準大手 候補URLリスト

- 目的: 大手学習塾・予備校の公式サイトから入塾問合せ/資料請求/体験授業申込/説明会予約の実フォームを持つ静的ページ候補を100件以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-8b 以降)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外URLは理由を記録。塾に多い外部予約・資料請求フォームの機構は末尾の機構メモに記録。
- 既存分 (`tests/target-url.md`) および R4-1 試行済み183件との重複: なし (全131件をURL照合。SMP系3件は同一ホスト `reg*.smp.ne.jp` だが SMPFORM トークンが異なり欄構成も別フォームであることを確認済み。同一パス複数URLはクエリ/keycode の異なる別フォーム: 東進sform×3・栄光eforms×2)。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、`<form`・`input`・`textarea`・`select` の有無と action・name 属性を計数/目視。動的取得フォーム (JS描画) は「除外: JS描画のみ」。
- 有望の優先順位: P1 (欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい/機構が特殊) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-8b 以降が `make addurl` で行う。

## 試行ログ

| # | URL | 社/ブランド名 | 判定 | 除外理由 / フォーム概要 |
|---|-----|--------------|------|--------------------------|
| 1 | https://www.toshin.com/sform/shiryo-seikyu/input?form_action=shiryo | 東進ハイスクール・東進衛星予備校 | 有望 P1 | 静的実フォーム (CakePHP sform。input65・ta1・sel18。住所address1-3・生年月日・連絡希望日時・email。資料請求。多様性◎) |
| 2 | https://www.toshin.com/sform/shiryo-seikyu/input?form_action=taiken | 東進ハイスクール・東進衛星予備校 | 有望 P2 | 静的実フォーム (No.1と同型・1日体験申込。欄構成ほぼ同一のためP2) |
| 3 | https://www.toshin.com/sform/shiryo-seikyu/input?form_action=nyugaku | 東進ハイスクール・東進衛星予備校 | 有望 P2 | 静的実フォーム (No.1と同型・入学申込) |
| 4 | https://www.toshin.com/sform/kobetsu-mendan/input?form_action=mendan&kobetsu=1 | 東進ハイスクール・東進衛星予備校 | 有望 P1 | 静的実フォーム (個別相談。氏名・カナ・email確認・tel・校舎。No.1系と欄が異なり多様性◎) |
| 5 | https://www.toshin.com/grade_select/experience.php | 東進ハイスクール・東進衛星予備校 | 除外 | フォームなし (学年選択ボタン頁。input0) |
| 6 | https://www.toshin.com/kobetsu_soudan/ | 東進ハイスクール・東進衛星予備校 | 除外 | フォームなし (静的formは検索のみ。相談申込はsform別導線No.4) |
| 7 | https://www.yotsuyaotsuka.com/lform/nyujuku_test/input | 四谷大塚 | 有望 P1 | 静的実フォーム (入塾テスト。児童+保護者氏名・カナ・住所・email確認・都道府県。多様性◎) |
| 8 | https://www.yotsuyaotsuka.com/shiryou.php | 四谷大塚 | 除外 | フォームなし (資料請求案内頁。実フォームはlform/pform別導線No.7/128-131) |
| 9 | https://www.yotsuyaotsuka.com/school/apply_contact/ | 四谷大塚 | 除外 | フォームなし (学校紹介頁) |
| 10 | https://www.yotsuyaotsuka.com/experience/ | 四谷大塚 | 除外 | フォームなし (体験案内。59inputはhidden校舎名のみ) |
| 11 | https://www.wasedajuku.com/experience/ | 早稲田塾 | 除外 | フォームなし (体験案内。実申込はmember別導線No.127) |
| 12 | https://www.wasedajuku.com/guidance/ | 早稲田塾 | 除外 | フォームなし (説明会案内) |
| 13 | https://www.wasedajuku.com/taiken/ | 早稲田塾 | 除外 | フォームなし (No.11と同一頁に転送) |
| 14 | https://www.kumon.ne.jp/trial/taiken/index.html | 公文教育研究会 | 除外 | フォームなし (静的formは教室検索search_address/search_zipのみ) |
| 15 | https://www.kumon.ne.jp/shiryo/index.html | 公文教育研究会 | 除外 | フォームなし (同上・教室検索のみ) |
| 16 | https://www.kumon.ne.jp/inquiry/annai.php | 公文教育研究会 | 有望 P1 | 静的実フォーム (教室案内入力。氏名・住所・tel・tel2/3・email・学年。多様性◎) |
| 17 | https://www.kumon.ne.jp/tetsuzuki/otoiawase/index.html | 公文教育研究会 | 除外 | フォームなし (案内ハブ。静的formは教室検索のみ) |
| 18 | https://www.kawai-juku.ac.jp/apply/ | 河合塾 | 除外 | フォームなし (申込案内。静的formはサイト内検索のみ) |
| 19 | https://www.kawai-juku.ac.jp/trial-exam/ | 河合塾 | 除外 | フォームなし (模試案内。検索のみ) |
| 20 | https://www.kawaijuku.jp/inquiry.html | 河合塾グループ | 除外 | フォームなし (グループ問合せ案内。検索のみ) |
| 21 | https://www.kawai-trial.jp/ | 河合塾 | 除外 | フォームなし (共通テストトライアルLP) |
| 22 | https://www.manavis.com/contact/shiryou.php | 河合塾マナビス | 有望 P1 | 静的実フォーム (資料請求入力。氏名・カナ・住所・email確認・学校・学年。多様性◎) |
| 23 | https://www.manavis.com/contact/taiken.php | 河合塾マナビス | 除外 | 到達先にformなし (taiken.php→トップに転送) |
| 24 | https://www.manavis.com/contact/top.html | 河合塾マナビス | 除外 | フォームなし (問合せハブ。input2はhidden系のみ) |
| 25 | https://www2.sundai.ac.jp/yobi/sv/faq/toiawase.html | 駿台予備学校 | 除外 | フォームなし (問合せ先一覧。静的formは検索のみ) |
| 26 | https://www2.sundai.ac.jp/ap/admission-information-session.html | 駿台 | 除外 | JS描画のみ (size2703・formなし。申込欄はJS生成とみられる) |
| 27 | https://www2.sundai.ac.jp/yobi/sv/eventsel/index.html | 駿台予備学校 | 除外 | フォームなし (イベント検索3件のみ) |
| 28 | https://www.zkai.co.jp/home/entry/ | Z会 | 除外 | フォームなし (入会案内。静的formは検索のみ・申込は会員フロー) |
| 29 | https://www.zkai.co.jp/home/inquiry/ | Z会 | 除外 | フォームなし (同上) |
| 30 | https://www.zkai.co.jp/high/entry/ | Z会 | 除外 | フォームなし (同上) |
| 31 | https://www.zkai.co.jp/ca/request-information-form/ | Z会 | 除外 | フォームなし (資料請求案内。検索のみ) |
| 32 | https://www.zkai.co.jp/el/entry/ | Z会 | 除外 | フォームなし (同上) |
| 33 | https://www.eikoh.co.jp/eforms/user/app.php?keycode=477_p9cn520by1 | 栄光ゼミナール | 有望 P1 | 静的実フォーム (eforms総合資料請求。氏名・カナ・email・tel・現学校。多様性◎) |
| 34 | https://www.eikoh.co.jp/eforms/user/app.php?keycode=488_g2914w2klz | 栄光ゼミナール | 有望 P2 | 静的実フォーム (授業体験申込。No.33と同型) |
| 35 | https://www.eikoh.co.jp/taikendan/ | 栄光ゼミナール | 除外 | フォームなし (合格体験談+検索) |
| 36 | https://www.shozemi.com/contact/ | 湘南ゼミナール | 有望 P1 | 静的実フォーム (氏名・カナ・住所zip・tel・email・学年・目的。多様性◎) |
| 37 | https://www.shozemi.com/taiken/ | 湘南ゼミナール | 除外 | フォームなし (体験案内。申込はcontact別導線) |
| 38 | https://www.kobetsu.co.jp/contact/ | 東京個別指導学院 | 有望 P2 | 要精査 (Next.js SSR。氏名sei/mei・email・tel・学年・radioが静的に存在もform actionなし→JS送信疑いのためP2) |
| 39 | https://www.kobetsu.co.jp/inquiry/ | 東京個別指導学院 | 有望 P3 | 要精査・予備 (No.38と同系・総合問合せ) |
| 40 | https://www.kobetsu.co.jp/taiken/ | 東京個別指導学院 | 除外 | フォームなし (合格実績頁。無関係) |
<!--APPEND-->
