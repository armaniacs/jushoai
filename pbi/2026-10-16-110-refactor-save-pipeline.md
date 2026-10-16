# PBI: 保存パイプラインをgesture/確定の2段階に分けrollbackを返す

## ユーザーストーリー

開発者として、gesture順序の破壊を型で防ぎ、rollback有無を検査できるようにしたい。現状はawaitの並びが仕様で、rollback成否はwarn止まりのため。

## 優先度

- 順位: 8位 / 8件
- RICEスコア: 21（Reach=5 / Impact=0.5 / Confidence=50% / Effort=0.12人月）
- 根拠: 将来の保存UIの安全。依存なし。
- 出典: architecture-review 候補6(Worth exploring)

## BDD受け入れシナリオ

```gherkin
Scenario: 順序が型で強制される
  Given 確定段階だけを呼ぼうとする
  When 型検査する
  Then gesture段階の token なしでは通らない

Scenario: rollback有無が戻り値で分かる
  Given 失敗した保存がある
  When 結果を見る
  Then rollbackの有無が含まれている
```

## 受け入れ基準

- [x] gesture段階と確定段階が2関数になる
- [x] `PermissionGrant` 相当の token が順序を強制する
- [x] `SaveResult` に `rolledBack` 相当が含まれる
- [x] 既存テスト・呼出（ai-section）が緑維持

## テスト戦略

- E2E: 対象外
- 統合: 付与→失敗→剥がしの一連を確認する
- 単体: token有無・rollback有無の分岐を網羅する

## 見積もり

- 0.12人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
