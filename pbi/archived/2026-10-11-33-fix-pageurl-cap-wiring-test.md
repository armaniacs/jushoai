# PBI: 監査入口の pageUrl 制限を統合テストで固定する

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #2 から起票）
起票日: 2026-10-11
親: `archived/2026-10-11-32-fix-audit-pageurl-cap.md`

## ユーザーストーリー

保守担当者として、監査入口での pageUrl 制限の配線が退行しないでほしい。なぜなら、単体テストは関数単位で、`handle-message.ts` での適用が外れても検出できないから。

## 優先度

- 順位: 1 / 全候補 4 件
- RICEスコア: 40（Reach=40 / Impact=0.5 / Confidence=100% / Effort=0.5）
- 根拠: 配線退行の守備。既存の `tests/entrypoints/handle-message.test.ts` の流儀に合わせる

## BDD受け入れシナリオ

```gherkin
Scenario: 長い pageUrl での分類が制限後の値で記録される
  Given UTF-8 で 1024 バイトを超える pageUrl での分類要求がある
  When  分類を実行する
  Then  記録される pageUrl は 1024 バイト以内である

Scenario: 既存の振る舞いは変わらない
  Given 通常長の pageUrl での分類要求がある
  When  分類を実行する
  Then  記録される pageUrl は変わらない
```

## 受け入れ基準

- [x] 長い pageUrl での `ai-classify` が制限後の pageUrl で記録されるテストが追加されている
- [x] `make check` が通る

## テスト戦略

- 統合: `tests/entrypoints/handle-message.test.ts` に監査記録の fake を使った突合せを追加する

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [x] コードレビュー完了
