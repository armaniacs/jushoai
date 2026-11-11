# Task R4-2b フルレポート — PBI-208 Round4 P2 14件の取込結果

- ブランチ: `work/pbi-208-round4`
- 対象: brief 列挙の P2 14件 (verbatim URL)。P1・P3 には手を出していない。
- 結果: 成功 14件 / 失敗 0件。
- 検証: `npx vitest run tests/integration/samples.test.ts` 全61緑 (R4-2a 時47 + 14)、
  `node scripts/sync-target-urls.mjs --check` ゼロ、`npx tsc --noEmit` clean。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし (R4-3 に委譲)。
  samples.test.ts は tooling 配線のみ (直編集なし)。
- push なし (brief どおり)。

## 成功分 (14 fixture・14 commits)

| # | URL (brief No.) | fixture | commits (full SHA) |
|---|-----------------|---------|--------------------|
| 1 | fujifilm FF-Webmaster-Ja | ff-webmaster-form.html (15 controls) | bb1635ee796b4814c329846ffa4b1b26842b0e7a |
| 2 | fujifilm FF-Procurement-Tokyo | ff-procurement-form.html (15 controls) | c60ea3284e983690ac96088f527de2c8fe5d5255 |
| 3 | holdings fujifilm compliance-hotline | ff-compliance-hotline-form.html (7 controls) | 86b4de8718a39406d6656f123f52a848e95980ef |
| 4 | tokyu-land kojin | tokyu-land-kojin-form.html (18 controls) | d031afe8f0024fd870a0c8faf2719931978b7e66 |
| 5 | tokyu-land tenant | tokyu-land-tenant-form.html (15 controls) | 4272e8768755e2030fc8824c9b336d097f6b5bf5 |
| 6 | benesse enquete | benesse-inquiry-form.html (11 controls) | a8b2a0a904cebca0537f5e0fe37a8dfbb3e2ba21 |
| 7 | mitsui-chintai | mitsui-chintai-inquiry-form.html (5 controls) | 0ff8ba2eafe76d1f49de5748442016dce8588430 |
| 8 | epson IR | epson-ir-form.html (20 controls) | 9a5938bf2ff2368ab1171c4558da07ea5c9efdc8 |
| 9 | ricoh vulnerability | ricoh-vulnerability-form.html (10 controls) | d88fa08c39fc459980233648cbf6cadd599925a9 |
| 10 | brother 113 | brother-inquiry-form.html (16 controls) | 122b519e3300c62c849abbad6fda24ecd6c7d3ba |
| 11 | kikkoman media | kikkoman-media-form.html (9 controls) | 146a20a33b28aa8a7ccb809e7b0a414e9e367cc7 |
| 12 | kikkoman works | kikkoman-works-form.html (11 controls) | a108bc069035eae7134834886da71e9a4daad841 |
| 13 | aeon voice | aeon-voice-form.html (9 controls) | f556372e634d656e9edfddd05a214b707ec5d989 |
| 14 | auhikari callback | auhikari-callback-form.html (14 controls) | 1996fb9052fa23d21b79e3ca632d4ec8cd9091e7 |

## 失敗分 (0件)

- なし。brief が注意していた benesse (No.6)・brother (No.10)・aeon Salesforce (No.13)
  はいずれも取込可能で、最小再現まで削って honest pin した。

## 取込時の修正 (tooling 出力に対する人手の最小修正)

詳細は `.superpowers/sdd/task-R4-2b-attempts.md` の「取込時の修正」8項を参照。
要点: dl/dt/dd 復元 (tokyu-land 2件)、tr/th 復元 (auhikari)、設問文 label 復元
(benesse)、select 実選択肢復元 (6件)、aeon 数値実体参照の復号、fixture header
コメント付与 (全件)、brother の bare 等価性の scanner 読解による確認、
U+3000 pin の hexdump 確認 (2件)。

## Concerns (分類ずれ・将来PBI候補。直さず honest pin)

R4-2a の C1–C10 のうち再発したもの:

- C1 姓/名とも fullName: ff-webmaster / ff-procurement / ff-compliance-hotline
  の `name[first/last]` がすべて `山田 太郎` (same-label 分割が効かない)。語彙候補。
