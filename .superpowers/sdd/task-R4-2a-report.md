# Task R4-2a フルレポート — PBI-208 Round4 P1 12件の取込結果

- ブランチ: `work/pbi-208-round4`
- 対象: brief 列挙の P1 12件 (verbatim URL)。P2 には手を出していない。
- 結果: 成功 11件 / 失敗 1件 (No.10 SMP-area 404)。
- 検証: `npx vitest run tests/integration/samples.test.ts` 全47緑、
  `node scripts/sync-target-urls.mjs --check` ゼロ、`npx tsc --noEmit` clean。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし (R4-3 に委譲)。
  samples.test.ts は tooling 配線のみ (直編集なし)。
- push なし (brief どおり)。

## 成功分 (11 fixture・11 commits)

| # | URL (brief No.) | fixture | commits (full SHA) |
|---|-----------------|---------|--------------------|
| 1 | fujifilm FF-CSR | ff-csr.html (15 controls) | af7db136d067a3ad78412fa1caef20679b0624b3 |
| 2 | otsuka opinion/form | otsuka-opinion-form.html (8+sex) | 2159cde187d2c32683905805e9779c95b1c3aa17 |
| 3 | mitsuihome form.php | mitsuihome-sonota-form.html (24) | c32a8c801e436d86aa2b4899b74101952cdb5035 |
| 4 | mitsui-reform select.html | mitsui-reform-catalog-form.html (29) | 5c4971e5188a3ba440a9b363c2043134350b8012 |
| 5 | tokyu-land contact/ | tokyu-land-contact-form.html (10) | f12ef68cedde2517decfc2c4f552ba3e28ac3a8d |
| 6 | kobe 26436_ucnb_1 | kobe-city-contact-form.html (9) | 31e4036d04aac4d45dd958fee773bf518f226fce |
| 7 | epson cform | epson-csr-form.html (20) | bf9eea3f8f3e609d0deddf3ef5caaa8763f70be4 |
| 8 | ricoh webform risb | ricoh-risb-form.html (7) | 89809b11d331a43c27b23c10272b0b455ca9909d |
| 9 | kikkoman m/website | kikkoman-website-form.html (12) | 65a56246008d3b82207b2526da8eef2693ffe860 |
| 11 | smp regist | smp-regist-inquiry-form.html (13) | 6a4740b24643809f5d6beb54edd560a8712391ff |
| 12 | toshiba GX | toshiba-gx-contact-form.html (16) | 01a5b8a170a116f766cb2a0f98f0a9eb34360bab |

## 失敗分 (1件)

- No.10 `https://area31.smp.ne.jp/area/is?SMPFORM=qcrc-mcldsd-95bb156300186458a5d681e60ccadfa&type=ac`
  → 404 (SMPFORM トークン失効。R4-1時は HTTP 200)。`make addurl` が書いた
  registry 行は revert 済み (失敗分は書かない)。無理せず次へ進んだ。

## 取込時の修正 (tooling 出力に対する人手の最小修正)

1. fixture 名の付け替え: otsuka のみ `form.html` → `FIXTURE=otsuka-opinion-form.html`
   で取込直後に付け替え (他10件は最初から FIXTURE 指定)。
2. radio 群の復元: otsuka の sex (男/女。gender 解決し `sex → '2'`)。
   他の radio/checkbox/textarea/hidden は brief どおり skip のまま。
3. select 実選択肢の復元 (scaffold は `--` に落とす): kobe 居住区、
   epson 都道府県、kikkoman 性別、smp 都道府県、toshiba 4種。
   いずれも前例 (formmailer-anketo-gender.html) どおり。
4. Shift_JIS 文字化け placeholder の復元: smp-regist (fetcher が cp932 を
   utf-8 復号した mojibake を UTF-8 で復元。実在しない信号の追加ではない)。
5. dl/dt/dd 行構造の復元: mitsui-reform / tokyu-land / smp-regist / toshiba。
   scanner が dt を nearby (split/leftover の grouping key) として読むため、
   bare 化すると実ページと grouping が変わる (tel/tel2 の PBI-09
   empty-key leftover が実ページでは起きない)。table-form.html 前例の形。
   otsuka / mitsuihome / kobe / epson / ricoh / kikkoman は td/th なし
   (nearby 空が実ページと等価) のため bare のまま。

## Concerns (分類ずれ・将来PBI候補。直さず honest pin)

- C1 姓/名とも fullName: ff-csr `name[first/last]` が両方 `山田 太郎`
  (same-label 分割が効かない)。語彙候補。
- C2 FAX に tel 値: ff-csr `fax`、smp-regist `faxnumber` が tel 全値を fill
  (fax 語彙なし)。語彙候補。
- C3 会社・部署系の未分類: otsuka `company`、mitsuihome `company/syozoku/
  shimei/busho`、toshiba `company`、epson `c_q11`、ricoh `c_q1` が未分類
  (label/placeholder の会社語彙なし)。一方 ff-csr 勤務先・学校名→school、
  toshiba 部署名→普通科 (学校dept誤分類。companyDepartment 開発部は未使用)。
  会社/部署の読分けは語彙候補。
- C4 email の未分類パターン: otsuka `mail` (type=text)、kobe ANSWER3、
  kikkoman `e_25031` (見出しのみ)。email-via-placeholder/heading 語彙候補。
- C5 zip 語彙の穴: mitsuihome `post1/post2`、mitsui-reform `post`、
  epson `c_q5`、`left/right` 分割、`postalCode1:a/t` は解決する一方で
  `post` 単独は未分類。post-prefix zip 語彙候補。smp `address1` select
  (都道府県 nearby + 実選択肢)・kobe ANSWER4 (居住区) も未分類。
- C6 kana の未分類: kobe ANSWER1 (神戸 太郎 placeholder が fullName を
  infer しない — 地名先頭との関係は未確認)、smp `kana1/kana2`
  ((例：やまだ) の括弧+例 prefix が bare せい/めいと異なり未分類)。
  例 prefix 付き kana placeholder 語彙候補。
- C7 性別の未分類: kikkoman `e_25042` (コード化名+label なし。`sex` 名や
  性別 label があれば解決する前例あり)。option-text 起点の gender 候補。
- C8 住所の重複 fill: mitsuihome `address3` = address1 と同値、
  mitsui-reform `address3/4`、smp `address3`、toshiba `addressone` が
  都道府県付き連結値を fill (refine の重複注入抑止の対象外)。要否は将来PBIで。
- C9 thin fixture: kobe (1欄)、ricoh (1欄)、epson (2欄) はコード化名/
  番号設問のためほぼ未分類。corpus の多様性には寄与するが指標への寄与は小さい。
- C10 No.10 SMP-area の 404: SMPFORM トークン失効。P2 の reg31 系とは別物
  のため R4-2b の対象外。将来の再取込はトークン再取得が必要。

## 申送り (R4-3 へ)

- `make eval` 全体 RED は想定内 (pin 未更新 11件分)。R4-3 で一括更新すること。
- 上記 C1–C8 の語彙候補は src 変更を伴うため本タスクでは未着手。
- `.superpowers/sdd/task-R4-2a-attempts.md` に12件の取込ログあり (本reportと同時commit)。
