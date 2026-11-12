# Task R4-11b フルレポート — JSIC区分の有望5件の取り込み

- ブランチ: work/pbi-208-round4
- 前提: R4-11a (候補200件・有望5件) の後続。有望5件を corpus に取り込む。
- 結果: 成功5件・失敗0件。samples.test.ts 138 passed、addurl-check ゼロ。
- pin 更新なし (後の集約タスクで行う)。make eval RED は想定内。

## 成功分の fixture (5)

| # | fixture | URL | in-scope | 解決 | commit (full SHA) |
|---|---------|-----|----------|------|-------------------|
| 1 | fujita-contact.html | https://www.fujita.co.jp/contact/ | 11 | 7 | 00d7ef55cdd9f202336175307fcd0dedbc6d4a4f |
| 2 | yamada-holdings-contact.html | https://www.yamada-holdings.jp/contact/ | 6 | 4 | d6e6c9f7bf5c7c7e4dcc13fa20d3361f8b290980 |
| 3 | apaman-contact.html | https://www.apaman.co.jp/contact/ | 9 | 9 | ce72c1516ee4247f7e91bf2a7e1900ed4cfbc19f |
| 4 | jpaa-contact.html | https://www.jpaa.or.jp/contact/ | 11 | 9 | 6c66184365173530247665417604f08971b56812 |
| 5 | nkanzai-contact.html | https://www.nkanzai.co.jp/contact/ | 4 | 3 | 8337bca03773d68dd36bbc725dddbd25c5c3e041 |

各 commit は `samples/<fixture>.html` + `tests/corpus.ts` + 
`tests/integration/samples.test.ts` + `tests/target-url.md` の4ファイルのみ
(path 限定 add)。1 fixture ごとに commit。push なし。

## やり方の要点 (再現性のため)

- 5件とも既定の fixture 名は contact.html になる (path 末尾が /contact/)。
  既存の九工大 fixture (samples/contact.html) と衝突するため、全件
  `FIXTURE=<固有名>-contact.html` を明示した。
- 1件目 (フジタ) で既定名のまま取り込んで九工大 fixture を worktree 上で
  上書きした。即座に git checkout で復旧し、registry 行を張り直した。
  最終 diff に九工大への影響はない。
- 日本管財は make addurl の fetch が 403 (WAF が default fetch UA を遮断)。
  curl (browser UA) で HTTP 200 取得し、共有 tooling 関数
  (buildWiring/applyWiring) で配線した。registry 行は make addurl のもの。
- 期待値はすべて現行ルールの正直な出力で pin (honest pin)。分類のずれは
  直していない。src/ 変更なし。samples.test.ts への変更は tooling 配線の
  ケース追加のみ。

## Concerns (将来PBI候補。いずれも honest pin のまま残した分類ずれ)

1. 姓/名・セイ/メイ label が各々フルネーム読みになる (フジタ。
   ff-csr の name[first]/name[last] と同形)。first/last-label 分割の語彙候補。
2. tel01/02/03 の3分割が未分類 (フジタ。ラベルは tel01 のみ)。
   kobe-city ANSWER6-1/2/3 と同形。tel-split-by-name 候補。
3. お問い合わせ分類 select が未分類 (フジタ contact_type・ヤマダHD TITLE。
   実選択肢復元済)。inquiry-kind select 候補。
4. フリガナが th-nearby + placeholder のみ (項目名コード化) で未分類
   (ヤマダHD f02)。kana-via-nearby 候補。
5. かな欄がひらがな placeholder をそのまま保持 (アパマン kana=やまだ たろう。
   kobe-city ANSWER2 のカタカナ pin と対称)。かな正規化候補。
6. 携帯/固定の2欄とも tel 値で fill (アパマン tel_mobile/tel_home。
   mitsui-reform の tel/tel2 と同形)。意図どおりだが重複 fill の扱いは要検討。
7. FAX に tel 値が入る (アパマン fax。ff-csr と同形)。fax-vocabulary 候補。
8. 職種/業種 select が未分類 (弁理士会。実選択肢復元済)。LLM fallback。
9. 件名 (contact_subject) は profile 値なしのため正しく未充填 (日本管財。
   ff-csr inquiry_title と同形)。仕様どおり。

## 検証結果

- npx vitest run tests/integration/samples.test.ts: 138 passed (既存133 + 新規5)
- make addurl-check: no '<expected>' remnants
- tsc --noEmit: clean (弁理士会の ledger 編集後に確認)
- tests/target-url.md: 成功5行のみ追加 (失敗分の記載なし)
