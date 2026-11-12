# Task R4-7b 試行ログ — 大学ランキング上位校の有望8件の取込結果

- 対象: brief 列挙の8件 (brief の URL を verbatim で使用)。
- 手順: `make addurl URL=<url>` で1件ずつ取込 → 最小再現まで削る (実ページ取得で見出し・選択肢を照合) → LEDGER 期待値を honest pin で埋める → vitest 緑 → 1 fixture ごとに commit。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし。samples.test.ts は tooling 配線 + 既存構文破損の1行修復のみ (下記10)。
- 取得失敗 0件。8件すべて取込成功。

## 取込結果

| # | URL | 結果 | fixture名 or 失敗理由 |
|---|-----|------|------------------------|
| 1 | https://www.kyutech.ac.jp/contact/ | 成功 | contact.html (11 controls。表th見出しを復元、pref_code実47選択肢、ヘッダ言語切替はtrim。honest pin: 姓/名・カナともfullName結合、zipはundashed全値の重複、address1は都道府県付き連結) |
| 2 | https://www.uoeh-u.ac.jp/Exam/inquiry.html | 成功 | inquiry-html.html (12 controls。志望学科・都道府県select実選択肢復元、学年・申込者区分radioはbundle skipのまま。honest pin: ふりがな後半が漢字名で解決、志望学科は未分類) |
| 3 | https://www.postin-svr.com/entry/showa-u/index.asp | 成功 | index-asp.html (18 controls + 性別radio。実ページShift_JIS・td見出しのためbareが等価。state・school_1・school_2・grade実選択肢復元、koukouは実ページどおり空、seibetsu1は実形復元。honest pin: 姓名・カナ分割の4欄のみ解決) |
| 4 | https://request.admission-logi.jp/form/doc/9015/1/6932/ | 成功 | 6932.html (16 controls + sex。school_ken/pref実48選択肢(+10 scheme)、生年月日実レンジ、schoolは単一選択肢、幽霊freetextはtrim、sexは実形復元。honest pin: 11欄解決、school_kenはschool語彙に吸われ未分類) |
| 5 | https://www.kit.ac.jp/contact | 成功 | kit-contact-form.html (9 controls。行見出しtd/spanのためbareが等価、ヘッダ検索sは別formのためtrim、問合せ種別radioはbundle skip。honest pin: 7欄解決、組織名・部署名は未分類) |
| 6 | https://www.shimane-u.ac.jp/inquiry/1/ | 成功 | shimane-inquiry-form.html (5 controls。tooling名1.htmlを改名。ヘッダ検索formをtrim、区分select実19選択肢復元。honest pin: 3欄解決、区分・captchaは未分類) |
| 7 | https://business.form-mailer.jp/fms/25b2d0e0137776 | 成功 | aoyama-campus-inquiry.html (8 controls。toolingのハッシュ名を改名。奨学金系radioはbundle skip。honest pin: 7欄解決、学生番号のみ未注入) |
| 8 | https://ssl.form-mailer.jp/fms/08ff74b0839409 | 成功 | aoyama-sagamihara-career.html (6 controls。toolingのハッシュ名を改名。所属キャンパス・学年radioはbundle skip。honest pin: 5欄解決、学生番号のみ未注入、学部・学科→school) |

## 取込時の修正 (tooling 出力に対する人手の最小修正)

1. tr/th 行構造の復元: kyutech (実ページが table+th。scanner が tr>th を nearby として読むため)。
2. bare の等価性の確認: showa (Shift_JIS デコード確認。td 見出しのため bare が等価。N7)・kit (行見出し td/span のため bare が等価)。
3. select 実選択肢の復元: kyutech pref_code (実47)・uoeh 2種 (志望学科4・都道府県47)・showa state/school_1/school_2/grade (数値00-48・名称49・かな44・学年8)・6932 school_ken/pref (数値11-57 の +10 scheme)・生年月日 (2014-1964/1-12/1-31)・shimane 区分 (実19)・kit は select なし。
4. 空 select の保持: 6932 school (実ページどおり単一 高校選択)・showa koukou (実ページどおり空。JS で populate)。
5. 性別 radio の実形復元: showa seibetsu1 (wrapping label、未解決のまま honest pin)・6932 sex (name 駆動で解決)。
6. 幽霊欄の trim: kyutech js_language (ヘッダ言語切替、form 外)・6932 の2件目 freetext (コメント化 JS 行由来)・kit s (別 form のヘッダ検索)・shimane ヘッダ検索 form 一式 (q・sitesearch・language・付随 hidden)。
7. fixture 改名 (tooling 名が汎用/不透明のため。配線3箇所=registry・LEDGER key・test case 名を同名置換): kit No.5 は FIXTURE=kit-contact-form.html で再取込 (kyutech の contact.html 衝突を回避)・No.6 1.html→shimane-inquiry-form.html・No.7→aoyama-campus-inquiry.html・No.8→aoyama-sagamihara-career.html。
8. 区分・所属等の未分類 select の除外理由を LEDGER excluded に記録 (benesse Q1 前例)。
9. fixture header コメントの付与: 全8件 (実ページとの対応・復元内容・trim 理由を記録。R4-2a/2b 流儀)。
10. samples.test.ts の既存構文破損の修復: mailform 直後の余分な `});` 1行を削除 (HEAD から存在し全 suite が parse 失敗していた。tooling 配線の期待値・ケース内容には不干渉。構文修復のみ)。

## tooling の挙動メモ (将来の取込向け)

- tests/target-url.md 末尾に改行がない状態で `make addurl` すると、追記行が最終行に結合され registry parse から漏れて何も取込まれない (No.1 で発生。Edit で改行修復後に再実行で解決)。
- 同一 path の URL (No.1 /contact/ と No.5 /contact) は同一 fixture 名に衝突する。No.5 は FIXTURE= で回避した (kyutech 分は不変)。
- 取得自体は全8件 curl で HTTP 200 (遮断なし)。

(End of file)
