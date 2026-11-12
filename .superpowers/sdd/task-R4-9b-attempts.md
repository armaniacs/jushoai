# Task R4-9b 試行ログ — 大手デベロッパー P1 21件の取込結果

- 目的: PBI-208 Round4 の一環として R4-9a 有望 P1 21件を `make addurl URL=<url>` で1件ずつ取り込み、最小再現まで削り、honest pin で samples.test.ts を緑にする。
- 制約: P2・P3 には手を出さない。src/ 変更禁止。samples.test.ts への regex 直編集禁止 (tooling 配線 + ケース名の改名置換のみ)。分類ずれは直さず honest pin + Concerns 記録。pin 更新なし。1 fixture ごとに commit。push なし。commit は自分の成果物のみ (path限定add)。
- 命名: tooling の汎用名 (is.html 等) は意味ある名前に改名 (配線3箇所も同名置換。R4-7b precedent)。

## 取込結果

| No | URL | fixture | 結果 | 解決欄数 / 備考 |
|----|-----|---------|------|-----------------|
| 1 | https://reg18.smp.ne.jp/regist/is?SMPFORM=ocnd-ldlirf-9c66cded2761f122279b692570e8a021 | smp-openhouse-inquiry.html (tooling 名 is.html から改名) | 成功 | 9欄。label なし・name 語彙のみ。department→学科 (普通科) honest pin。mail 2欄・company 未分類。contact・todofuken は `--` のみ。 |
| 2 | https://residence.sumitomo-latour.jp/inquiry/ | sumitomo-latour-inquiry.html (tooling 名 inquiry.html から改名) | 成功 | 8欄。label あり。住所2欄は refine 分割 (extended_address→addressNoPref・address2→building)。keyword 検索 box 未分類。予算・面積・時期・生年月日 select 群は `--` のみ。 |
| 3 | https://sumifu-step-form.spiral-site.com/otoiawase | sumifu-step-otoiawase.html (tooling 名 otoiawase.html から改名) | 成功 | 8欄。placeholder の例）が信号。name/name_kana 対は姓/名分割 (name_kana→太郎 honest pin)。name なし・id のみ zipCode も解決。company・position 未分類。 |
| 4 | https://www.proud-web.jp/module/inquiry/procedureForm.xphp | proud-procedure-form.html (tooling 名 procedureform-xphp.html から改名) | 成功 | 16欄。旧・新の対照型のまま残す。郵便2欄は 3+4 分割対 (zip_code→100・zip_code_new→0001 honest pin)。address1→海外住所値 (honest pin)。email は placeholder の例で解決。company・tel 2欄未分類。 |
| 5 | https://www.tokyu-land.co.jp/form/branz_owner/ | tokyu-branz-owner-form.html (tooling 名 branz-owner.html から改名) | 成功 | 7欄。label なし。mansion_name/name 対は姓/名分割 (mansion_name→山田 honest pin)。room_no は値なし。mail 2欄未分類。pref は `--` のみ。 |
| 6 | https://www.tokyu-land.co.jp/form/commercial/ | tokyu-commercial-form.html (tooling 名 commercial.html から改名) | 成功 | 9欄。自宅 house 系+条件+連絡先の複合。郵便2欄は 3+4 分割対 (zip_house→100・zip→0001 honest pin)。land/bill・company/team/job・mail 2欄未分類。 |
| 7 | https://www.tokyu-land.co.jp/form/cre/ | tokyu-cre-form.html (tooling 名 cre.html から改名) | 成功 | 9欄。No.6 と同系・同形 (郵便分割対・住所同値)。land/bill・company/team/job・mail 2欄未分類。 |
| 8 | https://fmt.e-state.ne.jp/brillia-support/contact/ | brillia-support-contact.html (tooling 名 contact.html は九工大 fixture と衝突→復元し改名) | 成功 | 6欄。placeholder が信号。姓名・カナ対 (かな値はひらがな)。email・tel は placeholder の例で解決。希望日・条件欄は値なし、5 select は `--` のみ。 |
| 9 | https://www.hulic.co.jp/business/inquiry/entry?subject=developPlan | hulic-develop-plan.html (FIXTURE 指定。既定名 entry.html は汎用のため回避) | 成功 | 9欄。placeholder が信号。name1/2・kana1/2 は _1/_2 分割。mail は未分類のまま mail_conf のみ解決 (honest pin)。company_name・fax・query 2欄未分類。 |
| 10 | https://mori.webcas.net/form/pub/f008/contact | mori-webcas-contact.html (FIXTURE 指定。既定名 contact.html は衝突のため回避) | 成功 | 4欄。コード化 c_q*・placeholder のみ信号。かな対・会社/学校→学校値・citycode→市区値 (honest pin)。漢字名・メール確認・電話3分割・住所は未分類。 |
| 11 | https://openhouse-group.co.jp/support/contact.html | openhouse-customer-contact.html (FIXTURE 指定) | 成功 | 10欄。英語式の素直な命名。sales_name 担当者欄は fullName に載り氏名 (honest pin)。area 未分類、prefecture は `--` のみ。 |
| 12 | https://www.anabuki.ne.jp/contact/form.php?contact_type=1 | anabuki-general-contact.html (FIXTURE 指定) | 成功 | 3欄。メール欄は type=mail のため走査対象外。company・kana・tel/fax は未分類。contact_type は `--` のみ。 |
| 13 | https://www.anabuki.ne.jp/contact/landuse/?contact_type=7 | anabuki-landuse-contact.html (FIXTURE 指定) | 成功 | 8欄。No.12 同系+土地条件。郵便2欄は 3+4 分割対、住所2欄同値、building_ 接頭3欄は建物名 (honest pin)。company・kana・tel/fax 未分類、site_area は値なし。 |
| 14 | https://www.haseko.co.jp/hc/contact/input | haseko-contact-input.html (FIXTURE 指定) | 成功 | 3欄。label・placeholder なし・name 語彙のみ。name01/02 分割・電話。company・post・mail 2欄未分類。 |
| 15 | https://www.cigr.co.jp/forms/cigr/ir/contact/ | cigr-ir-contact.html (FIXTURE 指定。既定名 contact.html は衝突のため回避) | 成功 | 10欄。label 結合あり。姓名・カナ対は _sei/_mei 分割。漢字名2欄は未分類、prefecture は `--` のみ。 |
| 16 | https://www.wadakohsan.co.jp/inquiry/ | wadakohsan-inquiry.html (FIXTURE 指定) | 成功 | 8欄。your- 接頭 + 例) placeholder。your-department→学科 (honest pin)。your-company・検索 q 未分類。 |
| 17 | https://www.hhp.co.jp/inquiry/site/index/ | hhp-site-inquiry.html (FIXTURE 指定。既定名 index.html は汎用のため回避) | 成功 | 9欄。CakePHP data[Question]。番号分割は素直に解決。住所 add2-4・メール2欄は bare 名で未分類、add1 は `--` のみ。 |
| 18 | https://www.nttud.co.jp/contact/nttud_inquiry/ | nttud-inquiry.html (FIXTURE 指定) | 成功 | 5欄。form_ 接頭 + 和文 label。form_division は部署名 label でも未分類 (honest pin)。 |
| 19 | https://www.sekisuihouse.co.jp/cgi-bin/request/catalog.cgi | sekisui-catalog-request.html (FIXTURE 指定) | 成功 | 11欄。2系統+会員登録の複合 (最大規模)。性別 radio は実ページ選択肢を最小形で復元→女性 (honest pin)。郵便・会社・希望条件等は未分類、7 select は `--` のみ。 |
| 20 | https://www.sekisuihouse.co.jp/cgi-bin/inquiry/form.cgi | sekisui-inquiry-form.html (FIXTURE 指定) | 成功 | 13欄。メール欄は名前/ドメイン4分割 (各々 full email。honest pin)。氏名・カナ4欄は文字化け placeholder のみで未分類。性別 radio 復元→女性。 |
| 21 | https://www.sekisuihouse.co.jp/mail/form.html | sekisui-mail-form.html (FIXTURE 指定) | 成功 | 12欄。-kanji/-kana 接尾分割。mailaddress (type=text) は住所に載り住所値 (honest pin)。prefs は `--` のみ、件名は値なし。 |

