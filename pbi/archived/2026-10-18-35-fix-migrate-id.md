# PBI: migrateDataの採番idを書き戻す

## ユーザーストーリー

旧形式データの利用者として、再起動のたびに前回選択の復元が初期値に戻らないようにしてほしい、なぜならid無し旧形式データではmigrateDataの採番idが毎回変わり保存された前回選択と突き合わなくなるため。

## 優先度

- 順位: 35位 / 40件
- RICEスコア: 21（Reach=5 / Impact=0.5 / Confidence=50% / Effort=0.06人月）
- 根拠: 旧形式利用者の選択復元ずれをなくす小規模修正。PBI-23・29と同storage.tsのため実装は直列（23の後・29の前）。
- 出典: checking-team Legacy Low＋Data Integrity Medium（同一事象）
- 対象: src/storage.ts:74-94

## BDD受け入れシナリオ

```gherkin
Scenario: 初回loadで採番したidはsaveDataで書き戻されるか決定的に導出される
  Given idを持たない旧形式データが保存されている
  When 初回loadでmigrateDataがidを採番するとき
  Then 採番結果がsaveDataで書き戻されるか、同じ入力から同じidが決定的に導出され、再起動のたびにidが変わらない

Scenario: resolveLastIdのフォールバックが再起動でぶれず固定される
  Given 旧形式データで初回採番が起きた直後の状態である
  When 保存済みの前回選択idでresolveLastIdを解決するとき
  Then 存在しないidへのフォールバックが毎回同じ先に固定され、再起動のたびに初期値復元がぶれない
```

## 受け入れ基準

- [x] id無し旧形式データの初回loadで採番したidがsaveData書き戻しまたは決定的導出で再起動後も一致すること
- [x] resolveLastIdのフォールバック先が再起動のたびに変わらず固定されること
- [x] 既存の正常データ（idあり）のロード振る舞いが変わらないこと
- [x] 変更範囲が対象コード（storage.tsのmigrateData周辺）に収まる
- [x] 既存テストが緑維持

## テスト戦略

- 単体: id無し旧形式のmigrateData採番が再実行でも一致する分岐を網羅する
- 統合: 初回load→保存→再起動loadの一連で前回選択の復元が初期値に戻らないことを確認する
- 回帰: idあり正常データのロードが変わらないことを既存テストで確認する

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認）
