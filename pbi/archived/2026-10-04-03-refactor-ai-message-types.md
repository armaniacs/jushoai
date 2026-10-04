# PBI: AI 状態・メッセージ語彙の一元化

## 優先度

| 項目 | 値 |
|---|---|
| 実行順位 | 3 / 6 |
| RICE スコア | 3.5（Reach 7 × Impact 1 × Confidence 1.0 / Effort 2） |
| 根拠 | 型 union と実行時配列の手動同期（網羅チェックなし）の drift リスクがコードで確定。const 源への統合で drift がコンパイルエラーになる |
| 依存 | なし（バッチ 1 で並列実装可。PBI 05 が後続で `src/messages.ts` を触るため、本 PBI を先に完了させる） |

## ユーザーストーリー

保守担当者として、AI 状態・プロバイダの語彙が 1 箇所の定義から型と実行時検証の両方に流れてほしい。新しい状態を追加したときに `src/messages.ts` の配列の更新忘れが「未知の状態が検証で落ちる」バグとして後から出るのを防ぎたいから。

## 背景（現状）

- `src/ai/types.ts:1-5`: `AiStatus`（実体は `src/llm/availability.ts:1` の type union）・`CloudStatus`・`ProviderKind` が型として定義
- `src/messages.ts:10-12`: `AI_STATUSES` / `AI_STATES` / `PROVIDER_KINDS` が実行時配列として手動で二重定義され、`src/messages.ts:26-28` の `isAiStatus` / `isAiState` がそれを検証に使う。コンパイル時の網羅チェックはない
- `src/entrypoints/background.ts:24`: `open-options` メッセージが message seam（`src/messages.ts`）を経由せず ad-hoc 文字列判定。送信側は `src/entrypoints/content.ts:40, 114`
- `src/ai/http-classifiers.ts:95`: Gemini エンドポイントのホスト文字列が URL 構築に直書きされ、`src/ai/types.ts:51` の `GEMINI_ORIGIN` と 2 重定義

## BDD 受け入れシナリオ

```gherkin
Scenario: 型に状態を追加したら実行時検証が追従する
  Given AI 状態の語彙が const 配列から型へ派生している
  When 新しい状態を const 配列に追加する
  Then 型も実行時検証も同じ配列から流れるため、検証の更新忘れが起きない

Scenario: 未知の状態は現行どおり拒否される
  Given Service Worker の応答に未知の status 文字列がある
  When parseStatusResponse が検証する
  Then null を返す（既存挙動の維持）

Scenario: open-options が message seam を通る
  Given Content Script が open-options メッセージを送る
  When background が parseRequest で解析する
  Then open-options として認識され、設定ページが開く（既存挙動の維持）
```

## 受け入れ基準

- [x] `AiStatus` が `src/llm/availability.ts` の `AI_STATUSES as const` から派生する
- [x] `CloudStatus` と `ProviderKind` が `src/ai/types.ts` の const 配列から派生する
- [x] `src/messages.ts` の `AI_STATES` が `[...AI_STATUSES, ...CLOUD_STATUSES]` で合成され、手動列挙が消える
- [x] `open-options` が `src/messages.ts` の `AiRequest` union に加わり、`src/entrypoints/background.ts` が `parseRequest` 経由で判定する
- [x] `GEMINI_BASE_URL` が `src/ai/types.ts` に 1 箇所で定義され、`GEMINI_ORIGIN` と `src/ai/http-classifiers.ts` の URL 構築が参照する
- [x] import の向きが ai → llm のまま保たれ、循環 import が生じない
- [x] 既存テストが無修正で green（`tests/messages.test.ts` への open-options ケース追加のみ可）
- [x] `npx tsc --noEmit` green

## テスト戦略

- `tests/messages.test.ts` に `open-options` の parse ケースを追加（単独キーの受理、余分なキーの拒否）。
- fixture 先行: メッセージのずれは `tests/messages.test.ts` に fixture を先に追加して現行挙動を pin してから統合する。
- 既存 `tests/ai/status.test.ts`・`tests/llm/*`・`tests/messages.test.ts` が無修正で green であることを挙動不変の証拠にする。

## 見積もり

2 ストーリーポイント

## 技術的考慮事項

- 依存関係: PBI 05 が後続で `src/messages.ts` を触るため、本 PBI を先に完了させる
- テスタビリティ: messages.ts の純粋関数はモック不要
- 非機能要件: なし

## 実装者向け注記

### 実装手順

1. `src/llm/availability.ts`: `export const AI_STATUSES = ['available', 'downloadable', 'downloading', 'unavailable', 'unsupported'] as const;` を置き、`type AiStatus = (typeof AI_STATUSES)[number];` に派生させる
2. `src/ai/types.ts`: `CLOUD_STATUSES as const`・`PROVIDER_KINDS as const` を置き、`CloudStatus`・`ProviderKind` を派生させる。`GEMINI_BASE_URL` を定義し `GEMINI_ORIGIN = `${GEMINI_BASE_URL}/*`` に派生させる
3. `src/ai/http-classifiers.ts:95` の URL 構築を `GEMINI_BASE_URL` 参照に替える
4. `src/messages.ts`: const を import し、`AI_STATES = [...AI_STATUSES, ...CLOUD_STATUSES]` を合成。`AiRequest` に `| { type: 'open-options' }` を追加し `parseRequest` で受理する
5. `src/entrypoints/background.ts`: `parseRequest(msg)` の結果で `open-options` を判定し、ad-hoc 文字列判定を消す
6. `tests/messages.test.ts` に open-options ケース追加 → `npx vitest run tests/` → `npx tsc --noEmit`

### 落とし穴

- `src/ai/types.ts` が `llm/availability.ts` の `AiStatus` を import する現在の向き（ai → llm）を逆にすると循環する。`AI_STATUSES` の一次は `llm/availability.ts` に置く
- `src/messages.ts:10` の `AI_STATUSES` はローカル const。import に置き換えるとき `isAiStatus` の参照を壊さない
- `handleMessage` の switch に `open-options` の case はない。background.ts が parseRequest 経由で先に処理するため switch 到達時は AI リクエストのみ。到達時の open-options は `undefined` 返却で問題ないことを確認する

## Definition of Done

- [x] 上記受け入れ基準をすべて満たす
- [x] open-options の parse テストが green
- [x] 既存テストが無修正で green（挙動不変の証拠）
- [x] コミット済み（refactor: AI 状態とメッセージ語彙を const 源に一元化）