## 中間集計 (No.1-7)

- 成功 7/7、失敗 0。commits 7件 (3068d71, 5d2b1ec, 3b532ee, 2c81629, 3884646, 90d4388, 4dc1457 — 短縮形。フルSHAはレポート参照)。
- `npx vitest run tests/integration/samples.test.ts` は各時点の新規ケースが緑 (全体緑は最終検証で確認)。
- Concerns 候補 (将来PBI向け。分類は直さず): department→学科 (No.1,3。部署語彙)、type=text の mail 未分類 (No.1,5,6,7。email-via-name)、company-by-placeholder (No.3,4)、name_kana→漢字名 (No.3。placeholder 対分割)、旧新・自宅/連絡先の郵便2欄の 3+4 誤結合 (No.4,6,7。refine)、mansion_name→姓 (No.5)、tel-by-name/placeholder (No.4)、proud address1→海外住所値 (No.4)。

## 中間集計 (No.8-14)

- 成功 7/7、失敗 0。commits 7件 (bf56f0c, ba2ce9a, 503a04a, 513945f, 4dba443, 221a991, b3f0fbf — 短縮形。フルSHAはレポート参照)。
- No.8 で tooling 既定名 contact.html が九工大 fixture と衝突し既存ファイルを上書き → `git restore` で復元し別名配線。以降は FIXTURE= 指定で汎用名を回避 (No.9-14)。
- No.14 コミット (b3f0fbf) に R4-8a の作業中 hunk (toshin input.html 配線) が混入 → R4-8a 側が直後の 5df44c7 で toshin-shiryo-form.html に改名修復。HEAD の状態は正常 (各タスクの成果物が分離)。履歴改変はしない (子コミットがあるため)。遡及監査: No.1-13 のコミットは混入なし (各4ファイル・想定内行数)。
- 追加 Concerns 候補: mail/mail_conf 非対称 (No.9)、fax 未解決 (No.9。ff-csr では tel 値)、c_q10 漢字名・c_q27 メール・電話3分割・c_q29 住所の placeholder 未解決 (No.10。kobe-city precedent 群)、sales_name 担当者→氏名 (No.11)、kana/tel-by-name (No.12)、building_ 接頭→建物名 (No.13)、post/mail01/02 bare 名未分類 (No.14。mitsuihome post precedent)。
- 教訓: add/stage 前に `git diff` の追加 hunk が自分の fixture 名のみか確認する。共有3ファイル (corpus.ts/test/registry) は相手の未コミット差分の有無を確認してから add する。

