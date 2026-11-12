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
| 41 | https://www.kobetsu.co.jp/kansai/ | 関西個別指導学院 | 除外 | フォームなし (地域トップ。formなし) |
| 42 | https://www.tetsuryokukai.co.jp/pamphlet.html | 鉄緑会 | 除外 | フォームなし (資料請求案内。telリンクのみ) |
| 43 | https://www.tetsuryokukai.co.jp/inquiry.html | 鉄緑会 | 除外 | 到達不能 (HTTP 404) |
| 44 | https://www.gakken.co.jp/ja/contact.html | 学研ホールディングス | 除外 | フォームなし (HD問合せハブ。静的formは検索のみ) |
| 45 | https://www.889100.com/inquiry_tokens/new | 学研教室 | 除外 | フォームなし (教室検索頁。formなし) |
| 46 | https://www.sozogakuen.co.jp/contact/ | 創造学園 | 除外 | 到達不能 (HTTP 404) |
| 47 | https://www.waseda-ac.co.jp/inquiry/ | 早稲田アカデミー | 除外 | フォームなし (相談案内。静的formは校舎検索+サイト検索のみ) |
| 48 | https://www.waseda-ac.co.jp/entrance/ | 早稲田アカデミー | 除外 | フォームなし (入塾案内。同上) |
| 49 | https://reg.waseda-ac.co.jp/public/application/add/1397 | 早稲田アカデミー | 有望 P1 | 静的実フォーム (申込基盤public/application。input44・ta2・sel11。NY校問合せ・資料請求。多様性◎) |
| 50 | https://reg.waseda-ac.co.jp/public/application/add/479 | 早稲田アカデミー | 有望 P2 | 静的実フォーム (学習相談予約。同系2件目のためP2) |
| 51 | https://www.morijuku.com/contact/ | 森塾 | 有望 P1 | 静的実フォーム (氏名・カナ・住所zip/pref・tel・email。多様性◎) |
| 52 | https://www.morijuku.com/join/freetrial/ | 森塾 | 除外 | フォームなし (体験案内。申込はcontact別導線) |
| 53 | https://www.jiritsu-red.jp/contact/ | 自立学習RED | 有望 P1 | 静的実フォーム (森塾と同系基盤。氏名・カナ・住所・tel・email。多様性◎) |
| 54 | https://www.jiritsu-red.jp/fccontact/ | 自立学習RED | 有望 P2 | 静的実フォーム (FC加盟募集。法人・担当者カナ・tel・住所。B2BのためP2) |
| 55 | https://www.sprix.jp/ | スプリックス | 除外 | 到達不能 (curl code=000。森塾・REDでグループカバー) |
| 56 | https://www.tomas.co.jp/contact/ | TOMAS | 除外 | フォームなし (問合せハブ。formなし・実フォームはtrial_lesson別導線) |
| 57 | https://www.tomas.co.jp/contact/request/ | TOMAS | 除外 | フォームなし (同上ハブ) |
| 58 | https://www.tomas.co.jp/contact/trial_lesson/ | TOMAS | 有望 P1 | 静的実フォーム (Laravel。保護者+生徒氏名カナ・住所pref/city・email・学年。多様性◎) |
| 59 | https://www.tomas.co.jp/contact/curriculum/ | TOMAS | 除外 | フォームなし (同上ハブ) |
| 60 | https://meimonkai.co.jp/request/ | 名門会 | 有望 P2 | 静的実フォーム (Formidable。input46・ta1・sel5。項目名item_metaコード化のためP2) |
| 61 | https://meimonkai.co.jp/event/ | 名門会 | 除外 | フォームなし (セミナー案内) |
| 62 | https://www.shingakai.co.jp/experience/ | 伸芽会 | 除外 | フォームなし (合格者体験談) |
| 63 | https://www.shingakai.co.jp/news/event/ | 伸芽会 | 除外 | フォームなし (イベント案内) |
| 64 | https://www.trygroup.co.jp/request/ | 家庭教師のトライ | 除外 | フォームなし (資料請求案内。formなし・申込はJS導線とみられる) |
| 65 | https://www.trygroup.co.jp/experience/ | 家庭教師のトライ | 除外 | フォームなし (合格体験談) |
| 66 | https://www.kobekyo.com/contact/ | 個別教室のトライ | 除外 | JS描画のみ (JSアプリ殻+計測のみ・静的formなし) |
| 67 | https://www.kobekyo.com/ | 個別教室のトライ | 除外 | フォームなし (ブランドトップ。formなし) |
| 68 | https://www.try-gakuin.com/toiawase/ | トライ式高等学院 | 除外 | フォームなし (問合せ案内。formなし) |
| 69 | https://www.try-gakuin.com/reserve/ | トライ式高等学院 | 有望 P1 | 静的実フォーム (予約フォーム。input292。reserve[name_sei/mei]・email・tel・pref・希望日。多様性◎。action空の段階式疑いも静的欄が極めて豊か) |
| 70 | https://www.yarukiswitch.jp/inquiry/ | やる気スイッチグループ | 除外 | フォームなし (グループ問合せハブ) |
| 71 | https://www.yarukiswitch.jp/inquiry/other/ | やる気スイッチグループ | 有望 P2 | 静的実フォーム (氏名name01/02・email確認・tel・child_name。住所欄なしのためP2) |
| 72 | https://www.yarukiswitch.jp/inquiry/fc/ | やる気スイッチグループ | 有望 P2 | 静的実フォーム (FC加盟。会社・郵便・住所・email確認。B2BのためP2) |
| 73 | https://www.schoolie-net.jp/entry/ | スクールIE | 除外 | フォームなし (入塾の流れ案内) |
| 74 | https://www.schoolie-net.jp/search/request/ | スクールIE | 除外 | フォームなし (教室検索postal/stationのみ。実申込は後段) |
| 75 | https://www.schoolie-net.jp/search/trial/ | スクールIE | 除外 | フォームなし (同上) |
| 76 | https://www.winbe.co.jp/contact | WinBe | 除外 | フォームなし (CONTACT頁。formなし・JS導線とみられる) |
| 77 | https://www.ninja9.jp/forms/contact/ | 忍者ナイン | 有望 P2 | 静的実フォーム (無料体験申込。child_name_kana・email・tel・zip。住所はzipのみのためP2) |
| 78 | https://www.schoolie-net.jp/sp/contact/ | スクールIE | 除外 | 到達先にformなし (sp/contact→トップに転送) |
| 79 | https://www.meikogijuku.jp/contact/entry | 明光義塾 | 有望 P1 | 静的実フォーム (Drupal。氏名・カナ・住所addr1/2・email・tel・学校。多様性◎) |
| 80 | https://www.meikogijuku.jp/taiken/entry | 明光義塾 | 有望 P2 | 静的実フォーム (無料体験。同型2件目のためP2) |
| 81 | https://www.meikogijuku.jp/qa/taiken/ | 明光義塾 | 除外 | フォームなし (FAQ。静的formは教室検索のみ) |
| 82 | https://www.meikogijuku.jp/qa/soudan/ | 明光義塾 | 除外 | フォームなし (同上) |
| 83 | https://s1.kyoshin.co.jp/taiken/ | 京進スクール・ワン | 除外 | フォームなし (体験案内。input1は教室検索のみ・実申込はSMP別導線No.84) |
| 84 | https://reg18.smp.ne.jp/regist/is?SMPFORM=mjqd-maraob-3de8341d99c0daa975f12ed6ea3415de | 京進スクール・ワン | 有望 P1 | 静的実フォーム (SMP。保護者+生徒氏名・住所・email確認・tel。多様性◎) |
| 85 | https://kyoshin.co.jp/contact/ | 京進グループ | 除外 | 対象外 (グループIR問合せ・塾問合せでない。formなし) |
| 86 | https://www.with-us.co.jp/business/b-cram-school/ | ウィザス | 除外 | フォームなし (事業紹介頁。実窓口は第一ゼミ/ファロス別導線) |
| 87 | https://www.daiichisemi.net/contact/info/ | 第一ゼミナール | 除外 | JS描画のみ (静的inputはtokenのみ。name[first]・住所・email等の実欄はJS生成) |
| 88 | https://www.daiichisemi.net/contact/trial/ | 第一ゼミナール | 除外 | JS描画のみ (同上) |
| 89 | https://www.pharos21.net/ | ファロス個別指導学院 | 除外 | フォームなし (ブランドトップ。formなし) |
| 90 | https://www.rinkaiseminar.co.jp/contact/shiryo | 臨海セミナー | 有望 P1 | 静的実フォーム (CF7。住所・tel・email・学年。多様性◎) |
| 91 | https://www.rinkaiseminar.co.jp/contact/taiken | 臨海セミナー | 有望 P2 | 静的実フォーム (無料体験。No.90と同系・体験日等のためP2) |
| 92 | https://www.rinkaiseminar.co.jp/contact/support/ | 臨海セミナー | 有望 P2 | 静的実フォーム (ご意見・要望。radio+textarea。住所系薄めのためP2) |
| 93 | https://www.rinkaiselect.com/contact/shiryo | 臨海セレクト | 有望 P3 | 静的実フォーム (セレクト資料請求。CF7同系5件目のため予備P3) |
| 94 | https://www.rinkaiselect.com/contact/taiken | 臨海セレクト | 有望 P3 | 静的実フォーム (セレクト体験。同系6件目のため予備P3) |
| 95 | https://www.sanaru.co.jp/contact/ | 佐鳴予備校 | 有望 P1 | 静的実フォーム (idata[name/kana/address/pref/email確認]・tel/fax3分割。多様性◎) |
| 96 | https://www.sanaru.co.jp/shiryo/ | 佐鳴予備校 | 除外 | 到達不能 (HTTP 404) |
| 97 | https://www.sapix.co.jp/shiryou/ | SAPIX | 除外 | フォームなし (資料請求ハブ。静的formは検索のみ) |
| 98 | https://request.sapix.com/shiryou/sapix-juniorhighschool | SAPIX | 除外 | 到達先にformなし (request導線→shiryouハブに転送) |
| 99 | https://www.sapix.co.jp/entrance/ | SAPIX | 除外 | フォームなし (入室案内。検索のみ) |
| 100 | https://www.y-sapix.com/request/ | Y-SAPIX | 除外 | フォームなし (入室案内) |
| 101 | https://www.nichinoken.co.jp/request/ | 日能研 | 除外 | フォームなし (問合せ/資料請求ハブ) |
| 102 | https://www.nichinoken.co.jp/contents/contact/app/view/contact/ContactEntryView.php | 日能研 | 有望 P2 | 静的実フォーム (fullName・email確認・message・種別。欄が小さいためP2) |
| 103 | https://www.nichinoken.co.jp/event/trial/ | 日能研 | 除外 | フォームなし (イベント案内) |
| 104 | https://www.julius.ne.jp/request.html | 個別指導ユリウス | 除外 | フォームなし (資料請求案内。実フォームはcontact→apply別導線) |
| 105 | https://www.julius.ne.jp/contact/ | 個別指導ユリウス | 除外 | 実欄なし (apply/entry初段は同意ボタンのみ・実欄は後段JS) |
| 106 | https://www.ichishin.co.jp/shiryo/tabid/300/Default.html | 市進学院 | 除外 | 到達不能 (HTTP 404「ページが見つかりません」) |
| 107 | https://www.ichishin.co.jp/nyukai/tabid/301/Default.aspx | 市進学院 | 除外 | 実欄なし (DNN postback。inputはVIEWSTATE等のみ) |
| 108 | https://reg18.smp.ne.jp/regist/is?SMPFORM=ncpd-mbtgrh-140da6f466b94a6cd5f8054138f03923 | 市進学院 | 有望 P1 | 静的実フォーム (SMP。input121・ta3・sel12。保護者+生徒氏名カナ・住所・email確認。多様性◎) |
| 109 | https://www.kotaro-juku.co.jp/contact/ | 個太郎塾 | 有望 P2 | 静的実フォーム (postmail.cgi。日本語項目名・住所・郵便・email・tel。FC窓口のためP2) |
| 110 | https://www.kotaro-juku.co.jp/request/ | 個太郎塾 | 有望 P3 | 静的実フォーム (FC資料請求。B2B予備のためP3) |
| 111 | https://www.ena.co.jp/request_form/ | ena | 有望 P1 | 静的実フォーム (CF7。input56・ta2・sel5。住所・tel・email。多様性◎) |
| 112 | https://www.ena.co.jp/contact/ | ena | 有望 P2 | 静的実フォーム (CF7ご相談・お問合せ。同系2件目のためP2) |
| 113 | https://www.ena.co.jp/eventform/ | ena | 有望 P2 | 静的実フォーム (CF7イベント申込。同系3件目のためP2) |
| 114 | https://www.eishinkan.net/inquiry/place/ | 英進館 | 除外 | フォームなし (教場一覧。静的formはGoogle検索のみ・実申込はSMP別導線No.116) |
| 115 | https://www.eishinkan.net/inquiry/free.php | 英進館 | 除外 | フォームなし (体験案内。同上) |
| 116 | https://reg34.smp.ne.jp/regist/is?SMPFORM=qcnc-maphkb-0db25bb6f4a5b6785732327ff044c78c | 英進館 | 有望 P1 | 静的実フォーム (SMP。保護者氏名カナ・住所・email確認・tel・性別。多様性◎) |
| 117 | https://www.hamagakuen.co.jp/others/inquiry/ | 浜学園 | 除外 | フォームなし (問合せ案内) |
| 118 | https://www.hamagakuen.co.jp/entrance/experience/ | 浜学園 | 除外 | フォームなし (合格体験記+検索) |
| 119 | https://axis-kobetsu.jp/contact/inquiry | 個別指導Axis | 有望 P1 | 静的実フォーム (firstName/kana・住所・email・tel・dob・学年。多様性◎) |
| 120 | https://axis-kobetsu.jp/contact/trial | 個別指導Axis | 有望 P2 | 静的実フォーム (体験申込。同系2件目のためP2) |
| 121 | https://www.wao-corp.com/contact/ | 能開センター | 除外 | フォームなし (企業問合せ案内。formなし) |
| 122 | https://www.stepnet.co.jp/beginner/apply.html | ステップ | 除外 | 実欄なし (入会手続=口座振替登録。yokohamabank欄のみ・氏名住所欄なし・外部決済導線) |
| 123 | https://www.stepnet.co.jp/beginner/trial.html | ステップ | 除外 | フォームなし (体験案内) |
| 124 | https://www.mabuchi.co.jp/ | 馬渕教室 | 除外 | JS描画のみ (size2371・formなし) |
| 125 | https://www.gakken-signone.jp/ | 進学塾サイン・ワン | 除外 | 到達不能 (公式ドメイン特定不能・推測URL到達不能 curl code=000) |
| 126 | https://www.waseda-school.jp/ | 早稲田スクール | 除外 | 到達不能 (同上) |
| 127 | https://member.wasedajuku.com/Event/Application.aspx?type=05 | 早稲田塾 | 有望 P2 | 要精査 (ASP.NET説明会申込。txtTextBox・zip・combo等42inputs。項目名コード化+postbackのためP2) |
| 128 | https://www.yotsuyaotsuka.com/lform/yotsuya_tsujuku_form/yotsuya123-tsujuku/input | 四谷大塚 | 有望 P2 | 静的実フォーム (1-3年リトル。児童漢字/カナ・住所・fax3分割。No.7と同系3件目のためP2) |
| 129 | https://www.yotsuyaotsuka.com/lform/yotsuya_tsujuku_form/yotsuya456-tsujuku/input | 四谷大塚 | 有望 P3 | 静的実フォーム (4-6年通塾。No.128と同型4件目のため予備P3) |
| 130 | https://www.yotsuyaotsuka.com/pform/iws/little_club/input | 四谷大塚 | 有望 P1 | 静的実フォーム (pform系。EMAIL確認・保護者カナ・GAKKO_NM・生年月日。多様性◎) |
| 131 | https://www.yotsuyaotsuka.com/pform/iws/shingaku_club/input | 四谷大塚 | 有望 P2 | 静的実フォーム (同型・進学クラブ。No.130と同系のためP2) |

