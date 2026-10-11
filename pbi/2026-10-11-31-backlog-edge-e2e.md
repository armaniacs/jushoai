# PBI: Edge の実ブラウザ E2E を将来候補にする

状態: 未着手（type: backlog。Chrome E2E の PBI-30 から分離）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、Edge でも入力フローが実ブラウザで検証されてほしい。なぜなら、Edge は対応ブラウザ（Phi-mini の Prompt API 搭載）だから。

## 優先度

- 順位: 2 / 全候補 2 件
- RICEスコア: 10（Reach=40 / Impact=0.5 / Confidence=80% / Effort=2）
- 根拠: Chromium 系で Chrome とエンジン同一のため Impact は小さい。PBI-30 の harness を流用でき Effort=2。今回は実装せず将来候補に残す

## BDD受け入れシナリオ

```gherkin
Scenario: 将来 Edge が必要になったら着手する
  Given Edge 固有の不具合報告か対応ブラウザの変更がある
  When  本 PBI に着手する
  Then  PBI-30 の harness を Edge（msedgedriver）に移植する
```

## 受け入れ基準

- [x] 着手条件が本 PBI に記録されている
- [x] 着手までは Chrome・Firefox の E2E で代用する

## テスト戦略

- 将来 PBI のため対象外

## 見積もり

2pt（要チームでの見積もり）

## Definition of Done

- [x] 着手条件が記録されている
