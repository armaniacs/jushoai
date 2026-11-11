# Task R4-7b フルレポート — 大学ランキング上位校の有望8件の取込結果

- ブランチ: `work/pbi-208-round4`
- 対象: brief 列挙の大学8件 (verbatim URL)。P1 4件・P2 4件すべて取込。
- 結果: 成功 8件 / 失敗 0件。
- 検証: `npx vitest run tests/integration/samples.test.ts` 全91緑 (R4-7b 前 83 + 8)、
  `node scripts/sync-target-urls.mjs --check` ゼロ、全体 `npx vitest run` 177 files / 2414 passed。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし (R4-3 に委譲)。
  samples.test.ts は tooling 配線 + 改名に伴う同名置換 + 既存構文破損の1行修復のみ (期待値の直編集なし)。
- push なし (brief どおり)。

## 成功分 (8 fixture・8 commits)

| # | URL (brief No.) | fixture | commits (full SHA) |
|---|-----------------|---------|--------------------|
| 1 | kyutech contact (No.1) | contact.html (11 controls) | 0daf72b469c6bb02d8cf505d7520e589cb38fa64 |
| 2 | uoeh-u inquiry (No.2) | inquiry-html.html (12 controls) | 6f8a9da8e4c9241e4b473ef717894476e1d80020 |
| 3 | showa-u postin-svr (No.3) | index-asp.html (18 controls + 性別radio) | bf0943d3c6ef0fb345975f672c6f42e4a230d8f9 |
| 4 | admission-logi 6932 (No.4) | 6932.html (16 controls + sex) | 86c3c3a95bcf7821d1358dc651ea50001cc8f854 |
| 5 | kit contact (No.5) | kit-contact-form.html (9 controls) | b9d905c21419d7d0b93f97ceeef95918b62a397e |
| 6 | shimane-u inquiry (No.6) | shimane-inquiry-form.html (5 controls) | 6d7280b19d9cd34164da37f858092875019ecad2 |
| 7 | form-mailer 25b2d0e (No.7) | aoyama-campus-inquiry.html (8 controls) | 76ee32c42d09be8127b98f37885c3ff69236c230 |
| 8 | form-mailer 08ff74b0 (No.8) | aoyama-sagamihara-career.html (6 controls) | 1c4ec49e33163b25545ac8fcfc7daee12361f034 |

## 失敗分 (0件)

- なし。全8件 curl で HTTP 200、静的実フォームとして取込可能だった。

## 取込時の修正 (tooling 出力に対する人手の最小修正)

詳細は `.superpowers/sdd/task-R4-7b-attempts.md` の「取込時の修正」10項を参照。
要点: kyutech の tr/th 復元、showa・kit の bare 等価性 (N7)、7件の select 実選択肢復元
(数値 scheme 2種含む)、空 select の保持 2件、性別 radio 実形復元 2件、幽霊・ヘッダ欄の
trim 4件、fixture 改名 4件 (衝突回避 1・汎用名 3)、既存構文破損の1行修復。

## Concerns (分類ずれ・将来PBI候補。直さず honest pin)

R4-2b の C1–C9 のうち再発したもの:

- C1 姓/名とも fullName: kyutech name1/2・kana1/2、uoeh query[1][0]、6932 kana_1/2
  (same-label 分割が効かない)。No.8 の sei/mei 分割は解決している。語彙候補。
- C3 会社・部署系の未分類: kit org (組織名)/unit (部署名) が未分類。一方 shimane
  question_answers[2] (企業・団体名) は company に解決。会社/部署の読分けは語彙候補。
- C4 email の未分類パターン: showa PCmail (type=text + E-mail 見出し) が未分類。
  email-via-name 語彙候補 (otsuka mail と同型)。
- C6 郵便の未分類/重複: showa yubin (bare + 1234567 placeholder) が未分類
  (yubin-via-name 候補、kobe ANSWER6 と同型)。kyutech zip1/2 は両方 undashed 全値で
  重複 fill (zip split 適用外)。
- C8 住所の重複・連結差: kyutech address1 は都道府県付き連結 (tokyu-land と同 pin)
  に対し、6932 は city/address に分割 (refine の差異)。要否は将来PBIで。
- N4 dash 付与の不整合 (R4-2b N4 再発): uoeh tel は dashed (maxlength=24) に対し
  kyutech/kit/6932 の tel、kyutech zip は undashed。dash 判定条件の整理は将来PBIで。
- N3 非JIS順 option 値での解決 (R4-2b N3 再発): 6932 pref が +10 scheme の値 `23`
  で東京都に解決。値ベース照合の前提が崩れた場合の挙動は将来PBIで。

R4-7b で新たに見つかったもの:

- N1 wrapping-label radio の未解決: showa seibetsu1 (男性/女性、for 結合なしの
  wrapping label) は未分類のまま。一方 6932 sex は name 駆動で解決 (otsuka 前例)。
  wrapping-label 信号の読取りは将来PBIで。
- N2 school_ken の school 語彙吸着: 6932 school_ken (高校所在地県名、実都道府県
  選択肢) が school と読まれ warn-no-option で未分類。school_ken-misread 候補。
- N3 生年月日 select の未分類: 6932 birthday_y/m/d (実レンジ・該当選択肢あり) が
  未分類。birthday-by-name 候補 (profile-fields-form の by_y 解決との差異)。
- N4 ふりがな後半の漢字名解決: uoeh query[2][1] が 太郎 (kanji firstName) で fill。
  kana drift 候補。
- N5 学部・学科→school: aoyama-sagamihara field_7341181 (学部・学科、研究科) が
  都立日比谷高校を fill (ff-csr 勤務先・学校名 pin と同型)。department-vs-school
  の読分けは将来PBIで。
- N6 thin fixture: showa 4欄・shimane 3欄 (richell 前例あり)。corpus の多様性には
  寄与するが指標への寄与は小さい。
- N7 tooling/既存破損 (src 外): target-url.md 末尾改行なしでの行結合、contact.html
  名衝突、samples.test.ts の既存構文破損 (HEAD 由来の余分な `});`)。いずれも本タスクで
  修復済み。tooling 側の改善は将来PBIで。

## 申送り (R4-3 へ)

- `make eval` 全体 RED は想定内 (pin 未更新 8件分。R4-7b 前の25件と合わせ 33件分)。
  R4-3 で一括更新すること。
- 上記 C1・C3・C4・C6・C8・N3・N4・N1–N6 の語彙/判定候補は src 変更を伴うため本タスクでは未着手。
- `.superpowers/sdd/task-R4-7b-attempts.md` に8件の取込ログあり (本 report と同時 commit)。

(End of file)
