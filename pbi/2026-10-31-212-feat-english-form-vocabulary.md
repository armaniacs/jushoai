# PBI: 英語フォームの語彙追加（gender 選択肢と教育機関ラベルを分類語彙に足す）

## ユーザーストーリー
英語フォームを使う海外在住の利用者として、英文ラベルの欄（Gender・School Website・Name of Institution など）も「JushoAIで入力」で正しく分類・解決してほしい、なぜなら英文語彙がルールに無いと欄が未分類や誤分類で残り、性別 radio は英文選択肢と日本語 profile 値が不一致で警告になって補完の恩恵が消えるから

## 優先度
- 順位: 着手確定（なぜなぜ分析（持ち越し候補、2026-10-31）の利用者視点 Top 1。英語フォームで性別 radio が warn-no-option で止まり、唯一「押して終わる」補完が切れる直接実害のため）
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
- [x] 英語 gender radio（Male/Female 等）が日本語 profile 値で解決され、warn-no-option にならない
- [x] "School Website"（website 欄）が教育機関名（school 名欄）と読み分けられる
- [x] "Name of Institution" 系のラベルが fullName に誤検出されない
- [x] radio 政策は name 単位で 1 欄に束ね、性別・年代のみ分類のまま崩さない
- [x] fixture 先行 TDD: tests/core/ に再現 fixture（makeMeta）を足して失敗させてから語彙を直す。正規表現が落ちたら期待値ではなく正規表現を直す
- [x] make eval の指標差分を tests/eval/corpus.eval.ts の pin 更新で同じコミットに固定する（劣化した指標は放置しない）
- [x] make check が exit 0

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
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-10-31）

### 追加した語彙（src/core/、fixture 先行 TDD）
- src/core/genders.ts: 英語 gender 別名（Male/Female）を GENDER_ALIASES として追加。alias は 3 段フォールバックの option アクセサに乗るため、英文ラベルは text 段（段 1）と value 段（段 2）で一致し、leading-char 段（段 3）は日本語（男/女）専用のまま。キーは小文字化（実ページは value="Male"・label text "Male"。FEMALE も読む）。leading-char 段が英語を拾わない境界（M/F → null）を fixture で固定
- src/core/classify-rules.ts: SCHOOL に教育機関の英語ラベル（institution/institute）を追加。「Name of Institution ...」を氏名（FULL_NAME の name 語）に拾わせないため、school 前処理の語彙として先に判定する。読み順は変えず、DISPATCH の school エントリが氏名の sources より先に返る既存の定義順をそのまま使う
- src/core/classify-rules.ts: website 欄の語彙（WEBSITE = website/web site/url）を school 名欄より先に判定して分類から外す（URL を入れたい欄に学校名が入る誤補完より不注入が安全）。url は語境界で守る（NAME_EXCLUDE の cc パターンと同型）。autocomplete・email・誕生日語のページ自身の宣言はこの語彙除外より先に返る（AUTOCOMPLETE の token は語彙に勝る既存の約束事と同じ）
- radio 政策は不変（isAllowedRadioCategory は触らず、性別・年代のみ分類。matrix radio は未分類のまま。分類対象の拡大もなし）

### 出どころの解釈（実装の方向）
- 出どころ節の「"School Website" が school と読める」は現状記録で、出どころ元の PBI-208 実装記録（語彙の伸びしろ節）は School Website が school に、name-institution が fullName に載るのを「今回 pin した未分類と誤解釈」（語彙追加の候補）として挙げている（URL・教育機関の語彙なし）。本 PBI の受け入れ基準（「website 欄が教育機関名と読み分けられる」「Name of Institution 系が fullName に誤検出されない」）と落とし穴（website 欄は分類から外す）に従い、既存挙動の pin ではなく語彙追加で解決した

### 指標差分（make eval、ローカル計測）
- fixture 別（ruleHits/llmFallbacks/fillable、fields）: nishimachi-inquiry 16/3/7 fields 19 → 15/4/7（field_976 が website 欄として分類から外れ school → unknown。fillable 不変）、gis-intl-admission 6/8/4 fields 14 → 6/8/3（name-institution が Institution 語彙で school に載り fullName → school。合成 profile の school は空のため warn-no-value で fillable -1）
- 集計: fields 261 不変、ruleHits 204 → 203、llmFallbacks 60 → 61、fillable 126 → 125、refineChanged 28 不変、refineDropped 0 不変。pin は 203/61/125 に語彙追加と同じコミットで更新した

### 確認したテスト
- make test: 174 ファイル全緑（2255 tests + 1 expected fail）。genders.test.ts に英語別名の再現 fixture 4 ケース（text 段・value 段・実ページ形・leading-char 段の境界）を追加、classify-rules.test.ts に PBI-212 の再現 fixture（Institution → school、School Website → 分類から外れる、website 語彙の境界、学校名語彙の維持）を追加して red（7 失敗）→ green を確認
- make eval: pin 更新後に緑（203/61/125）
- make check: exit 0
- 文字種チェック: check_docs_chars.py が OK（本 PBI と CHANGELOG.md）
- tests/integration/samples.test.ts: nishimachi に field_962/946 に Female（warn-no-option → 英文選択肢の解決）、field_976 の期待値を削除、gis の name-institution に都立日比谷高校。nishimachi fixture のヘッダーコメントも最終状態の文言に更新
