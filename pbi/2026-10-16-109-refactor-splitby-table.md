# PBI: splitByを方針表駆動化しdropに理由を付ける

## ユーザーストーリー

開発者として、新規分割種の追加を1行で済ませ、分類欠落の原因を追えるようにしたい。現状は薄wrapper2層＋4点理解が必要で、oversizeの黙殺に理由コードがないため。

## 優先度

- 順位: 7位 / 8件
- RICEスコア: 25（Reach=5 / Impact=0.5 / Confidence=50% / Effort=0.1人月）
- 根拠: 将来の追加コスト削減。依存なし。
- 出典: architecture-review 候補7(Speculative)

## BDD受け入れシナリオ

```gherkin
Scenario: 新規種の追加が表1行で済む
  Given 新しい分割種の方針行を追加する
  When 分類する
  Then wrapper追加なしに動作する

Scenario: drop理由が分かる
  Given oversizeのグループがある
  When 分類する
  Then 理由付きで落とされ追跡できる
```

## 受け入れ基準

- [x] 分割方針が表1つになる（薄wrapper2層を消す）
- [x] dropに理由が付く（呼出・記録のいずれかで追跡可能）
- [x] 全既存refineテストが緑維持

## テスト戦略

- E2E: 対象外
- 統合: 分割前後の分類一致を確認する
- 単体: 方針表・drop理由の分岐を網羅する

## 見積もり

- 0.1人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
