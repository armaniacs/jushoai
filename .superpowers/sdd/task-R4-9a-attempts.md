# Task R4-9a 試行ログ — 大手デベロッパー候補URLリスト

- 目的: PBI-208 Round4 の一環として、ユーザー指定の大手デベロッパー (総合・専業・電鉄インフラ系) の公式サイトから実フォーム持ち静的ページ候補を100 URL以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-9b 以降)。
- 対象 (brief 記載をverbatimで使用): 総合: 三井不動産 (三井不動産レジデンシャル: パークホームズ等) / 三菱地所 (三菱地所レジデンス: ザ・パークハウス) / 住友不動産 (シティハウス等) / 野村不動産HD・野村不動産 (プラウド・オハナ) / 東急不動産HD・東急不動産 (ブランズ) / 東京建物 (ブリリア) / 大京・オリックスG (ライオンズ・サーパス) / ヒューリック / 森ビル / 森トラスト。専業・準大手: オープンハウスG (オープンレジデンシア・プレサンス) / MIRARTH・タカラレーベン (レーベン) / 穴吹興産 (アルファ) / エスリード / 長谷工G (総合地所・長谷工不動産: ルネ等) / コスモスイニシア (イニシア) / エスコン (レ・ジェイド) / フージャースHD (デュオヒルズ) / 明和地所 (クリオ) / FJネクスト (ガーラ) / 日神G (パレステージ等) / ゴールドクレスト / 和田興産 (ワコーレ)。電鉄・インフラ・住宅メーカー系: 阪急阪神不動産 (ジオ) / 近鉄不動産 (ローレル) / JR西日本G (ジェイグラン) / 小田急不動産 (リーフィア) / 京阪電鉄不動産 (ファイン) / 西日本鉄道 (サンリヤン) / 日鉄興和不動産 (リビオ) / NTT都市開発 (ウエリス) / 関電不動産開発 (シエリア) / 伊藤忠都市開発 (クレヴィア) / 大和ハウス工業 (プレミスト) / 積水ハウス (グランドメゾン) / 旭化成不動産レジデンス (アトラス)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外URLは理由を記録。
- 重複排除: 取込済みの三井ホーム・三井リフォーム・三井賃貸・東急不動産・三菱商事 (`tests/target-url.md` 記載URL) および R4-1 の183件とは全件URL照合し重複なし (同一ドメインでもパス・クエリが異なるURLのみ採用)。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、`<form`・`input`・`textarea`・`select` の有無と action・欄種を目視/計数。動的取得フォーム (JS描画) は「除外: JS描画のみ」。
- 有望の優先順位: P1 (欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい・機構が特殊) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-9b 以降が `make addurl` で行う。

## 試行ログ