## 最終集計 (No.1-21)

- 成功 21/21、失敗 0 (取得不可なし。全 URL が静的実フォームで取込可だった)。
- commits 21件 (フルSHAはレポート参照。短縮形: 3068d71, 5d2b1ec, 3b532ee, 2c81629, 3884646, 90d4388, 4dc1457, bf56f0c, ba2ce9a, 503a04a, 513945f, 4dba443, 221a991, b3f0fbf, c53a6a7, 2a70549, 7e14545, 9ef82e5, 0816d1a, 1e9b3f9, 0793f1b)。
- 検証: `npx vitest run tests/integration/samples.test.ts` 127 passed (全緑)。`make addurl-check` ゼロ (no '<expected>' remnants)。
- pin 更新なし。`make eval` 未実行 (集約タスクに委譲。RED想定内)。
- src/ 変更なし。samples.test.ts への regex 直編集なし (tooling 配線 + fixture 改名の同名置換のみ)。
- push なし。

## 事故記録 (共有ブランチ並行作業)

1. No.8 取込時、tooling 既定名 contact.html が九工大 fixture (samples/contact.html) と衝突し既存ファイルを上書き → `git restore` で復元し brillia-support-contact.html に改名。以降 No.9-21 は `FIXTURE=` 指定で意味ある名前に直接取込 (改名作業なし)。
2. No.14 コミット (b3f0fbf) に R4-8a の作業中 hunk (toshin input.html 配線) が whole-file add で混入 → R4-8b が 5df44c7 で toshin-shiryo-form.html に改名修復。HEAD 正常。履歴改変なし。
3. No.16 (2a70549)・No.17 (7e14545) コミットに R4-8a No.10 (jiritsu-red) の配線が混入 (whole-file add のため)。内容破壊なし (vitest 緑)。復旧不要と親判断。R4-8b 側で fixture HTML を 9dd07a6 で追加し完結。
4. No.19 stage 前に index 破損を検出 (tests/corpus.ts 4314行削除等が staged 状態。何者かの誤操作) → `git reset` (mixed) で index を HEAD に戻し worktree 保全。被害なし。
5. 以降の教訓として: stage 前に `git diff` の追加 hunk が自分の fixture 名のみか確認。相手の未コミット差分がある場合は hunk フィルタ (`git apply --cached` 用 patch 分離、/tmp/filter_one.awk) または待機。No.19-21 はフィルタで分離 stage し各4ファイルのみでコミット成功。
