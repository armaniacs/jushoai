# PBI: Prompt API側 trace.response をキャプチャ時点でクリップする

## ユーザーストーリー

開発者・利用者として、PromptApiClassifier.attempt が保持する trace.response を HTTP側と同様にキャプチャ時点でクリップしてほしい。なぜなら attempt オブジェクト生存期間中に無界文字列がメモリに残り、将来 AttemptTrace を消費する処理が増えた際の露出面になるため。

## 優先度

- 順位: 6位 / 12件
- RICE: 67（Reach=5 / Impact=0.5 / Confidence=80% / Effort=0.03人月）
- 根拠: HTTP側との対称化で監査の一貫性が上がる。依存なし
- 出典: plans/2026-10-15-2247-review-1014z.md の Low 指摘「Prompt API 側 trace.response がキャプチャ時に未クリップ（永続ログは clip 済みで有界）」

## BDD受け入れシナリオ

```gherkin
Scenario: Prompt API の生応答が巨大でも trace は有界で保持される
  Given Prompt API のセッションが巨大な生応答文字列を返す状態
  When PromptApiClassifier.attempt で分類を実行する
  Then trace.response は clipAuditResponse 適用後の有界文字列である
  And 分類結果の map はクリップ前と同一である

Scenario: 通常サイズの応答では振る舞いが変わらない
  Given Prompt API が通常サイズの正常な JSON 応答を返す状態
  When PromptApiClassifier.attempt で分類を実行する
  Then 分類結果と監査ログの内容は変更前と同一である
  And trace.response は HTTP側（src/ai/http-classifiers.ts）と同一のクリップ規律で保持される

Scenario: セッション生成失敗時も trace.request の記録規律は維持される
  Given LanguageModel.create が例外を投げる状態
  When PromptApiClassifier.attempt で分類を実行する
  Then 返却値は空 map と error を含み trace.request はプロンプトを保持する
```

## 受け入れ基準

- [x] `src/llm/classifier.ts` の `attempt` 内で `trace.response = raw` をやめ、HTTP側と同様にキャプチャ時点で `clipAuditResponse` を適用すること（事実確認済み: 現状は `classifier.ts:106` が `trace.response = raw`、対照的に `http-classifiers.ts:228` は `trace.response = clipAuditResponse(...)`）
- [x] 監査ログ（永続ログ）の内容は不変であること（既に clip 済みのため）
- [x] 分類結果（`parseLlmOutput` の入力は生応答のまま等、振る舞い変更なし）であること
- [x] 失敗経路（`create()` 失敗時の部分 trace、`fields.length === 0` の早期 return）の形状・規律を変えないこと

## テスト戦略

### 統合テスト

- Prompt API 側 `attempt` が巨大応答に対して有界の `trace.response` を返すこと（HTTP側テストの対称ケースとして追加）

### 単体テスト

- 巨大文字列入力で `trace.response` が `clipAuditResponse` 適用結果と一致すること
- 通常サイズ入力で分類 map が変更前と同一であること（回帰）
- `create()` 失敗時に `trace.request` が保持され `error` が返ること（既存規律の維持）

### E2Eテスト

- なし（分類内部のメモリ有界化であり、UI・永続ログの振る舞い変更がないため）

## 見積もり

- 0.03人月（RICE 算定の Effort より）
- 変更は `attempt` 内の代入1箇所＋テスト追加の最小限に留めること

## Definition of Done

- [x] 上記の受け入れ基準をすべて満たす
- [x] 追加した単体・統合テストがすべて緑である
- [x] `make typecheck` および関連テストスイートが緑である
- [x] 監査ログ内容の不変性が確認されている（振る舞い変更なし）
- [x] 他ファイルへの不要な変更がない（本 PBI の変更は `attempt` 内クリップ＋テストに限定）
