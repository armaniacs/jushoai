# PBI: 足立学園形の最小 fixture を作る

## ユーザーストーリー
拡張の保守者として、足立学園の申込み形の最小再現がほしい、なぜなら 現物の HTML だけでは分類のずれを示せず、後の修正の回帰網にならないから

## 優先度
- 順位: 1 / 6
- RICEスコア: 600 (Reach=100 / Impact=2 / Confidence=90% / Effort=0.3人週)
- 根拠: 全候補の土台。依存が先。無いと採点も検証もできない

## BDD受け入れシナリオ

```gherkin
Scenario: 走査から計画まで通る
  Given 最小 fixture が samples にある
  When  scan から classifyRulePipeline と buildPlan を通す
  Then  児童と保護者の欄が混ざらずに一覧できる

Scenario: 値は残さない
  Given 保存 HTML には アラキ や 2014/11/11 が残る
  When  fixture を作る
  Then  値は空にし期待値だけを残す
```

## 受け入れ基準
- [x] `samples/` に足立の最小形があり `tests/integration/samples.test.ts` に載る
- [x] `make addurl-check` の未記入が残らない
- [x] `make eval-pin` の行を足し `make eval` が緑
- [x] `make check` が緑

## テスト戦略
- E2E: 追加なし。実ブラウザ確認は別途手でやる
- 統合: samples 経由の scan から plan まで
- 単体: 分類の期待値は core fixture で固定

## 見積もり
0.3人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
```

## 出どころ
- `tmp/adachi/` の保存 HTML と `dig-findings.md` の決定4
- 現状確認: 郵便や住所は直球、氏名や生年月日や塾は要調査
