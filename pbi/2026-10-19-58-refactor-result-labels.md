# PBI: 結果理由ラベルをfill-planに一本化する

## ユーザーストーリー

開発者として、適用結果の理由ラベル（適用済み・見送り…）の対応表を1箇所に持ちたい、なぜなら表示側（preview）と送信側（issue-url）の二重所有は文言driftの温床であり、FILL_RESULTSの語彙所有者であるfill-planに寄せるのが自然なため。

## 優先度

- 順位: 3位 / 5件
- RICEスコア: 20（Reach=4 / Impact=0.5 / Confidence=80% / Effort=0.08人月）
- 根拠: drift防止。56・59と同preview.tsのため直列（56→57→58→59の順で実施）。57の後に実施（同issue-url.ts）。

## BDD受け入れシナリオ

```gherkin
Scenario: ラベルが1箇所から供給される
  Given FillResultの語彙がある
  When 表示側と送信側がラベルを引く
  Then 両者がfill-planの同一対応表を参照する

Scenario: 未知理由のフォールバックが保たれる
  Given 将来追加された理由キーがある
  When ラベルを引く
  Then キー自体が表示され、落ちない
```

## 受け入れ基準

- [x] `FILL_RESULT_LABELS`（名称は同等でも可）が `dom/fill-plan.ts` に公開定数として定義されていること
- [x] preview.tsとissue-url.tsのローカル対応表が削除され、共通定数を参照していること
- [x] 未知キー時のフォールバック（キー表示）が維持されること
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 既存の表示・URL組み立てテストで文言一致を回帰ゲートにする（追加テストは最小限）
- 回帰: `make check` green

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
