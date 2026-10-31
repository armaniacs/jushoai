# PBI: 英語フォームの語彙追加（gender 選択肢と教育機関ラベルを分類語彙に足す）

## ユーザーストーリー
英語フォームを使う海外在住の利用者として、英文ラベルの欄（Gender・School Website・Name of Institution など）も「JushoAIで入力」で正しく分類・解決してほしい、なぜなら英文語彙がルールに無いと欄が未分類や誤分類で残り、性別 radio は英文選択肢と日本語 profile 値が不一致で警告になって補完の恩恵が消えるから

## 優先度
- 順位: 未定（次ラウンドの RICE で確定）
- 根拠: PBI-208 実装者の Concerns（corpus 実装時に語彙候補として記録済み）+ なぜなぜ分析項目 7。corpus に載った英語フォーム（nishimachi・gis）の分類率が伸びしろで、211 の radio 復元と合わせて海外フォームの補完成功率に直結

## 出どころ
- PBI-208 実装者の Concerns（pbi/2026-10-31-208-feat-samples-corpus-growth.md の実装記録「語彙の伸びしろ」節、progress.md:149 の Note(208)）:
  - 英語 gender radio（Male/Female）の選択肢が日本語 profile 値と不一致で warn-no-option になる（samples/nishimachi-inquiry.html:21-22・:45-46。matchGenderOption、src/core/genders.ts:9、dispatch は src/core/match-option.ts:15）
  - "School Website" が school と読める（samples/nishimachi-inquiry.html:28。SCHOOL 正規表現、src/core/classify-rules.ts:74。website 欄の語彙が無い）
  - "name-institution" が fullName と読める（samples/gis-intl-admission.html:29-30、「Name of Institution and Period of Japanese Study」のラベル。FULL_NAME 正規表現、src/core/classify-rules.ts:343）
- なぜなぜ分析（2026-10-31）の項目 7（PBI-208 Minor 系の持ち越し。.superpowers/sdd/why-why-2026-10-31-summary.md）
- fixture は既存（nishimachi-inquiry・gis-intl-admission が corpus 済み）のため、本 PBI は語彙の追加が主で新規 fixture は要らない。radio 政策は崩さない

## BDD受け入れシナリオ
Scenario: 英語 gender radio が日本語 profile 値で解決される
  Given Male/Female の選択肢を持つ英語の Gender radio 欄と、日本語で登録した profile の性別
  When 「JushoAIで入力」を押す
  Then 英文選択肢が日本語 profile 値に対応して解決され、warn-no-option で止まらない

Scenario: 英文の教育機関欄が意図した分類になる
  Given 「School Website」と「Name of Institution and Period of Japanese Study」のラベルを持つ英語欄
  When 「JushoAIで入力」を押す
  Then それぞれ意図した分類になり、氏名（fullName）の誤検出は起きない

Scenario: radio 政策は従来どおり保たれる
  Given 語彙追加後の corpus（matrix radio・性別・年代の radio 群を含む）
  When make eval と make test を実行する
  Then radio は name 単位で 1 欄に束ねられ、性別・年代のみ分類でそれ以外は未分類のまま、既存の pin が更新されて緑になる

## 受け入れ基準
- [ ] 英語 gender radio（Male/Female 等）が日本語 profile 値で解決され、warn-no-option にならない
- [ ] "School Website"（website 欄）が教育機関名（school 名欄）と読み分けられる
- [ ] "Name of Institution" 系のラベルが fullName に誤検出されない
- [ ] radio 政策は name 単位で 1 欄に束ね、性別・年代のみ分類のまま崩さない
- [ ] fixture 先行 TDD: tests/core/ に再現 fixture（makeMeta）を足して失敗させてから語彙を直す。正規表現が落ちたら期待値ではなく正規表現を直す
- [ ] make eval の指標差分を tests/eval/corpus.eval.ts の pin 更新で同じコミットに固定する（劣化した指標は放置しない）
- [ ] make check が exit 0

## 実装手順
- fixture 先行: tests/core/classify-rules.test.ts と tests/core/genders 系 test に、英語ラベル（School Website・Name of Institution）と英語 gender 選択肢（Male/Female）の再現 fixture を makeMeta で追加して失敗させてから語彙を直す
- src/core/classify-rules.ts の SCHOOL（:74）と FULL_NAME（:343）に、website 欄と教育機関名欄の読み分けを足す（website 欄は教育機関名欄に載せない）
- src/core/genders.ts の matchGenderOption に英文選択肢（Male/Female 等）と日本語 profile 値の対応を足す
- radio 政策は崩さない: radio は name 単位で 1 欄に束ね、性別・年代のみ分類。matrix radio（rating 群など）は未分類のまま置く
- make eval で指標差分を確認し、tests/eval/corpus.eval.ts の pin を本 PBI の実装コミットで一緒に更新する（語彙追加は指標の内訳を動かす。別コミットに割ると pin の食い違いが持ち越される）

## テスト戦略
- 単体: tests/core/ に英語語彙の再現 fixture を先に足し、分類と gender 解決を固定する（makeMeta）
- 指標: make eval（pin 更新込み。corpus 別の差分も実装記録に残す）
- 統合: tests/integration/samples.test.ts の nishimachi・gis ケースが緑のまま保たれる（期待値は語彙追加で変わる場合は同じコミットで更新）

## 見積もり
1（要チームでの見積もり）

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）

```bash
grep -n 'SCHOOL\|FULL_NAME' src/core/classify-rules.ts
grep -n 'matchGenderOption' -r src/core
npx vitest run tests/core/classify-rules.test.ts -t 'gender'
```

未実装の確認済み（2026-10-31 起票時）: 英文選択肢（Male/Female）と日本語 profile 値の対応は src/core/genders.ts に無く、website 欄の語彙（School Website を教育機関名欄と読み分ける語）も無い。

### 落とし穴
- matchGenderOption は選択肢の text と profile 値の一致で解決する（src/core/genders.ts:9）。Male/Female を男女の別名に足すとき、value（"Male"）と text（"Male"）のどちらを掟にするかを fixture で固定する（実ページは value も text も Male/Female）
- FULL_NAME（src/core/classify-rules.ts:343）は「Name」を氏名の語として読む。教育機関名の「Name of Institution」を拾わないよう、教育機関の語（Institution など）を先に判定する欄の語彙に足す。読み順を変えると既存の分類が動くので fixture 先行
- 「School Website」は教育機関名欄に載せると誤補完（URL を入れたい欄に学校名が入る）になる。website 欄の語彙は school 名欄より先に判定して分類から外す
- 語彙追加は make eval の指標（ruleHits・unknowns・fillable）を動かす。pin 更新を片方だけ直すと pin の食い違いが持ち越される

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
