# PBI: プロバイダ耐性の向上（auth自己ロック・compat恒久化・再起動喪失）

## ユーザーストーリー

クラウドAI利用者として、一時的な401誤爆や壊れた応答一発で分類が止まり続け、手動の接続テストまで回復しない状態をなくしたい。

## 優先度

- 順位: 8位 / 9件
- RICEスコア: 40（Reach=5 / Impact=1 / Confidence=80% / Effort=0.1人月）
- 根拠: 可用性の自己ロック解消。依存なし。
- 出典: adversarial-code-review ハッカー視点 `src/llm/provider-registry.ts:190-192,133`（反証でMINOR SURVIVES確定。解除経路 `test():199,204`・`invalidate():66-69` あり）＋保守担当者指摘 `src/ai/http-classifiers.ts:213`（parse失敗でもcompat恒久化）、`provider-registry.ts:66-69`＋`background.ts:22-23,42-47`（SW再起動で喪失）

## BDD受け入れシナリオ

```gherkin
Scenario: 一時的401の後に分類が自力回復できる
  Given 一度401を返したプロバイダがある
  When その後の分類が成功条件を満たす
  Then 手動操作なしで回復する（または回復手順が明示される）

Scenario: 壊れた応答一発で恒久ダウングレードしない
  Given 後段parse失敗の応答が一度返る
  When 次のリクエストを実行する
  Then 劣化モードに固定されず再評価される
```

## 受け入れ基準

- [x] auth失敗後の分類が自力回復可能または回復導線が明示される
- [x] compat記録が成功確定（ok＋parse成功）時のみ行われる
- [x] 再起動時の再学習コストが文書化または軽減される
- [x] 既存テスト（http-classifiers・handle-message・provider-registry相当）が緑維持

## テスト戦略

- E2E: 対象外（単体・統合で代替）
- 統合: 401→成功・壊応答→成功の一連を確認する
- 単体: auth/compat/再起動相当の状態遷移を網羅する

## 見積もり

- 0.1人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
