# PBI: 長すぎる建物名の略記

## ユーザーストーリー

マンション・部屋番号入りの住所を登録しているユーザーとして、建物名が maxlength を超えるとき決定的な略記規則で短くして入れてほしい、なぜなら現行は「超過は切り詰めず警告して注入しない」(planner.ts:152-153)で警告だけで終わり その欄の入力が完了しないから。

## 優先度

- 順位: 8位 / 9件
- RICEスコア: 7(Reach=1.5 / Impact=1.5 / Confidence=80% / Effort=0.25人月)
- 根拠: 警告で終わると空欄が残置される(その欄の入力完了が失われる)が 手入力という代替があり頻度も建物名に限る。略記規則は TODO 6(半角・全角)と共有するため 6 を先に着手する。NOT-TODO 12 との境界: 承認を経る略記は本 PBI・承認を経ない切り詰めは引き続き NOT-TODO。

## BDD受け入れシナリオ

```gherkin
Scenario: maxlength 超過の建物名が略記される
  Given maxlength の短い建物名欄と それを超える建物名がある
  When 分類と計画を実行する
  Then 略記後の値と略記前の値がプレビューに並んで表示され 承認後に注入される

Scenario: 略記しても収まらないときは現行どおり
  Given 略記規則を適用しても maxlength に収まらない建物名がある
  When 計画を実行する
  Then 現行どおり警告して注入しない(warn-maxlength)
```

## 受け入れ基準

- [x] fixture を先行追加(tests/core/)してから core/ の略記規則(半角化・空白と記号の圧縮・接尾語の短縮。採否は設計時に決める)を実装する(samples に「建物欄+maxlength」の組合せが既存しないため fixture 新設が必須)(tests/core/building-abbreviate.test.ts 13 テストを fixture 先行で追加。src/core/abbreviate.ts を新設(決定的規則表・LLM 不使用): 空白除去+接尾語の最長一致短縮(ビルディング→ビル、レジデンス/マンション/コーポラス/アパート/コーポ/ハイツ→邸)。長くなる置換(ビル→BLDG 等)は収まらないため表に入れない旨を fixture で固定。building 欄は値全体、street/addressNoPref/addressFull は追加した建物尾部のみ短縮)
- [x] 略記前の値と略記後の値をプレビューに表示し 承認してから入れる(PlanItem の value/display 分離を利用)(PlanItem.abbrev を追加し display は「略記前 → 略記後」。プレビューに「略記して入れる」チェックボックス(既定未承認=注入しない)、applyAbbrevApprovals の承認 seam、onApply(sendFeedback, approvedAbbrevs) に第2引数追加。承認行だけ value/status を置換してから injectPlan)
- [x] 承認を経ない切り詰め・省略は実装しない(NOT-TODO 12。fill 値に切り詰めなしの現状を維持)(既定未承認のため非承認時は従来どおり注入しない。fill 側の「status ok が注入」契約は不変)
- [x] 略記しても収まらない・略記規則を適用できないときは現行どおり警告して注入しない(土台(市区町村・町名)が既に超過の場合は救えず従来どおり warn-maxlength)
- [x] 「表示幅」を範囲に入れるか・計測方法と 海外住所の address2 も同じ building カテゴリに吸われる点の適用可否を設計時に決める(表示幅は拡張側で計測不能のため範囲外。海外住所の address2 は別カテゴリのため対象外。設計書追補(2026-10-21)節に順序契約(幅変換が先・略記はその後)とともに記録、文字種検証 exit 0)
- [x] `make check` が通る

## テスト戦略

- 単体: 略記規則(fixture 先行。core/formatters の隣に置くのが TODO 6 と同じ手順先)
- 統合: planner・プレビュー表示(略記前後の並び)

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(tests/core/building-abbreviate.test.ts 13 テスト+tests/ui/preview-abbrev.test.ts 5 テストが規則表・承認契約(既定未承認=注入しない)・略記前後の表示を機械的に守る)
- [ ] コードレビュー完了
- [x] `make check` が通る
