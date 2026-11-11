# Task R4-3 フルレポート — PBI-208 Round4 pin更新と全体検証

- ブランチ: `work/pbi-208-round4`
- 対象: R4-2a (P1 11件) + R4-2b (P2 14件) で取り込んだ新規 25 fixture の
  `tests/eval/corpus.eval.ts` pin 更新と、`make eval` / `make check` の緑化。
- src/ 変更なし。語彙追加が必要な劣化は直さず Concerns に残した (brief どおり)。
- push なし (brief どおり)。

## 結果サマリ

- `make eval`: 緑 (3 tests passed)。内訳: pin 照合・privacy・no-network の3件。
- `make check`: exit 0 (下記「検証」参照)。
- 既存 32 fixture の pin ドリフト: なし (更新前の RED は 25 件の行欠落のみ。
  `pin=... 実測=...` の差分は 1 件も出なかった)。
- ステータス: DONE_WITH_CONCERNS (Concerns は全て将来PBI候補の語彙・判定整理。
  src 変更なしで緑化できる範囲はすべて緑)。

## 指標の変化 (旧 pin → 実測)

旧 pin は R4-2 以前の 32 fixture、新 pin は全 57 fixture。
fields の旧値は新集計から新25件分を差し引いた誘導値 (新旧の実測行より検算済み)。

| 指標 | 旧 pin (32 fixture) | 新25件分 | 新 pin (57 fixture) |
|------|---------------------|----------|---------------------|
| fixtures | 32 | 25 | 57 |
| fields | 350 | 341 | 691 |
| ruleHits | 259 (74.0%) | 189 (55.4%) | 448 (64.8%) |
| llmFallbacks | 94 | 153 | 247 |
| fillable | 162 (46.3%) | 121 (35.5%) | 283 (41.0%) |
| refineChanged | 39 | 44 | 83 |
| refineDropped | 0 | 4 | 4 |

- 新25件の rule-hit 率 (55.4%) は既存 (74.0%) より低い。
  主因はコード化名 (c_q / e_数字 / coded name) 系 fixture が多く、
  label・placeholder 信号なしでは rule が読めない欄が多いため。
  これは語彙不足による honest な未分類であり、分類パイプラインの劣化ではない
  (既存 32 件のドリフトなしが傍証)。
- refineDropped=4 は全て `mitsui-chintai-inquiry-form.html`
  (fields=5, ruleHits=1, dropped=4)。corpus 全体で drops を持つ唯一の fixture。

## 新25件の内訳 (実測 pin 行そのまま)

fields / ruleHits / llmFallbacks / fillable / refineChanged / refineDropped の順。
期待値の根拠は `tests/corpus.ts` の各 ledger エントリを参照。

| fixture | fields | ruleHits | llmFB | fillable | refineC/D | 一言 |
|---------|--------|----------|-------|----------|-----------|------|
| aeon-voice-form.html | 9 | 7 | 2 | 6 | 0/0 | Salesforce ミラー欄 (hidden_*) も honest fill (N1) |
| auhikari-callback-form.html | 14 | 14 | 0 | 8 | 9/0 | tr/th 信号で全欄解決。add6/add7 重複 fill (C8系・N5) |
| benesse-inquiry-form.html | 11 | 8 | 4 | 7 | 2/0 | placeholder 由来 email 解決。会員番号 3-split 未分類 (N6) |
| brother-inquiry-form.html | 16 | 4 | 12 | 3 | 0/0 | plain div 見出しは nearby 外。prefect 非JIS順 option 値で解決 (N3) |
| epson-csr-form.html | 20 | 2 | 18 | 0 | 0/0 | cform 系。citycode のみ解決。fillable 0 の thin (C9系) |
| epson-ir-form.html | 20 | 2 | 18 | 0 | 0/0 | epson-csr と同一指標 (同 cform 家族) |
| ff-compliance-hotline-form.html | 7 | 6 | 1 | 6 | 0/0 | Drupal 4件中最軽量。姓/名とも fullName (C1系) |
| ff-csr.html | 15 | 13 | 3 | 9 | 0/0 | 姓/名 fullName・FAX に tel 値 (C1・C2系) |
| ff-procurement-form.html | 15 | 13 | 3 | 9 | 0/0 | ff-csr と同一指標 |
| ff-webmaster-form.html | 15 | 13 | 3 | 9 | 0/0 | ff-csr と同一指標 |
| kikkoman-media-form.html | 9 | 3 | 6 | 3 | 3/0 | tel[1/2/3] のみ解決。貴社名・氏名 bare (C3系) |
| kikkoman-website-form.html | 12 | 7 | 5 | 7 | 3/0 | 姓/名・せい/めい placeholder 分割は解決 |
| kikkoman-works-form.html | 11 | 7 | 4 | 7 | 3/0 | website と同型。性別 select 未分類 (C7系) |
| kobe-city-contact-form.html | 9 | 1 | 8 | 1 | 0/0 | カタカナ placeholder のみ。thin (C6・C9系) |
| mitsui-chintai-inquiry-form.html | 5 | 1 | 0 | 1 | 0/4 | 唯一の refineDropped (4)。kobe 同型の Struts 栖 |
| mitsui-reform-catalog-form.html | 29 | 20 | 9 | 8 | 11/0 | 最大 fixture。tel/tel2 重複・address3/4 重複 (C8系) |
| mitsuihome-sonota-form.html | 24 | 10 | 14 | 6 | 6/0 | post1/post2 未分類 (C5)。address3 重複 (C8系) |
| otsuka-opinion-form.html | 9 | 6 | 3 | 5 | 3/0 | 例) placeholder 由来の氏名解決。company/mail 未分類 (C3・C4系) |
| ricoh-risb-form.html | 7 | 1 | 6 | 0 | 0/0 | cform 系。citycode のみ。thin (C9系) |
| ricoh-vulnerability-form.html | 10 | 0 | 10 | 0 | 0/0 | 全 corpus 最薄 (expected: {})。richell 前例形 |
| smp-regist-inquiry-form.html | 13 | 11 | 3 | 6 | 4/0 | dl/dt/dd 復元で解決。fax に tel 値 (C2系) |
| tokyu-land-contact-form.html | 10 | 8 | 2 | 4 | 0/0 | dl/dt nearby 形。市区町纻は県付き連結 (honest) |
| tokyu-land-kojin-form.html | 18 | 12 | 6 | 5 | 0/0 | 2住所ブロック重複 fill (C8系)。tel undashed (N4系) |
| tokyu-land-tenant-form.html | 17 | 9 | 8 | 5 | 0/0 | company/team/job 未分類 (C3系) |
| toshiba-gx-contact-form.html | 16 | 11 | 5 | 6 | 0/0 | 部署名→普通科 (honest。C3系)。company 未分類 |