- C2 FAX に tel 値: ff-webmaster / ff-procurement の `fax` が tel 全値を fill
  (fax 語彙なし)。語彙候補。
- C3 会社・部署系の未分類: tenant `company` (貴社名)・`team` (部署名)・`job` (役職)、
  brother `company_name`・`division`、media `e_29111` (貴社名)、vuln `c_q73` (会社名)・
  `c_q74` (組織名) が未分類。一方 ff 3件の勤務先・学校名→school は解決のまま。
  会社/部署の読分けは語彙候補。
- C4 email の未分類パターン: mitsui-chintai `ANSWER1863` (type=text + email
  placeholder)、media `e_29116` / works `e_25071` (type=text + メールアドレス
  見出し)、vuln `c_q70` が未分類。一方 benesse `q01008001/2` は placeholder 由来で
  解決。email-via-placeholder/heading 語彙候補。
- C6 kana の未分類: mitsui-chintai `ANSWER1861` (例)三井 太郎。fullName を infer
  しないのは kobe ANSWER1 と同じ)。一方 benesse/auhikari の姓名・カナ分割は
  設問文/th 信号で解決。例 prefix 付き placeholder 語彙候補。
- C7 性別の未分類: works `e_26144` (男性/女性/その他 実選択肢でも未分類。
  option-text 起点の gender 候補)。aeon の `form-field-radio` (女性/男性/法人…)
  も gender 群のまま skip (gender-radio-via-options 候補)。
- C8 住所の重複 fill: kojin `address1`/`address1_house` が同一値、
  `address2`/`address2_house` が同一値、auhikari `add6`/`add7` が同一値
  (refine の重複注入抑止の対象外)。要否は将来PBIで。
- C9 thin fixture: vuln (0欄fill・expected: {}。richell-anketo-rating 前例あり)、
  mitsui-chintai (1欄)、epson-ir (2欄)。corpus の多様性には寄与するが指標への
  寄与は小さい。

R4-2b で新たに見つかったもの:

- N1 Salesforce ミラー欄の fill: aeon の `hidden_*` (display:none form 内の
  type=text。JS が submit 時に可視欄から転記) を scanner が拾い、rule が fill
  する (`hidden_sex`→`女性` 等)。転記先を埋めることの是非は将来PBIで。
- N2 readonly 表示欄の未分類: auhikari `label_add1234` (住所自動表示欄) は
  scan 対象だが未分類のまま honest pin。readonly 欄の扱いは将来PBIで。
- N3 非JIS順 option 値での解決: brother `prefecture_master_id` (8=埼玉…の独自順)
  が option text 東京都で値 `10` に解決。値ベース照合の前提が崩れた場合の
  挙動は将来PBIで。
- N4 dash 付与の不整合: 同じ type=text でも kojin/tenant の `tel` は undashed
  (`09012345678`) に対し aeon の `phone` は dashed (`090-1234-5678`)、
  同一フォーム内の `hidden_phone` は undashed。dash 判定条件の整理は将来PBIで。
- N5 部屋番号の building 扱い: auhikari `add7` (部屋番号) が `千代田ビル101` を
  fill (C8 同系)。部屋番号語彙の要否は将来PBIで。
- N6 会員番号 3-split の未分類: benesse `q01005001/2/3` (数字例 placeholder の
  bare 3-split。kobe ANSWER6 と同型。tel-split-by-name 候補)。
- N7 nearby 読取範囲の設計確認: scanner (scan-fields.ts nearbyOf) は
  tr>th / dd>dt / fieldset>legend のみ読む。brother の plain div 見出しは
  読まれないため bare が等価 (本タスクで読解確認済み)。仕様として固定するかは
  将来PBIで。

## 申送り (R4-3 へ)

- `make eval` 全体 RED は想定内 (pin 未更新 14件分。R4-2a の11件と合わせ
  25件分)。R4-3 で一括更新すること。
- 上記 C1–C4・C6–C9・N1–N7 の語彙/判定候補は src 変更を伴うため本タスクでは未着手。
- `.superpowers/sdd/task-R4-2b-attempts.md` に14件の取込ログあり (本reportと同時commit)。

(End of file)
