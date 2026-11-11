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
