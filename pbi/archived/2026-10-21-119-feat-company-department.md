# PBI: 会社名・部署の対応(text 欄のみ)

## ユーザーストーリー

就活エントリーや法人フォームを埋めるユーザーとして、会社名・部署の text 欄にも補完してほしい、なぜなら就活・法人フォームで実在する欄が 現在は EXCLUDE で分類されず未記入のまま残るから(samples 12fc22bc297429.html の「法人・団体名」欄が未記入実績: tests/integration/samples.test.ts:273)。

## 優先度

- 順位: 5位 / 9件
- RICEスコア: 8(Reach=2.5 / Impact=1 / Confidence=80% / Effort=0.25人月)
- 根拠: 既存 school/department と同一の単独欄パターン(ownLegend 0.7/0.65: classify-rules.ts:157-158)で分類でき プロファイル拡張は 2 欄で済む。NOT-TODO 5(汎用フォームツール化)の内側に留める(会社名カナ・部署カナ・法人種別・代表電話は作らない)。

## BDD受け入れシナリオ

```gherkin
Scenario: 会社名欄が新カテゴリで分類される
  Given 「法人・団体名」の text 欄がある
  When 分類を実行する
  Then 会社名カテゴリで分類され プレビューに会社値が表示される

Scenario: 会社語が学校欄・部署欄に流れない
  Given 学校・学部語を含む欄がある
  When 会社名・部署のカテゴリ追加後に分類を実行する
  Then 既存の school/department 分類と「会社名 が school にならない」ガードが不変である
```

## 受け入れ基準

- [x] ガード fixture を先行追加(tests/core/)し EXCLUDE/officeField ゲートの緩和境界(会社名・部署だけ通す。ご担当者名・会社の生年月日・部署名は除外のまま)を固定してから着手する(fixture 先行 red 4件→実装後緑。officeEligible に一箇所化し /(?:会社|法人|団体)名|社名/ と /部署(?!名)/ だけ通す。カナ文脈・誕生文脈・役職・店舗・法人種別・会社電話は従来どおり除外)
- [x] CATEGORIES に会社名・会社部署を追加し Profile 型に新欄 2 つ(会社名+会社部署。既存 department は学部・学科用のまま)を追加する(新カテゴリ company/companyDepartment。Profile に companyName・companyDepartment(任意・空可、正規化は trim のみ)、normalizeProfile に trim 2 行追加(追加しないと保存のたびに会社値が欠落)。既存 department は学部用のまま)
- [x] planner valueFor・設定 UI(PROFILE_FIELDS)・LLM プロンプト(SYSTEM_PROMPT)にカテゴリを追加する(buildSchema は CATEGORIES 連動で自動反映)(連動を確認済み。card-builders-parity の PROFILE_LABELS に新 UI 欄 2 件を反映)
- [x] 走査対象の拡大とフォーマッタ新規はしない(text は既に走査対象: scan-fields.ts:13)(走査拡大なし・フォーマッタ新規なし。NOT-TODO 5 の内側: 会社名カナ・部署カナ・法人種別・代表電話は作らない)
- [x] autocomplete="organization" の取扱い(AUTOCOMPLETE map 追加の要不要)を設計時に決める(追加する: organization→company 0.95。ページが欄の意味を宣言しているため、設計書追補に記録)
- [x] `make check` が通る

## テスト戦略

- 単体: 分類 fixture 先行(tests/core/classify-rules.test.ts の negatives 拡張。会社名→null の既存ガードを新カテゴリ追加後も維持)
- 統合: samples.test.ts へのケース追加(法人・団体名欄)

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(samples.test.ts に 12fc22bc297429.html の法人・団体名欄(field_4647587)が company に分類され会社名が注入されるケースを追加。「会社名 が school にならない」「Company Department → null」「部署名/ご担当者名/会社の生年月日 → null」等の既存ガードは不変で維持)
- [x] コードレビュー完了
- [x] `make check` が通る