## 塾フォームの機構メモ (R4-8b以降の取込時の参考)

- 自社CakePHP系: 東進 sform (`_csrfToken`・address1-3)、四谷大塚 lform/pform (児童+保護者・email確認)、森塾・RED 自社 (`kinds[]`・name1/kana1・token)、TOMAS Laravel (`_token`)、明光 Drupal (`form_build_id`)、日能研自社 (ContactEntryView)、個太郎 postmail.cgi (日本語項目名)、Axis自社 (camelCase firstName等)。
- WordPress CF7系: 臨海セミナー/セレクト・ena (`_wpcf7`・form_* 系)。静的で欄が豊富。
- SMP系 (`reg*.smp.ne.jp`): 京進・市進・英進館。`SMPFORM` トークンごとに別フォーム。保護者+生徒・住所・email確認と欄が豊か。
- 申込基盤系: 早稲田アカデミー `reg.waseda-ac.co.jp/public/application/*` (番号ごとに別フォーム)、栄光 eforms (`keycode` ごとに別フォーム)、名門会 Formidable (`item_meta` コード化)、早稲田塾 member ASP.NET postback (項目名コード化)。
- 要精査系: 東京個別 Next.js SSR (静的欄あり・actionなし)、トライ式高等学院 reserve (action空の段階式・欄292)、ユリウス apply/entry (初段は同意のみ)。
- JS描画のみで除外: 第一ゼミナール (実欄はJS生成)、個別教室のトライ kobekyo (JSアプリ殻)、馬渕教室トップ、駿台入学説明会申込。
- 教室検索のみで除外が多発: 公文・スクールIE・eishinkan体験案内などは教室検索が静的formの実体。実申込は後段フロー。

