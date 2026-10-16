# PBI: 設定保存・鍵要否まわりの頑健化（既存許可の剥がし・沈黙失敗の是正）

## ユーザーストーリー

AI設定利用者として、失敗した保存操作の巻き戻しで稼働中のAI設定まで道連れにされたくない。また失敗時に何が起きたか沈黙で終わってほしくない。

## 優先度

- 順位: 7位 / 9件
- RICEスコア: 42（Reach=5 / Impact=1 / Confidence=50% / Effort=0.06人月）
- 根拠: 稼働設定の破壊は影響大だが発動条件が狭い。依存なし。
- 出典: adversarial-code-review 保守担当者指摘 `src/ai/settings-save.ts:86-91`（失敗時rollbackが新旧同一originの既存許可まで剥がす）、`src/llm/handle-message.ts:18-19,41-49`（hasKey真＋破損envelopeでthrow伝播→沈黙）、`src/ai/settings-save.ts:90,96`（死んだ二重try/catch・戻り値未参照）

## BDD受け入れシナリオ

```gherkin
Scenario: 失敗した保存が既存の許可を剥がさない
  Given 有効なAI設定と許可が存在する
  When 新しい保存が解決ゲート・永続化で失敗する
  Then 既存の許可・設定は維持されAIは動き続ける

Scenario: 鍵破損時は沈黙せず分かる形になる
  Given 鍵envelopeが破損した状態で分類・テストを求める
  When 要求を実行する
  Then 未知メッセージと区別できる失敗として扱われる
```

## 受け入れ基準

- [x] rollback対象が今回付与分に限定される（既存許可を剥がさない）
- [x] 剥がし失敗が検知可能な形で残る（握り潰しのままにしない）
- [x] 鍵破損時の失敗が沈黙にならない
- [x] 既存テスト（settings-save・handle-message）が緑維持

## テスト戦略

- E2E: 対象外（設定画面の手動確認で代替）
- 統合: 保存失敗→既存設定維持の一連を確認する
- 単体: 新旧origin同一・別・破損envelopeの分岐を網羅する

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
