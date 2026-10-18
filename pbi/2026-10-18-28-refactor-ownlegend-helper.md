# PBI: postal-code/age-decadeの二重実装をownLegendに寄せる

## ユーザーストーリー

開発者として、同じ勾配が2idiomで実装され信頼度調整時に置いていかれるドリフトをなくしたい、なぜなら手書きペアとownLegendヘルパーで同じown優先（0.7/0.65）の勾配が二重に実装されており、将来の信頼度調整時に一方が置いていかれるため。

## 優先度

- 順位: 28位 / 40件
- RICEスコア: 33（Reach=5 / Impact=0.5 / Confidence=80% / Effort=0.06人月）
- 根拠: 同じ勾配の二重実装を単一idiomに寄せる小規模リファクタ。依存なし（PBI-40と同ファイルのため実装は直列）。
- 出典: checking-team Refactoring Medium
- 対象: src/core/classify-rules.ts:175-201（手書きペア）対:93-98（ownLegendヘルパー）

## BDD受け入れシナリオ

```gherkin
Scenario: 条件述語が引数化されown/legendペアがヘルパーに寄る
  Given postal-codeまたはage-decadeのown/legendペアが手書きで実装されている
  When 条件述語を引数化してownLegendヘルパー経由に置き換えたとき
  Then own側0.7・legend側0.65の信頼度勾配が保たれる

Scenario: 4エントリ寄せ後も振る舞いが不変である
  Given postal-codeとage-decadeの計4エントリがownLegendに寄せられている
  When 既存の分類テスト一式を実行したとき
  Then 全テストがグリーンであり分類結果に差分がない
```

## 受け入れ基準

- [x] postal-codeのown/legendペアがownLegendヘルパー経由に寄せられること
- [x] age-decadeのown/legendペアがownLegendヘルパー経由に寄せられること
- [x] own側0.7・legend側0.65の信頼度勾配が変わらないこと
- [x] 追加の条件（FOREIGN_MARK・年代選択肢など）の意味が変わらないこと
- [x] 対象コードがsrc/core/classify-rules.ts:93-201の範囲に収まる

## テスト戦略

- 単体: postal-code・age-decadeのown/legendごとの分類と信頼度が寄せ前後で一致することを確認する
- 回帰: tests/core/の分類テスト一式を実行し差分ゼロを確認する
- 型検査: `make typecheck` でヘルパー引数化後の型エラーを確認する

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
