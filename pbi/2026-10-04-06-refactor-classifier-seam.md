# PBI: 分類 seam（FieldClassifier）の core 移動

## 優先度

| 項目 | 値 |
|---|---|
| 実行順位 | 6 / 6 |
| RICE スコア | 2.5（Reach 5 × Impact 1 × Confidence 1.0 / Effort 2） |
| 根拠 | seam の配置偏り（adapter モジュール内に interface、合成ロジックが core 外）がコードで確定。adapter は 3 つあり seam は本物 |
| 依存 | PBI 02 の後（`src/analyze.ts` 編集の競合回避）、PBI 05 の後（`src/llm/classifier.ts` の競合回避）。バッチ 3 で実装 |

## ユーザーストーリー

保守担当者として、分類の seam（`FieldClassifier` インターフェース）が adapter のどれかのモジュールに住まず、core に置かれてほしい。ルール+LLM の合成ロジックが core 外に追い出され、分類パイプラインの理解に core → root → llm の往復が要るのをなくしたいから。

## 背景（現状）

- `src/llm/classifier.ts:4`: `FieldClassifier` インターフェース（seam）が Prompt API adapter のモジュール内に定義されている
- adapter は 3 つ: `PromptApiClassifier`（`src/llm/classifier.ts:76`）・`HttpClassifier`（`src/ai/http-classifiers.ts:115`）・`BackgroundClassifier`（`src/llm/background-gateway.ts:61`）
- `src/analyze.ts:5`: ルール+LLM の合成ロジックが src root にあり、llm から interface を import しているため core に置けない
- `tests/analyze.test.ts`: 合成ロジックのテストが tests 直下に置かざるを得ない

## BDD 受け入れシナリオ

```gherkin
Scenario: 分類パイプラインの挙動は変わらない
  Given 既存の分類フロー（ルール → 閾値 → LLM 補助 → refine）がある
  When seam の移動を適用する
  Then 分類結果は現行と同じ（既存テストが無修正で通る）

Scenario: core は純粋性を保つ
  Given `core/classifier.ts` と `core/analyze.ts` が core に置かれる
  When core 配下の import を確認する
  Then DOM・LLM の runtime import は存在しない（interface は型のみ）
```

## 受け入れ基準

- [ ] `FieldClassifier` インターフェースが `src/core/classifier.ts`（仮称・型のみのファイル）に移動する
- [ ] 3 つの adapter（`src/llm/classifier.ts`・`src/ai/http-classifiers.ts`・`src/llm/background-gateway.ts`）と `src/llm/handle-message.ts` が core から interface を import する
- [ ] `src/analyze.ts` が `src/core/analyze.ts` に移動し、core 内の import のみで動く
- [ ] `src/entrypoints/content.ts` の import が更新される
- [ ] `tests/analyze.test.ts` が `tests/core/analyze.test.ts` に移動し green
- [ ] `tests/integration/samples.test.ts` の import が更新される
- [ ] 既存テストが期待値無修正で green（挙動不変の証拠）
- [ ] `npx tsc --noEmit` green

## テスト戦略

- 挙動不変リファクタリング。既存の `tests/analyze.test.ts`（移動のみ）・`tests/integration/samples.test.ts`・`tests/llm/*`・`tests/ai/*` が期待値無修正で green であることを挙動不変の証拠にする。
- 新規テストは不要（移動のみのため）。fixture は `tests/helpers.ts` の `makeMeta` をそのまま使う。

## 見積もり

2 ストーリーポイント

## 技術的考慮事項

- 依存関係: PBI 02 の後（analyze.ts 編集競合）、PBI 05 の後（llm/classifier.ts 競合）
- テスタビリティ: 移動のみ。分類パイプラインのテストが `tests/core/` に集まる
- 非機能要件: なし

## 実装者向け注記

### 実装手順

1. `src/core/classifier.ts`（新規）に interface を置く: `export interface FieldClassifier { classify(fields: FieldMeta[]): Promise<Map<string, Category>>; }`
2. `src/analyze.ts` を `src/core/analyze.ts` に移動（`git mv` は統合側が行う）。import を `./classifier`・`./classify-rules`・`./types` に替える
3. `src/llm/classifier.ts` から interface 定義を削除し、`import type { FieldClassifier } from '../core/classifier'` に替える（`PromptApiClassifier` は残す）
4. `src/ai/http-classifiers.ts`・`src/llm/background-gateway.ts`・`src/llm/handle-message.ts` の import を更新
5. `src/entrypoints/content.ts` の `classifyAll` import を `../core/analyze` に替える
6. `tests/analyze.test.ts` を `tests/core/analyze.test.ts` に移動（git mv は統合側）。`tests/integration/samples.test.ts` の import を更新
7. `npx vitest run tests/` → `npx tsc --noEmit`

### 落とし穴

- interface は型のみ。`PromptApiClassifier`・`SYSTEM_PROMPT`・`buildPrompt`・`parseLlmOutput` は `src/llm/classifier.ts` に残す（実装の移動は別件）
- `src/analyze.ts` の削除漏れに注意（移動後、root にファイルが残ると二重定義になる）
- core への移動は `core/` の純粋性を壊さない（interface は型のみ、`analyze.ts` は core 内 import のみ）

## Definition of Done

- [ ] 上記受け入れ基準をすべて満たす
- [ ] 既存テストが期待値無修正で green（挙動不変の証拠）
- [ ] `npx tsc --noEmit` green
- [ ] コミット済み（refactor: FieldClassifier seam を core に移動）
