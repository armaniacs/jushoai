# PBI: 生年月日 1 欄型・type=date 対応

## ユーザーストーリー

会員登録や就活のフォームを埋めるユーザーとして、生年月日を 1 input に入れる欄と type=date 欄にも補完してほしい、なぜなら現在はその欄だけが常に空のまま残り 手入力に戻るから(2026-10-17 深掘りで実在が確定)。

## 優先度

- 順位: 4位 / 9件
- RICEスコア: 12(Reach=3 / Impact=1 / Confidence=80% / Effort=0.2人月)
- 根拠: 生年月日欄は高頻度だが対象は 1 欄型・date 型の部分集合(select 3 欄分割 birthYear/Month/Day は対応済み)。birthday(ISO 1 本)・eras.ts(和暦導出)は無改変で再利用でき type=date は HTML 標準で value が常に YYYY-MM-DD のため ISO 注入は技術的に確定。プロファイル設計書の「含めない」解除であり設計書の新規・更新から始める(todo-not-todo.md:155 共通ルール 2)。

## BDD受け入れシナリオ

```gherkin
Scenario: type=date 欄に生年月日が注入される
  Given type=date の欄と登録済み birthday がある
  When 補完を実行する
  Then 欄に YYYY-MM-DD の値が注入され プレビューに表示される

Scenario: 誕生日語の 1 input 欄が分類対象になる
  Given 「生年月日」ラベルの text 1 input 欄がある
  When 分類を実行する
  Then 単一 birthday カテゴリで分類され 年月日全体が注入対象になる
```

## 受け入れ基準

- [x] 設計書(docs/superpowers/specs/)を新規・更新してから着手する(プロファイル設計書:20-22 の「生年月日 1 欄型 含めない」解除。type=date は ISO 一択・1 欄型 text は placeholder 例示に従うかどうかは設計時に決める)(profiles-design.md に追補(2026-10-21)節を追加: type=date も 1 欄型 text も ISO 一択、placeholder 例示の解析は誤注入防止のためしない、解釈不能な保存値は注入しない、legend だけでは判定しない(3 欄分割 fieldset との衝突防止)、AUTOCOMPLETE bday 0.95。文字種検証 exit 0)
- [x] 走査対象に type=date を追加する(dom/scan-fields.ts:13 の TEXT_TYPES。現在は FieldMeta 自体が生成されない)(TEXT_TYPES に date を追加し FieldMeta 生成)
- [x] 分類ガードを単一 birthday カテゴリの導入に合わせ更新する(classify-rules.ts:288-292 の誕生日語 return null。CATEGORIES+AUTOCOMPLETE bday+planner valueFor+LLM プロンプトのカテゴリ追加)(誕生日語 return null を birthday 0.7 に更新。新カテゴリ birthday。CATEGORIES+AUTOCOMPLETE bday+planner valueFor+SYSTEM_PROMPT に追加、buildSchema/parseLlmOutput の CATEGORIES 連動を確認)
- [ ] 対象 URL を確定して `make addurl URL=<url>` から始め samples fixture 追加と tests/integration/samples.test.ts のケース追加を必須にする(grep 実測: samples 20 件に type="date" は 0 件、「誕生」ラベルは既存 3 欄分割型のみで新機能対象の fixture が存在しない。対象 URL の確定+make addurl はユーザー作業として残す)
- [x] birthday(ISO 1 本)・eras.ts(和暦導出)を無改変で再利用する(planner は splitBirthday 検証済み ISO をそのまま、解釈不能は空扱い。eras.ts 未改変)
- [x] `make check` が通る

## テスト戦略

- 単体: 分類(誕生日語 1 欄型)・planner(ISO 注入)の fixture 先行(tests/core/)
- 統合: samples.test.ts のケース追加
- 手動: samples フォームでの確認

## 見積もり

- 0.2人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(fixture 先行 red 4件(分類 3+planner 1)→実装後緑。ISO 注入と解釈不能値の空扱いを planner テストが機械的に守る)
- [ ] コードレビュー完了
- [x] `make check` が通る