| # | URL | 社名/ブランド名 | 判定 | 除外理由 / フォーム概要 |
|---|-----|----------------|------|--------------------------|
| 1 | https://www.31sumai.com/contact.html | 三井不動産レジデンシャル/三井の住まい | 除外 | フォームなし (HTTP 200だが静的formは `action=/logout` のログアウト1件のみ。実窓口は別導線) |
| 2 | https://www.31sumai.com/concierge_form/ | 三井不動産レジデンシャル/コンシェルジュ | 除外 | フォームなし (HTTP 200「コンシェルジュ営業室」案内頁。静的formなし。相談申込はJS導線とみられる) |
| 3 | https://www.31sumai.com/finecourt/page/fc_inquire/ | 三井不動産レジデンシャル/ファインコート | 除外 | フォームなし (HTTP 200だが静的formは `/logout` のみ。ファインコート倶楽部案内頁) |
| 4 | https://www.mfr.co.jp/inquire/index2.html | 三井不動産レジデンシャル | 除外 | フォームなし (HTTP 200「ご契約中のお客様」案内頁。静的formなし・リンク集) |
| 5 | https://www.mfr.co.jp/inquire/index3.html | 三井不動産レジデンシャル | 除外 | フォームなし (HTTP 200「分譲住宅にお住まいのお客様」案内頁。静的formなし・リンク集) |
| 6 | https://lets.mitsuifudosan.co.jp/contact | 三井不動産/レッツ無料相談 | 有望 P2 | 静的実フォーム (HTTP 200。input 51・textarea 1・select 5。`Question*` 系コード化項目の大規模相談申込。住所欄は取込時に要確認のためP2) |
| 7 | https://office-form.mitsuifudosan.co.jp/officeInquiry/?enqueteurl=fcd1d9d64eb186a2fd41fb280d21f186 | 三井不動産/オフィス問合せ | 除外 | ログイン必須 (HTTP 200だが実体は Salesforce LWC Communities「Welcome」画面。静的formなし) |
| 8 | https://mfshogyo.mitsuifudosan.co.jp/contact/tenant/ | 三井不動産/商業テナント出店 | 有望 P2 | 静的実フォーム (HTTP 200→scinfo Pardot。input 26・textarea 1・select 2。Pardot `pi_*` コード化だが会社・出店条件欄あり。B2B色のためP2) |
| 9 | https://mfhl.mitsui-chintai.co.jp/contact/inquiry/index.html | 三井不動産賃貸/三井の賃貸 | 除外 | 到達不能 (HTTP 200だが実体は Shift_JIS の meta-refresh 残骸頁。formなし。取込済み `form.mitsui-chintai.co.jp/...` とは別URLだが到達不能のため除外) |
| 10 | https://www.mecsumai.com/user-support/inquiry/ | 三菱地所レジデンス/ザ・パークハウス | 除外 | ログイン必須の可能性 (HTTP 200だが静的form 3件は `mp_login_check.jsp` 宛ログイン系のみ。資料請求の実体は会員導線) |
| 11 | http://www.mec-r.com/inquiry/land_business.html | 三菱地所レジデンス/不動産活用 | 除外 | フォームなし (HTTP 200→`/inquiry/rebuilding/` に転送。「お問い合わせ」案内頁で静的formなし) |
| 12 | https://www.mec.co.jp/inquiry/ | 三菱地所 | 除外 | フォームなし (HTTP 200「お問合せ」だが静的form 2件は `action=/search/` の検索のみ) |
| 13 | https://www.mecsumai.com/contact/ | 三菱地所レジデンス | 除外 | 到達不能 (HTTP 404。静的formはログイン系3件のみ) |
| 14 | https://www.mec-reform.com/contact/ | 三菱地所リフォーム | 除外 | フォームなし (HTTP 200「ご相談・資料請求」案内頁。静的formなし。申込はJS導線とみられる) |
| 15 | https://area26.smp.ne.jp/area/is?SMPFORM=tan-qgtip-f478fc7bad621de23fd4a1c516a04915 | 住友不動産/SMP広報 | 有望 P2 | 静的実フォーム (HTTP 200。`action=/area/Reg2`、input 22・select 1・textarea 1。SMP系 `f00*` コード化項目。R4-1のSMP P1群と同機構のためP2) |
| 16 | https://area26.smp.ne.jp/area/is?SMPFORM=tan-qhljq-510354f26c71d02e65f6f9a0567eca4b | 住友不動産/SMP IR・ESG | 有望 P3 | 静的実フォーム (HTTP 200。No.15と同型・IR宛違い。同一機構3件目のため予備P3) |
| 17 | https://area26.smp.ne.jp/area/is?SMPFORM=tan-qhljr-40be8a4aa4f9ea1b610ffe68b0693618 | 住友不動産/SMPその他 | 有望 P3 | 静的実フォーム (HTTP 200。No.15と同型・その他宛。同一機構4件目のため予備P3) |
| 18 | https://area26.smp.ne.jp/area/is?SMPFORM=tat-qhrdp-7e5459ab8b659b0c939c54f52e94ab55 | 住友不動産/SMP | 有望 P3 | 静的実フォーム (HTTP 200。`action=/area/Reg2`、input 17・select 2・textarea 1。命名欄が少なく取込時要精査のため予備P3) |
| 19 | https://reg18.smp.ne.jp/regist/is?SMPFORM=ocnd-ldlirf-9c66cded2761f122279b692570e8a021 | 住友不動産/SMPオープンハウス系 | 有望 P1 | 静的実フォーム (HTTP 200。`action=/regist/Reg2`、input 26。`name`・`name_kana`・`zipcode:a/t`・`address`・`phone:a/e/n`・`mail`確認・`privacy`。命名が素直で多様性◎) |
| 20 | https://residence.sumitomo-latour.jp/inquiry/ | 住友不動産/ラ・トゥール見学予約 | 有望 P1 | 静的実フォーム (HTTP 200「お問合せ/見学予約」。`action=/inquiry/check.php`、input 18・select 14。`name`・`name_ruby`・`postcode1`・都道府県select `address1`・`tel`・`mail`確認・予算/間取りselect群。多様性◎) |
| 21 | https://sumifu-step-form.spiral-site.com/otoiawase | 住友不動産/すみふの仲介ステップ | 有望 P1 | 静的実フォーム (SPIRAL。input 25。`name`・`name_kana`・`zip01/02`・`address01`・都道府県 `pref`・`tel`・`email`確認2欄・`company`。仲介問合せ。多様性◎) |
| 22 | https://office.sumitomo-rd.co.jp/contact/ | 住友不動産/賃貸オフィスビル | 有望 P2 | 静的実フォーム (SPIRAL。input 31。`contact_name`・`company_name`・`tel`・`email`・面積/従業員数等の法人条件欄。一部 `f0*` コード化のためP2) |
| 23 | https://www.proud-web.jp/module/inquiry/contactForm | 野村不動産/プラウド各種問合せ | 除外 | JS描画のみ (HTTP 200「各種お問い合わせ」ハブ。静的formなし。実フォームは物件別JS導線とみられる) |
| 24 | https://www.proud-web.jp/module/inquiry/procedureForm.xphp | 野村不動産/プラウド住所変更・発送停止 | 有望 P1 | 静的実フォーム (HTTP 200。`action=/module/inquiryConfirm/procedureForm`、input 31。`last_name/first_name` 新旧対照・`zip_code`・`address1-4`・`tel_num`・`email` 新旧・`consumer_number`。対照型の珍しい構成で多様性◎) |
| 25 | https://krs.bz/nomura-re/m/structure/ | 野村不動産/マンション再生相談 | 有望 P2 | 静的実フォーム (krs.bz。input 25。郵便 `e_12013[zip1/2]`・tel 3分割 `e_12035[tel1/2/3]`・email確認・checkbox群。項目名コード化のためP2) |
| 26 | https://krs.bz/nomura-re/m/tochikatsuyo/ | 野村不動産/土地活用問合せ | 有望 P2 | 静的実フォーム (krs.bz。input 34・select 4。郵便/tel 3分割・email確認・土地条件欄。コード化のためP2。No.25と同機構) |
| 27 | https://www.nomura-re.co.jp/english/contact/ | 野村不動産/英文Contact | 除外 | フォームなし (HTTP 200だが静的formなし。メール窓口案内のみ) |
| 28 | https://www.tokyu-land.co.jp/form/branz_ad/ | 東急不動産/BRANZ広告営業 | 有望 P2 | 静的実フォーム (HTTP 200。`action=./index.php`、input 20。`name`・`kana`・`zip`・`address1/2`・`tel`・`mail`確認・`company_name`。B2B向けのためP2。取込済み4 formとは別path) |
| 29 | https://www.tokyu-land.co.jp/form/branz_owner/ | 東急不動産/BRANZオーナー | 有望 P1 | 静的実フォーム (HTTP 200。input 29。`name`・`kana`・`zip`・`address1/2`・`tel`・`mail`確認・`mansion_name`・`room_no`。物件特定欄つきで多様性◎) |
| 30 | https://www.tokyu-land.co.jp/form/commercial/ | 東急不動産/商業施設 | 有望 P1 | 静的実フォーム (HTTP 200。input 31・select 3。氏名/カナ/住所/email確認に加え自宅・土地・ビル等の条件分岐欄。分岐型で多様性◎) |
| 31 | https://www.tokyu-land.co.jp/form/cre/ | 東急不動産/CREコンサル | 有望 P1 | 静的実フォーム (HTTP 200。input 37。No.30と同系・CRE条件欄。法人+個人の複合構成で多様性◎) |
| 32 | https://www.tokyu-land.co.jp/form/student_residence/ | 東急不動産/学生レジデンス | 有望 P2 | 静的実フォーム (HTTP 200。input 14。`name`・`kana`・`zip`・`address1/2`・`mail`確認。欄が小さめのためP2) |
| 33 | https://www.tokyu-land.co.jp/form/tatekae/ | 東急不動産/マンション建替え | 有望 P2 | 静的実フォーム (HTTP 200。input 15。`name`・`kana`・住所・`tel`・`company`。建替え相談の特殊窓口のためP2) |
| 34 | https://www.tokyu-land.co.jp/form/global_contact/ | 東急不動産/海外事業 | 有望 P2 | 静的実フォーム (HTTP 200。input 23。`name`・`kana`・住所・`tel`・`company`・`title`。海外事業窓口のためP2) |
| 35 | https://tatemono.com/inquiry/ | 東京建物 | 除外 | フォームなし (HTTP 200「お問い合わせ」だが静的formは `search.tatemono.com` 宛検索のみ) |
| 36 | https://fmt.e-state.ne.jp/brillia-support/contact/ | 東京建物/ブリリア住まい相談 | 有望 P1 | 静的実フォーム (e-state。input 48・select 5。`family_name/first_name`・カナ対・`email`・希望日 `day1a/2a`・`enquete*` 群。相談予約型で多様性◎) |
| 37 | https://brillia.com/contact/ | 東京建物/ブリリア | 除外 | 到達不能 (HTTP 404 NOT FOUND頁。formなし) |
| 38 | https://www.tatemono.com/toiawase/ | 東京建物 | 除外 | 到達不能 (HTTP 404。静的formは検索のみ) |
| 39 | https://www.lions-mansion.jp/inquiry/ | 大京/ライオンズ | 除外 | JS描画のみ (HTTP 200「お問い合わせ」だが静的formなし。実フォームは `contact.daikyo.co.jp` cgi=No.40に分離) |
| 40 | https://contact.daikyo.co.jp/cgi-bin/info/inquiry.cgi | 大京/総合問合せcgi | 有望 P3 | 静的実フォーム (HTTP 200。input 9。email分割 `email_head/fut`・tel 3分割・`naiyou`。欄が小さいため予備P3) |
| 41 | https://www.daikyo.co.jp/contact.html | 大京 | 除外 | フォームなし (HTTP 200「お問い合わせ」リンク集。静的formなし。実フォームはNo.40のcgiに分離) |
| 42 | https://www.daikyo-anabuki.co.jp/contact/ | 大京穴吹不動産 | 除外 | フォームなし (HTTP 200だが静的form 2件は検索系のみ。問合せ実体は別導線) |
| 43 | https://www.hulic.co.jp/business/inquiry/entry?subject=developPlan | ヒューリック/不動産開発 | 有望 P1 | 静的実フォーム (HTTP 200。`action=/business/inquiry/confirm`、input 28。`name1/2`・`kana1/2`・`zip`・`address`・`tel`・`mail`確認・`company_name`・`building`。命名素直で多様性◎) |
| 44 | https://www.hulic.co.jp/contact/entry?subject=hotel | ヒューリック/ホテル | 有望 P2 | 静的実フォーム (HTTP 200。input 21。No.43と同系・ホテル宛。`fax` 欄あり。同機構2件目のためP2) |
| 45 | https://www.hulic.co.jp/contact/other/entry | ヒューリック/その他 | 有望 P2 | 静的実フォーム (HTTP 200。input 18。No.43と同系・その他宛。`gender`・`age`・`title` 欄が特徴。同機構3件目のためP2) |
| 46 | https://www.hulic.co.jp/ir/inquiry/entry | ヒューリック/IR | 有望 P2 | 静的実フォーム (HTTP 200。input 18。No.43と同系・IR宛。同機構4件目のためP2) |
| 47 | https://mori.webcas.net/form/pub/f008/contact | 森ビル/総合問合せ | 有望 P1 | 静的実フォーム (webcas。input 16。姓/名 `c_q10_first/second`・カナ対 `c_q28`・email確認 `c_q27(_confirm)`・tel 3分割・住所 `c_q29`・`c_q30`。R4-1のcform群と同機構で多様性◎) |
| 48 | https://mori.webcas.net/form/pub/f006/compliance | 森ビル/取引先通報窓口 | 有望 P2 | 静的実フォーム (webcas。input 23。`c_q*` 系・tel 3分割あり。通報窓口で住所欄は要確認のためP2) |
| 49 | https://www.hillsform.com/inquiry | 森ビル/ヒルズフォーム | 除外 | ログイン必須 (HTTP 404→`/login?auto_login=1` に転送。会員系導線) |
| 50 | https://f.msgs.jp/webapp/form/13445_dxt_1080/index.do | 森ビル/問合せStruts | 有望 P2 | 静的実フォーム (HTTP 200「お問い合わせ/Inquires」。Struts Webフォーム、input 6・select 2・textarea 1。R4-1神戸市formと同機構。欄小さめのためP2) |
| 51 | https://www.sacravia.co.jp/contact/form.html | 森ビルグループ/サクラビア | 除外 | 到達不能 (HTTP 503。formなし) |
| 52 | https://www.mori-trust.co.jp/contact/ | 森トラスト | 除外 | フォームなし (HTTP 200「お問い合わせ」だが静的formなし。窓口別リンク集で実フォームは外部導線) |
| 53 | https://mt-rs.co.jp/contact/ | 森トラスト・レジデンシャルサービス | 除外 | フォームなし (HTTP 200だが静的formなし。案内頁) |
| 54 | https://www.mori-trust.co.jp/business/contact/ | 森トラスト/事業 | 除外 | 到達不能 (HTTP 200だが実体は404頁。formなし。URL推測の失敗) |
| 55 | https://openhouse-group.co.jp/support/contact.html | オープンハウスG/顧客相談窓口 | 有望 P1 | 静的実フォーム (HTTP 200。`action=https://reg18.smp.ne.jp/regist/Reg2` のSMP直結、input 54。`family_name/given_name`・カナ対・`zip_code`・都道府県 `prefecture`・`street`・`phone_number`・email・`inquiry_text`。命名素直で多様性◎) |
| 56 | https://openhouse-group.co.jp/ir/ircontact/ | オープンハウスG/IR | 除外 | フォームなし (HTTP 200だが静的formなし。IR問合せは別導線とみられる) |
| 57 | https://ohd.openhouse-group.com/contact/ | オープンハウス・ディベロップメント | 除外 | 到達不能 (HTTP 404 NotFound頁。formなし) |
| 58 | https://www.op-house.com/contact/ | オープンハウス(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 59 | https://mirarth.co.jp/contact/ | MIRARTHホールディングス | 有望 P2 | 静的実フォーム (HTTP 200。input 9。`name`・`namekana`・`tel`・`email`・`company`・`department`。欄小さめのためP2) |
| 60 | https://mirarth.co.jp/ir/contact/ | MIRARTH/IR | 除外 | フォームなし (HTTP 200だが静的form 2件は `action=/search/` の検索のみ) |
| 61 | https://www.leben.co.jp/contact/ | タカラレーベン | 有望 P2 | 静的実フォーム (HTTP 200。input 7。`name`・`kana`・`mail`・`tel`・`company`。欄小さめのためP2) |
| 62 | https://www.lebenhomes.jp/contact/ | レーベン(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 63 | https://www.anabuki.ne.jp/contact/form.php?contact_type=1 | 穴吹興産/総合問合せ | 有望 P1 | 静的実フォーム (HTTP 200。`action=/contact/form.php`、input 15。`name`・`kana`・`zip`・`address`・`tel`・email確認・`company`・`business_type`。命名素直で多様性◎) |
| 64 | https://www.anabuki.ne.jp/contact/form.php?contact_type=3 | 穴吹興産/分譲関連 | 有望 P2 | 静的実フォーム (HTTP 200。No.63と同型・種別違い。同機構2件目のためP2) |
| 65 | https://www.anabuki.ne.jp/contact/landuse/?contact_type=7 | 穴吹興産/土地活用 | 有望 P1 | 静的実フォーム (HTTP 200。input 32。No.63系+ `site_zip`・`site_address`・`site_area`・建物規模/構造 `[]`・`counseling_type[]`。土地条件の複合構成で多様性◎) |
| 66 | https://www.anabuki-style.com/contact/ | アルファあなぶきStyle(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 67 | https://www.slead.co.jp/contact/ | エスリード | 除外 | 到達不能 (DNS解決失敗・curl code=6。bot遮断またはドメイン異常。R4-1 precedentの到達不能に準じる) |
| 68 | https://www.slead.co.jp/inquiry/ | エスリード(推測) | 除外 | 到達不能 (同上・curl code=6) |
| 69 | https://reg34.smp.ne.jp/regist/is?SMPFORM=ncmf-ldtirg-a37edba46696efadf95511994fa07517 | 長谷工G/SMP | 有望 P2 | 静的実フォーム (HTTP 200。`action=/regist/Reg2`、input 55・select 5。SMP系 `f00*` コード化の大規模フォーム。コード化のためP2) |
| 70 | https://reg34.smp.ne.jp/regist/is?SMPFORM=qdqd-mbkbmd-f4f7841cb5935c1b0c9a59939d710091 | 長谷工G/SMP | 有望 P2 | 静的実フォーム (HTTP 200。input 37。No.69と同機構・別窓口。コード化のためP2) |
| 71 | https://www.haseko.co.jp/hc/contact/input | 長谷工コーポレーション | 有望 P1 | 静的実フォーム (HTTP 200「入力」。`action=/hc/contact/input`、input 18。`name01/02`・`mail01/02`・`post`・`tel`・`company`・`transfer`。素直な命名で多様性◎) |
| 72 | https://haseko-systems-contactpage.spiral-site.com/contact | 長谷工システムズ | 有望 P3 | 静的実フォーム (SPIRAL。input 18。`f0*` コード化+email確認。命名の手がかりが薄いため予備P3) |
| 73 | https://www.haseko-hln.com/form/ | 長谷工ライブネット | 除外 | フォームなし (HTTP 200だが静的formは `mt-search.cgi` 宛物件検索のみ) |
| 74 | https://www.cigr.co.jp/forms/cigr/ir/contact/ | コスモスイニシア/IR | 有望 P1 | 静的実フォーム (HTTP 200。`action=/forms/cigr/ir/contact/confirm/`、input 16。`user_name_sei/mei`・カナ対・email確認・`address_zip`・`address_municipality`・`address_lotnumber`・`tel`。分割住所型で多様性◎) |
| 75 | https://www.cigr.co.jp/irinfo/contact/ | コスモスイニシア/IR案内 | 除外 | フォームなし (HTTP 200だが静的formなし。実フォームはNo.74に分離) |
| 76 | https://www.cigr.co.jp/contact/ | コスモスイニシア(推測) | 除外 | 到達不能 (HTTP 403 Forbidden・bot遮断) |
| 77 | https://es-con.co.jp/contact | エスコン | 有望 P3 | 静的実フォーム (HTTP 200。mw-wp-form、input 10。`mail-name`・フリガナ `mail-name-pronoun`・mail確認。頁titleが「エス・コンサルタント」で対象社との同一性に疑義があるため予備P3・取込時要確認) |
| 78 | https://www.es-con.co.jp/contact/ | エスコン(www別名) | 除外 | 除外 (HTTP 200だがNo.77と同一内容。重複のため除外) |
| 79 | https://www.hoosiers.co.jp/contact/ | フージャースHD | 除外 | 到達不能 (HTTP 403 Forbidden・bot遮断) |
| 80 | https://www.hoosiers.co.jp/inquiry/ | フージャースHD(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 81 | https://www.duo-hills.jp/contact/ | フージャース/デュオヒルズ(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 82 | https://www.meiwaestate.com/contact/ | 明和地所(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。bot遮断またはドメイン異常の可能性) |
| 83 | https://www.clio-mansion.jp/contact/ | 明和地所/クリオ(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 84 | https://www.fjnext.com/contact/ | FJネクスト(推測) | 除外 | 到達不能 (curl timeout・code=28。bot遮断または応答なし) |
| 85 | https://www.fjnext.com/inquiry/ | FJネクスト(推測) | 除外 | 到達不能 (同上・code=28) |
| 86 | https://www.nisshin-group.co.jp/contact/ | 日神G(推測) | 除外 | 到達不能 (HTTP 200だが本文613バイトの空頁。formなし。URL推測の失敗) |
| 87 | https://www.palestage.jp/contact/ | 日神/パレステージ(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 88 | https://goldcrest.svy.ooo/ng/answers/inquiry_mansion/ | ゴールドクレスト/分譲検討 | 除外 | JS描画のみ (HTTP 200だが静的formなし・input 1のみ。svy.oooはJS描画フォームとみられる) |
| 89 | https://goldcrest.svy.ooo/ng/answers/inquiry_ir/ | ゴールドクレスト/IR | 除外 | JS描画のみ (同上。静的formなし) |
| 90 | https://www.goldcrest.co.jp/reserve/kvt/ | ゴールドクレスト/来場予約(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 91 | https://www.goldcrest.co.jp/formmail_survey02/contact.html | ゴールドクレスト/旧formmail(推測) | 除外 | 到達不能 (HTTP 404。旧formmailは廃止とみられる) |
| 92 | https://www.wadakohsan.co.jp/inquiry/ | 和田興産/ワコーレ | 有望 P1 | 静的実フォーム (mw-wp-form。input 16。`your-name`・`your-hurigana`・`your-post-code`・`your-address`・`your-tel`・email確認・`your-company`。命名素直で多様性◎) |
| 93 | https://www.wadakohsan.co.jp/contact.html | 和田興産(別名) | 除外 | フォームなし (HTTP 200だが `wadakohsan.info` へ転送され静的formなし) |
| 94 | https://www.wadakohsan.co.jp/investors/information/enq | 和田興産/株主アンケート | 除外 | フォームなし (HTTP 200だが静的formは `google.com/cse` 検索主体。株主アンケートで住所欄なしのため対象外) |
| 95 | https://www.hankyu-hanshin.co.jp/contact/ | 阪急阪神HD | 除外 | フォームなし (HTTP 200「お問い合わせ」だが静的formなし。グループ各社へのリンク集) |
| 96 | https://www.hanshin.co.jp/inquiry/ | 阪神電気鉄道 | 除外 | JS描画のみ (HTTP 200だが静的form 2件は乗換/運賃検索、3件目は `action=""` のJS送信。問合せ実体はJSとみられる) |
| 97 | https://www.hhp.co.jp/inquiry/site/index/ | 阪急阪神不動産 | 有望 P1 | 静的実フォーム (HTTP 200。`action=/inquiry/Site`、input 19。`data[Question][name1/2]`・`kana1/2`・`zip1/2`・`add2-4`・tel 3分割・mail確認・`privacy`。CakePHP系の素直な分割構成で多様性◎) |
| 98 | https://www.geo.gr.jp/contact/ | 阪急阪神/ジオ(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。geo.gr.jp自体がcurl不通) |
| 99 | https://www.kintetsu-re.co.jp/contact/ | 近鉄不動産 | 除外 | 到達不能 (HTTP 503「緊急メンテナンスのお知らせ」。調査時点では到達不能) |
| 100 | https://www.kintetsu-laurel.jp/contact/ | 近鉄/ローレル(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 101 | https://www.kintetsu-re.co.jp/inquiry/ | 近鉄不動産(推測) | 除外 | 到達不能 (HTTP 503メンテナンス中。No.99と同一内容) |
| 102 | https://www.jrwd.co.jp/contact/ | JR西日本不動産開発(推測) | 除外 | 到達不能 (HTTP 404 NotFound頁。URL推測の失敗) |
| 103 | https://www.jgran.jp/contact/ | JR西日本G/ジェイグラン(推測) | 除外 | 到達不能 (HTTP 404。ブランドサイトに該当pathなし) |
| 104 | https://www.odakyu-fudosan.co.jp/inquiry/ | 小田急不動産 | 除外 | フォームなし (HTTP 200だが静的formはサイト内検索のみ。問合せ実体は `ambassador-cloud.biz`=No.105へ分離) |
| 105 | https://odakyu-fudosan.ambassador-cloud.biz/contact | 小田急不動産/アンバサダー | 除外 | JS描画のみ (HTTP 200だが本文3805バイト・formなし。ambassador-cloudはJS描画とみられる) |
| 106 | https://www.leafia.jp/contact/ | 小田急/リーフィア(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 107 | https://form.keihan-kiss.co.jp/contact/opinion/ | 京阪電鉄不動産/ご意見 | 除外 | JS描画のみ (HTTP 200だがtitle空・formなし。入力欄はJS生成とみられる) |
| 108 | https://www.keihan-kiss.co.jp/contact/ | 京阪電鉄不動産(推測) | 除外 | 到達不能 (HTTP 403 Forbidden・bot遮断) |
| 109 | https://www.nnr.co.jp/contact/ | 西日本鉄道(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 110 | https://www.nnr-mansion.jp/contact/ | 西鉄/サンリヤン(推測) | 除外 | 到達不能 (DNS解決失敗・curl code=6。ドメイン推測の失敗) |
| 111 | https://www.nskre.co.jp/contact/ | 日鉄興和不動産(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 112 | https://www.livio.jp/contact/ | 日鉄興和/リビオ(推測) | 除外 | 到達不能 (HTTP 404頁。静的formは検索のみ) |
| 113 | https://www.nttud.co.jp/contact/nttud_inquiry/ | NTT都市開発/総合問合せ | 有望 P1 | 静的実フォーム (HTTP 200。`action=/mt/mt-contactform.cgi`、input 16。`form_name`・`form_name_kana`・`form_company`・`form_division`・`form_tel`・`form_mail`。命名素直で多様性◎) |
| 114 | https://www.nttud.co.jp/contact/site_inquiry/ | NTT都市開発/用地問合せ | 有望 P2 | 静的実フォーム (HTTP 200。No.113と同系・用地宛。同機構2件目のためP2) |
| 115 | https://www.nttud.co.jp/business/residential/inquiry/index.html | NTT都市開発/住宅問合せ | 有望 P2 | 静的実フォーム (HTTP 200。No.113と同系・住宅宛。同機構3件目のためP2) |
| 116 | https://www.kanden-rd.co.jp/contact/ | 関電不動産開発 | 除外 | フォームなし (HTTP 200「お問い合わせ」だが本文4428バイト・formなし。シエリア等へのリンク集とみられる) |
| 117 | https://www.cielia.com/contact/ | 関電/シエリア(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 118 | https://www.ipd.co.jp/contact/ | 伊藤忠都市開発(推測転送) | 有望 P2 | 静的実フォーム (HTTP 200→`www.ji-red.co.jp/contact/` に転送。「JR東日本伊藤忠不動産開発」。`name`・`ruby`・`address01-03`・`tel`・`fax`・`email`・`inquiry_title`。転送先法人が対象とずれる疑義のためP2・取込時要確認) |
| 119 | https://www.crevia.jp/contact/ | 伊藤忠/クレヴィア(推測) | 除外 | 到達不能 (curl timeout・code=28。bot遮断または応答なし) |
| 120 | https://www.daiwahouse.co.jp/toiawase/ | 大和ハウス工業 | 除外 | 到達不能 (HTTP 403 Access Denied・bot遮断) |
| 121 | https://www.daiwahouse.co.jp/mansion/contact/ | 大和ハウス/プレミスト(推測) | 除外 | 到達不能 (HTTP 403 Access Denied・bot遮断) |
| 122 | https://www.daiwahouse.co.jp/kodate/request/ | 大和ハウス/戸建(推測) | 除外 | 到達不能 (HTTP 403 Access Denied・bot遮断) |
| 123 | https://www.sekisuihouse.co.jp/cgi-bin/request/catalog.cgi | 積水ハウス/カタログ請求 | 有望 P1 | 静的実フォーム (HTTP 200。input 90・select 8。`address2`・`planned_zip1/2`・`birthday`・`company1/2`・`employeename`・`office`・希望条件群。最大規模で多様性◎) |
| 124 | https://www.sekisuihouse.co.jp/cgi-bin/inquiry/form.cgi | 積水ハウス/総合問合せ | 有望 P1 | 静的実フォーム (HTTP 200。input 46。`zip1/2`・`addr2`・tel 3分割・`birth-year`・`shop`・`privacy`。命名素直で多様性◎) |
| 125 | https://www.sekisuihouse.co.jp/mail/form.html | 積水ハウス/メール問合せ | 有望 P1 | 静的実フォーム (mpmail。input 24。`name-kanji1/2`・`name-kana1/2`・`zip1/2`・tel 3分割・`mailaddress`・`inq-subject`。素直な分割構成で多様性◎) |
| 126 | https://www.asahi-kasei.co.jp/atlas/contact/ | 旭化成/アトラス(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |
| 127 | https://www.asahi-kasei.co.jp/j-koho/contact.html | 旭化成/広報(推測) | 除外 | 到達不能 (HTTP 404。URL推測の失敗) |

