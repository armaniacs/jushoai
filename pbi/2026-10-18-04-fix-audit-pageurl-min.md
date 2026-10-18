# PBI: 監査ログのpageUrlをorigin最小化する

## ユーザーストーリー

利用者として、監査ログ・TSVにページのフルパスを残さないでほしい、パス内トークンが7日平文＋TSV添付で流出しかねないため。

## 優先度

- 順位: 4位 / 20件
- RICEスコア: 600（Reach=30 / Impact=2 / Confidence=80% / Effort=0.08人月）
- 根拠: パス内トークン流出の根絶。依存なし。
- 出典: checking-team Red Team Medium、src/llm/provider-registry.ts:191、src/ai/audit-log.ts:13-21

## BDD受け入れシナリオ

```gherkin
Scenario: 監査エントリのpageUrlがoriginのみになる
  Given 分類リクエストのpageUrlがパス・クエリ付きURLである
  When 監査エントリを記録する
  Then pageUrlにはoriginのみが残り、パス・クエリ・fragmentが含まれない

Scenario: host列との重複排除と既存エントリ互換
  Given host列が既にoriginのhost部を保持している
  When pageUrlをoriginに丸めたエントリをTSV化・表示する
  Then host列とpageUrlの重複が排除され、既存のフルパス入りエントリも読み込み・表示できる
```

## 受け入れ基準

- [x] 監査エントリのpageUrlにoriginのみが記録される（パス・クエリ・fragmentを含まない）
- [x] TSVのpage_url列が丸め後のoriginで出力される
- [x] host列との重複表示が排除される
- [x] 既存監査テストの期待値がorigin丸めに更新される
- [x] 7日保持（AUDIT_RETENTION_MS）は維持される

## テスト戦略

- 単体: origin丸め・不正URL時のフォールバック・既存エントリ互換の分岐を網羅する
- 統合: 記録→一覧→TSV出力の一連でpage_urlがoriginのみになることを確認する
- E2E: 実ブラウザ相当で監査ログ表示とTSV添付内容を確認する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
