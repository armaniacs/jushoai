# PBI: auth失敗記憶をAuthBlockに切り出す

## ユーザーストーリー

開発者として、再試行方針の変更を1箇所で済ませたい。現状はSet×2と私設Mapの二重容器で、外部seedは期限切れ対象外という二重規則があるため。

## 優先度

- 順位: 6位 / 8件
- RICEスコア: 50（Reach=5 / Impact=1 / Confidence=80% / Effort=0.08人月）
- 根拠: 方針の局所化と時間固定テスト。依存なし。
- 出典: architecture-review 候補5(Worth exploring)

## BDD受け入れシナリオ

```gherkin
Scenario: 期限切れが一呼びで判定される
  Given 記録済みの失敗と進んだ時計がある
  When 問う
  Then ブロック解除が一呼びで決まる

Scenario: 時刻注入で検査できる
  Given 固定時計を注入する
  When 期限前後で問う
  Then Date操作なしに振る舞いを検証できる
```

## 受け入れ基準

- [x] `block/isBlocked/clear` 相当の小Moduleになる
- [x] 時計が `now` 注入になる
- [x] 外部seedと自記録の扱いが型または文書で区別される
- [x] 既存テストが緑維持

## テスト戦略

- E2E: 対象外
- 統合: 401→期限→再送の一連を確認する
- 単体: 期限前後・seed・自記録の分岐を網羅する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
