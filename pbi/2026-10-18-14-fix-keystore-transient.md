# PBI: 鍵ストア一時的失敗と認証失敗を分離する

## ユーザーストーリー

AI利用者として、IDB blocked等の一時的失敗で「APIキーが拒否された」と誤表示されないようにしてほしい、有効鍵の削除を誘発しかねないため。

## 優先度

- 順位: 14位 / 20件
- RICEスコア: 200（Reach=20 / Impact=1 / Confidence=80% / Effort=0.08人月）
- 根拠: 破損エンベロープのみを認証失敗とし、IDB blocked・transaction abort等の運用失敗は一時的失敗の語彙で返す。依存なし。
- 出典: checking-team Blue Team Medium、src/llm/handle-message.ts:24-32、src/ai/secret-store.ts:39,49

## BDD受け入れシナリオ

```gherkin
Scenario: 破損エンベロープのみ認証失敗として扱う
  Given 保存済み鍵のエンベロープが破損している状態である
  When ai-classifyまたはai-testが実行される
  Then 認証失敗の語彙（auth）で返し、運用失敗とは区別される

Scenario: ai-status表示で認証失敗と一時的失敗を区別する
  Given IDB blocked等の鍵ストア運用失敗が発生している状態である
  When ai-statusが確認される
  Then 「APIキーが拒否された」と誤表示せず、一時的失敗として区別して表示される
```

## 受け入れ基準

- [x] 形状検査（isEnvelope不適合）のみ認証失敗（auth）として扱う
- [x] IDB blocked・transaction abort等の鍵ストア運用失敗はtransient語彙で返す
- [x] ai-classify・ai-test・ai-statusの語彙が分離されている
- [x] 認証失敗と一時的失敗で表示文言が区別される
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 破損エンベロープはauth、IDB blocked・abortはtransientを返すことを確認する
- 統合: handleMessage経由でai-status・ai-classify・ai-testの語彙分離を確認する
- E2E: 対象外（鍵ストア失敗再現が困難なため単体・統合で担保する）

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
