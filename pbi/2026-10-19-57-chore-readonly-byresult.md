# PBI: PartialReportInput.byResultをReadonlyにする

## ユーザーストーリー

開発者として、報告入力の `byResult` が読み取り専用であることを型で固定したい、なぜなら集計は表示・送信で使い回す参照であり、呼び出し側の可変化に抵抗できるため。

## 優先度

- 順位: 2位 / 5件
- RICEスコア: 25（Reach=2 / Impact=0.25 / Confidence=100% / Effort=0.02人月）
- 根拠: 1行変更。58と同ファイルのため直列（57→58の順で先に実施）。

## BDD受け入れシナリオ

```gherkin
Scenario: 呼び出し側が書き換えられない
  Given PartialReportInputを満たす集計がある
  When 報告URLを組み立てる
  Then 入力オブジェクトに書き込みが起きず、同一集計の再利用が安全

Scenario: 既存呼び出しが壊れない
  Given content.tsの呼び出し箇所がある
  When 型をReadonlyに変える
  Then コンパイルが通り、振る舞いが変わらない
```

## 受け入れ基準

- [x] `PartialReportInput.byResult` が `Readonly<Record<string, number>>` であること
- [x] content.tsの `as` キャストが不要になれば除去すること
- [x] 既存テストが緑維持

## テスト戦略

- 型検査: `make typecheck` の緑で確認する（振る舞い不変のため追加テスト不要）
- 回帰: feedback関連テスト一式を緑維持で確認する

## 見積もり

- 0.02人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（型検査の緑で代替可）
- [x] コードレビュー完了
- [x] `make check` が通る
