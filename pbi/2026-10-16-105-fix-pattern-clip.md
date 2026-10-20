# PBI: pattern属性にscan時の長さ制限を掛ける

## ユーザーストーリー

開発者として、ページ由来文字列の上限規則を1つに揃えたい。現状はlabel/name/idがclip済みなのにpatternだけ無制限でkana述語のdecode+normに入るため。

## 優先度

- 順位: 3位 / 8件
- RICEスコア: 400（Reach=20 / Impact=0.5 / Confidence=80% / Effort=0.02人月）
- 根拠: 1行修正で規則が揃う。依存なし。
- 出典: architecture-review 候補8(Worth exploring)

## BDD受け入れシナリオ

```gherkin
Scenario: 長大なpatternが切り詰められる
  Given 上限超のpattern属性を持つ欄がある
  When 走査する
  Then metaのpatternが上限で切り詰められる

Scenario: 通常のpattern判定が変わらない
  Given 通常長のカナpatternを持つ欄がある
  When 分類する
  Then 従来通りカナ判定される
```

## 受け入れ基準

- [x] scan時にpatternが `MAX_TEXT_LENGTH` で切り詰められる
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 上限境界（200・201文字）の切り詰めを網羅する

## 見積もり

- 0.02人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
