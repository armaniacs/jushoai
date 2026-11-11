# Task R4-2a 試行ログ — PBI-208 Round4 P1 12件の取込結果

- 対象: R4-1 report の P1 12件 (brief 列挙の URL を verbatim で使用)。
- 手順: `make addurl URL=<url>` で1件ずつ取込 → 最小再現まで削る → LEDGER 期待値を honest pin で埋める → vitest 緑 → 1 fixture ごとに commit。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし。samples.test.ts は tooling 配線のみ (直編集なし)。

## 取込結果

| # | URL | 結果 | fixture名 or 失敗理由 |
|---|-----|------|------------------------|
| 1 | https://www.fujifilm.com/jp/ja/form/FF-CSR | 成功 | ff-csr.html (15 controls。氏名・カナ分割、email確認2欄、郵便・都道府県・TEL/FAX。honest pin: 姓/名とも fullName、FAX に tel 値、勤務先・学校名→school、部署名は未分類) |
| 2 | https://www.otsuka.co.jp/contacts/opinion/form | 成功 | otsuka-opinion-form.html (8 controls + sex radio復元。honest pin: placeholder由来で氏名・カナ・tel3分割・sex→'2'; company・mail・age は未分類。wired名 form.html を取込直後に FIXTURE 指定で付け替え) |
| 3 | https://www.mitsuihome.co.jp/support/sonota/form.php | 成功 | mitsuihome-sonota-form.html (24 controls。honest pin: 氏名・カナは _1/_2 分割、address3 は address1 と同値、tel・mail 解決; kw・所属4欄・post1/2・koukoku系・pref は未分類/warn) |
| 4 | https://www.mitsui-reform.com/ssl/catalog/select.html | 成功 | mitsui-reform-catalog-form.html (29 controls。実ページの dl/dt/dd 構造を復元して nearby を再現。honest pin: tel/tel2 とも undashed 全値、現住所・計画地の二重住所、post・LOOP番号・購入希望系は未分類) |
| 5 | https://www.tokyu-land.co.jp/form/contact/ | 成功 | tokyu-land-contact-form.html (10 controls。1行1dl構造を復元。honest pin: 市区町村は都道府県付き連結値、番地・建物名→building、zip・email確認2欄解決; q・pref は未分類/warn) |
| 6 | https://contact.city.kobe.lg.jp/webapp/form/26436_ucnb_1/index.do | 成功 | kobe-city-contact-form.html (9 controls + 居住区select実選択肢復元。honest pin: フリガナのみ解決、他は未分類。最も thin な1欄fixture) |
| 7 | https://cform.epson.jp/form5/pub/e040/1009009009015109731 | 成功 | epson-csr-form.html (20 controls + 都道府県select実選択肢復元。honest pin: citycode 2欄のみ解決、他はコード化名で未分類) |
| 8 | https://webform.ricoh.com/form/pub/e00103/risb | 成功 | ricoh-risb-form.html (7 controls。epson と同 cform 系。honest pin: citycode 1欄のみ解決、他は未分類) |
| 9 | https://form.kikkoman.co.jp/m/website | 成功 | kikkoman-website-form.html (12 controls + 性別select実選択肢復元。honest pin: 姓/名・せい/めい・tel3分割が解決; タイトル・URL・性別・email確認2欄は未分類) |
| 10 | https://area31.smp.ne.jp/area/is?SMPFORM=qcrc-mcldsd-95bb156300186458a5d681e60ccadfa&type=ac | 失敗 | 404 (SMPFORM トークン失効。R4-1時は HTTP 200。target-url.md の行は revert 済み。無理せず次へ) |
| 11 | https://reg31.smp.ne.jp/regist/is?SMPFORM=qili-mbohmg-16d3b32725ef963f616238bd9d403ec2 | 成功 | smp-regist-inquiry-form.html (13 controls + 都道府県select実選択肢復元。Shift_JIS文字化けplaceholderを復元、dl/dt/dd構造を復元。honest pin: 氏名・zip分割・住所・tel/fax・email確認2欄が解決; ふりがな・都道府県selectは未分類) |
| 12 | https://go6.global.toshiba/GX/contactform | 成功 | toshiba-gx-contact-form.html (16 controls + 4 select実選択肢復元。dl/dt/dd構造を復元。honest pin: 姓/名・zip・州/市/番地・tel・email確認2欄が解決、部署名→普通科(誤分類pin)、company・業種系select・件名は未分類) |
