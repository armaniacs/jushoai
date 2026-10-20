# PBI: 適用後の表示決定をsessionの戻り値に含める

## ユーザーストーリー

開発者として、適用順序と表示合成のバグを1 Moduleで直せるようにしたい。現状は順序知識がcontent.tsのclosureにあり、新規entrypointが踏襲できないため。

## 優先度

- 順位: 5位 / 8件
- RICEスコア: 75（Reach=30 / Impact=0.5 / Confidence=50% / Effort=0.1人月）
- 根拠: 順序バグの局所化。PBI-103の後に実施（表示判定の置き場所が決まってから）。
- 出典: architecture-review 候補4(Worth exploring)

## BDD受け入れシナリオ

```gherkin
Scenario: sessionが表示決定を返す
  Given 部分適用のsummaryとAI失敗理由がある
  When applyする
  Then 合成済みの表示決定が返り、呼出側に合成式が残らない

Scenario: 全適用時は沈黙する
  Given 真失敗のない適用がある
  When applyする
  Then 表示決定は沈黙（パネルを閉じる指示のみ）になる
```

## 受け入れ基準

- [x] `session.apply` の戻りに表示決定が含まれる
- [x] onApply側の手合成（summary＋failureReason）が消える
- [x] session肥大化を避け表示決定の範囲に留める
- [x] 既存テストが緑維持

## テスト戦略

- E2E: 実ブラウザ相当で部分適用時の表示を確認する
- 統合: apply→表示の一連を確認する
- 単体: 表示決定の分岐（全適用・部分・AI失敗重なり）を網羅する

## 見積もり

- 0.1人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
