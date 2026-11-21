# PBI: 60件打ち切りを無信号にしない

## ユーザーストーリー

利用者として、61件目以降が黙って消えるのではなく打ち切りと分かるようにしてほしい、なぜならプレビューが信頼のアンカーであり黙って欠けると誤入力の元になるため。

## 優先度

- 順位: 25位 / 40件
- RICEスコア: 50（Reach=5 / Impact=1 / Confidence=80% / Effort=0.08人月）
- 根拠: 61件目以降の黙殺をなくし打ち切りを可視化してプレビューの信頼を守る。依存なし（PBI-33と同ファイルのため実装は直列）。
- 出典: checking-team System Architect Medium
- 対象: src/llm/background-gateway.ts:65（MAX_CLASSIFY_TOTAL、slice、failureReasonなし）

## BDD受け入れシナリオ

```gherkin
Scenario: 61件以上の入力で打ち切りが信号として返る
  Given 61件以上のフィールドがある
  When BackgroundClassifier.attemptを実行する
  Then 先頭60件だけが分類され、truncated語彙または件数付きで打ち切りがattempt結果に載りfailureReason経路に乗る

Scenario: 60件以内では打ち切り信号が出ない
  Given 60件以内のフィールドがある
  When BackgroundClassifier.attemptを実行する
  Then 打ち切り信号は出ず、既存のfailureReasonの振る舞いが変わらない
```

## 受け入れ基準

- [x] 61件目以降がsliceで落とされる場合に打ち切りがattempt結果に載る（truncated語彙または件数付き）
- [x] 打ち切り信号が既存のfailureReason経路に乗り、呼び出し元・UIに伝わる
- [x] 60件以内では打ち切り信号が出ず、既存の分類結果・failureReasonが変わらない
- [x] 変更範囲が対象コード（background-gateway.tsのMAX_CLASSIFY_TOTAL周辺とfailureReason周辺）に収まる
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 61件入力での打ち切り信号と60件以内での無信号の分岐を網羅する
- 統合: 61件超のフォーム→分類→プレビュー表示の一連で打ち切り表示が出ることを確認する
- 回帰: 既存のfailureReason（network/bad-response等）の振る舞いが変わらないことを既存テストで確認する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