## 検証

- `make eval`: 3 passed (pin 照合 57 行・privacy・no-network)。
- privacy: `keeps page content out of every report line` 緑。
  報告行にページ文字列 (山田/太郎/千代田/formAttendee/field_46) を含まず、
  全行 200byte 以内。`never reaches the network` 緑。
- `make check`: exit 0 (typecheck + test + 両ブラウザ build + manifest 検査 +
  web-ext lint)。詳細は下記ログ参照。

## 語彙の伸びしろ (将来PBI候補。src 変更なしのため本タスクでは未着手)

R4-2a の C1–C10、R4-2b の N1–N7 を引き継ぐ。R4-3 での新規知見はない
(既存ドリフトなし・新規は honest pin のみ)。件数で裏付けが増えた順に再掲:

1. 会社・部署・役職語彙 (C3): 未分類が最多。brother `company_name`/`division`、
   tenant `company/team/job`、toshiba `company`、vuln `c_q73/c_q74`、
   epson `c_q11`、ricoh `c_q1`、media `e_29111`、otsuka `company`、
   mitsuihome `company/syozoku/shimei/busho`。一方 toshiba `department`→普通科、
   ff 勤務先→school の誤読系 honest pin もあり、会社/部署/学校の読分けが課題。
2. coded-name 系の人・カナ・email (C4・C6 系): epson-csr/ir・ricoh-risb/vuln の
   c_q 姓/名/フリガナ/メール、kikkoman-media の bare 氏名・カナ、
   kobe ANSWER1・mitsui-chintai ANSWER1861 (例)漢字名 placeholder→fullName 推定、
   otsuka `mail`/kobe ANSWER3/mitsui-chintai ANSWER1863/media・works の
   type=text + email 見出し/placeholder。
3. zip 語彙の穴 (C5): mitsuihome `post1/post2`・mitsui-reform `post`、
   epson `c_q5` の `left/right` 分割、areacode-split tel (c_q14/c_q15 外側)、
   kobe ANSWER6・benesse 会員番号の bare 3-split (tel-split-by-name 候補)。
4. 姓/名とも fullName (C1): ff 4件の `name[first/last]`。same-label 分割の対象外形。
5. FAX に tel 値 (C2): ff 3件・smp `faxnumber`。fax 語彙の要否。
6. 住所の重複 fill (C8): mitsui-reform `address3/4`・mitsuihome `address3`・
   smp `address3`・toshiba `addressone`・kojin 二重ブロック・auhikari `add6/7`。
   refine の重複抑止の対象にするか将来PBIで。
7. 性別 option-text 起点 (C7): kikkoman-website `e_25042`・works `e_26144`、
   aeon `form-field-radio` (gender 群 skip のまま)。
8. Salesforce ミラー・readonly・dash 不整合 (N1・N2・N4): aeon `hidden_*` の
   fill 是非、auhikari `label_add1234` の readonly 扱い、kojin/tenant undashed と
   aeon dashed の混在。
9. nearby 読取範囲の設計確認 (N7): tr>th / dd>dt / fieldset>legend のみ。
   brother の plain div 見出しは読まれない (本 Round で読解確認済み)。
10. thin fixture (C9): ricoh-vuln (fillable 0)・epson-csr/ir (0)・ricoh-risb (0)・
    kobe (1)・mitsui-chintai (1)。corpus の多様性には寄与。

## PBI-208 台帳への追記用要点

- Round4 で corpus は 32 → 57 fixture (R4-1 候補183・有望28 → R4-2a P1 11件 →
  R4-2b P2 14件 → R4-3 pin 更新)。smp-area 404 の1件のみ未取込。
- 全体指標: fields 691・ruleHits 448 (64.8%)・fillable 283 (41.0%)。
  新25件は rule-hit 55.4% と低めだが coded-name 系の honest 未分類が主因で、
  既存分のドリフトはゼロ (分類パイプラインの劣化なし)。
- 上記「語彙の伸びしろ」10項が PBI-208 後の語彙 PBI 候補。

## Commits

- pin 更新: `486f27456594a058679dcb4d27644c15d2079b3c`
  test(eval): 新規25件分のpinを追加しmake evalを緑化 (1 commit に集約)
- 本レポート: `docs(sdd)` commit として同ブランチに記録 (push なし)

(End of file)