## 集計

- 試行総数: 127件 (No.1-127。要求100件以上を満たす)
- 有望: 50件 (P1 21件・P2 23件・P3 6件)
  - P1 (21): No.19, 20, 21, 24, 29, 30, 31, 36, 43, 47, 55, 63, 65, 71, 74, 92, 97, 113, 123, 124, 125
  - P2 (23): No.6, 8, 15, 22, 25, 26, 28, 32, 33, 34, 44, 45, 46, 48, 50, 59, 61, 64, 69, 70, 114, 115, 118
  - P3 (6): No.16, 17, 18, 40, 72, 77 (予備)
- 除外: 77件 (到達不能 43・フォームなし 23・JS描画のみ 7・ログイン必須 3・重複 1)
- 既存分 (`tests/target-url.md` 81行) および R4-1 の183件との重複: なし (全127件をURL完全一致で照合。同一ドメインでもpath・クエリが異なるURLのみ採用。R4-1と同機構のSMP/Pardot/東急formもSMPFORM・form pathが異なる別URL)
- 有望の多様性: 戸建・マンション資料請求/来場予約 (積水・ブリリア・ラトゥール) / 賃貸仲介・オフィス (住友) / 再生・土地活用・建替え・CRE (野村・長谷工・東急) / 通報・IR・株主 (森ビル・ヒューリック・コスモス) / 地方有力 (穴吹・和田興産・阪急阪神不動産・NTT都市開発)。学校系ゼロで既存corpusと重複しない
- デベロッパー特有の機構メモ: 物件エントリー・来場予約はブランドサイト側がJS描画 (proud・lions・geo・svy・ambassador) で静的formを持たないことが多く、コーポレート側の静的問合せ (cgi・SMP・Pardot・webcas・SPIRAL・krs.bz・e-state・Struts・mpmail・mt-contactform) が取込の主戦場。取込時はブランド物件頁ではなく本ログの静的URLを `make addurl` すること