## 集計

- 試行総数: 131件 (No.1-131。要求100件以上を満たす)
- 有望: 47件 (P1 21件・P2 21件・P3 5件)
  - P1 (21): No.1, 4, 7, 16, 22, 33, 36, 49, 51, 53, 58, 69, 79, 84, 90, 95, 108, 111, 116, 119, 130
  - P2 (21): No.2, 3, 34, 38, 50, 54, 60, 71, 72, 77, 80, 91, 92, 102, 109, 112, 113, 120, 127, 128, 131
  - P3 (5): No.39, 93, 94, 110, 129
- 除外: 84件 (フォームなし 65・JS描画のみ 5・到達不能 7・到達先にformなし 3・実欄なし 3・対象外 1)
- 既存分 (`tests/target-url.md`) との重複: なし (全件URL照合。SMP系は同一ホストだがトークン別フォーム)
- R4-1の183件との重複: なし (全件URL照合)
- ブランドカバー: brief記載の20グループ+準大手の全グループからURLを取得。有望ゼロのブランド: 駿台・鉄緑会・サイン・ワン・早稲田スクール・第一ゼミナール/ファロス・SAPIX/Y-SAPIX・浜学園・能開・ステップ・馬渕・関西個別 (静的実フォームなし/JS/到達不能のため。R4-8b以降でJS描画系の再検討余地あり)

