# PBI: 分類信頼度判定の集約（isConfident 述語）

## 優先度

| 項目 | 値 |
|---|---|
| 実行順位 | 2 / 6 |
| RICE スコア | 6.0（Reach 6 × Impact 1 × Confidence 1.0 / Effort 1） |
| 根拠 | 閾値述語の 3 箇所散在がコードで確定。2 行のヘルパで locality が回復する |
| 依存 | なし（バッチ 1 で並列実装可。PBI 06 が後続で `src/analyze.ts` を移動するため、本 PBI を先に完了させる） |

## ユーザーストーリー

保守担当者として、「ルール分類が閾値以上で信頼できる」判定が 1 箇所に集まってほしい。閾値運用を変えるときに 3 箇所の同時修正を強制され、detect-forms と analyze が静かに乖離するリスクをなくしたいから。

## 背景（現状）

「ルール分類が `ACCEPT_THRESHOLD`（`src/core/classify-rules.ts:3`、0.6）以上で信頼できる」述語が 3 箇所に散在する:

- `src/analyze.ts:13` — `!r.cls || r.cls.confidence < ACCEPT_THRESHOLD`（LLM 送出 pending の抽出）
- `src/analyze.ts:27` — `cls.confidence >= ACCEPT_THRESHOLD`（ルール結果の採用）
- `src/dom/detect-forms.ts:28-31` — `c !== null && c.confidence >= ACCEPT_THRESHOLD`（フォーム判定・anchor 選択）

閾値運用の変更（source 別の信頼度など）が 3 箇所の同時修正を要求する。

## BDD 受け入れシナリオ

```gherkin
Scenario: 閾値以上のルール分類は採用される
  Given 信頼度 0.7 のルール分類結果がある
  When isConfident を判定に使う
  Then true を返す（既存挙動の維持）

Scenario: 閾値未満のルール分類は採用されない
  Given 信頼度 0.5 のルール分類結果がある
  When isConfident を判定に使う
  Then false を返す（既存挙動の維持）
```

挙動不変リファクタリング。既存の fixture・テスト期待値は 1 文字も変えない。

## 受け入れ基準

- [ ] `isConfident`（仮称）が `core/classify-rules.ts` に `ACCEPT_THRESHOLD` の隣に置かれる
- [ ] `src/analyze.ts` と `src/dom/detect-forms.ts` がその述語を使い、閾値比較の散在が消える
- [ ] 既存の `tests/analyze.test.ts`・`tests/dom/detect-forms.test.ts`・`tests/core/classify-rules.test.ts` が無修正で green（挙動不変の証拠）
- [ ] `core/` の純粋性が保たれる（DOM・LLM import の持ち込みなし）
- [ ] `npx tsc --noEmit` green

## テスト戦略

- `tests/core/classify-rules.test.ts` に `isConfident` の単体テストを追加（null / 閾値未満 / 閾値以上）。
- fixture 先行: 分類のずれではなく挙動不変リファクタのため、fixture は pin として機能する（無修正 green が合格条件）。fixture は `tests/helpers.ts` の `makeMeta` を使う。

## 見積もり

1 ストーリーポイント

## 技術的考慮事項

- 依存関係: なし（ただし PBI 06 が `src/analyze.ts` を移動するため、本 PBI を先に完了させる）
- テスタビリティ: core 純粋関数のためモック不要
- 非機能要件: なし

## 実装者向け注記

### 実装手順

1. `src/core/classify-rules.ts` に `export const isConfident = (cls: Classification | null): boolean => cls !== null && cls.confidence >= ACCEPT_THRESHOLD;` を追加
2. `src/analyze.ts:13, 27` と `src/dom/detect-forms.ts:28-31` を差し替え
3. `tests/core/classify-rules.test.ts` に単体テスト追加 → `npx vitest run tests/`

### 落とし穴

- `analyze.ts:13` は pending（否定形）なので `!isConfident(r.cls)` になる。二重否定の読みにくさは残るが、閾値の散在は消える
- 命名は `isConfident` か `accepts` のいずれか。`detect-forms.ts` の用途（フォーム判定の anchor 選択）でも読める名前にする

## Definition of Done

- [ ] 上記受け入れ基準をすべて満たす
- [ ] `isConfident` の単体テストが green
- [ ] 既存テストが無修正で green（挙動不変の証拠）
- [ ] コミット済み（refactor: 分類信頼度判定を isConfident に集約）
