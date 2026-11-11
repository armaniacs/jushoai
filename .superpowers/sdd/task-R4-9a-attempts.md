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
