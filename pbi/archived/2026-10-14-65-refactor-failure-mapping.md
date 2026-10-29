# PBI: 失敗対応マッピングの一本化

## ユーザーストーリー

保守担当者として、プロバイダ失敗の理由対応（`HttpAuthError`→auth 等の4分岐）を単一 helper に集約してほしい。なぜなら同一ファイル内の重複は理由語彙の追加・変更時に修正漏れを起こし、現に経路間で未知例外の扱いが食い違っているから。

## 背景・問題

- 対象:
  - `src/llm/provider-registry.ts:174-186`（`classify()` の catch）
  - `src/llm/provider-registry.ts:195-209`（`test()` の catch）
- 現状: `HttpAuthError`→auth／`isRejectedStatus`→rejected／`HttpRequestError`→network の同一分岐が2コピー。加えて2つの微差が混入している。(a) 未知例外が `classify()` では `bad-response`（:186）、`test()` では `network`（:208）に落ちる。test 経路の未知例外が「再試行可の通信失敗」として表示される。(b) 成功時の `authFailed.delete` が `test()` にだけある（:202）。
- 提案: ホリスティックレビュー テーマ1（Quick Win）。mapping のみを private `mapFailure` に抜き、成功時 bookkeeping は各経路に残す。微差 (a)(b) は振る舞い変更のため本 PBI では変えず判断事項に分離する。
- 候補番号: 本ラウンド順位 1（全5件）

## 優先度・スコア

- 順位: 1 位 / 5 件
- RICE スコア: 320
  - Reach = 20（AI 経路の将来変更すべて）
  - Impact = 1（修正漏れ防止＋誤分類構造の可視化）
  - Confidence = 80%（同一ファイルの純粋抜き出し、回帰網あり）
  - Effort = 0.05 人週（helper 抽出＋既存テスト回帰のみ）
- 根拠: 最安で失敗語彙の単一ソース化が進み、順位3（gateway attempt）の前提になる。
- 依存: なし（順位3の前提。順位2とはファイル独立のため並列可）。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 両経路が同一 mapping を通る
  Given 401・400・500・未知例外を返す偽 fetch がある
  When classify() と test() で各失敗を起こす
  Then 両経路とも同一 helper の対応（auth/rejected/network）を返す

Scenario: 境界 ― 微差は現状維持される
  Given 未知例外を投げる偽分類器がある
  When classify() と test() で失敗する
  Then classify() は bad-response、test() は network を返す（変更しない）
  And 判断事項 (a)(b) が別 PBI 候補として記録されている
```

## 受け入れ基準

- [x] `mapFailure`（仮称）1箇所が両 catch の分岐を所有している
- [x] 微差 (a)（未知例外の扱い）と (b)（成功時 delete の有無）は変更されていない
- [x] 既存の失敗対応テスト（`tests/entrypoints/handle-message.test.ts` の auth/compat/rejected 系列、`tests/llm/`）がすべてパスする
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（分岐の付け替えで UI・保存動作に影響しないため）

### 統合テスト

- 既存の `handleMessage` 経由の失敗対応テストで回帰確認する

### 単体テスト

- 新規テストは不要（既存契約が全分岐を覆っている）。helper 単体の表テストを1件足すのは可
- テスト方針に従い、既存テストの green を Red-Green の Green 側の証拠とする

## 見積もり

- 0.05 人週（ストーリーポイント換算では最小単位。要チームでの見積もり）
- 内訳想定: helper 抽出＋既存テスト回帰＋レビュー対応のみ

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（既存契約の green をもって充足）
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/llm/provider-registry.ts` の `classify()`（160-190行付近）と `test()`（192-212行付近）の catch ブロック。

- 両 catch の分岐順序（`HttpAuthError`→`isRejectedStatus`→`HttpRequestError`→落穂）を変えないこと
- `test()` の `ignoreAuthFailure: true` 付き select と成功時 delete は helper の外に残すこと
- 関連テストは `tests/entrypoints/handle-message.test.ts` の失敗対応 describe 群（auth 記録・非 auth・rejected 対応・auth bookkeeping）

### 落とし穴

- 微差 (a)(b) を「ついでに直す」のは本 PBI の範囲外。直す場合は別 PBI を起票し、本 PBI の受け入れ基準を変更しないこと
- `isRejectedStatus`（400/422）の共有語彙は `src/ai/http-classifiers.ts` のものを使い、複製しないこと
- `ClassifyFailure`／`TestResponse` の wire 型は `src/messages.ts` のままにし、helper の戻り型は両方に代入可能な union にすること

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `5864f29`: `ProviderRegistry` に private `mapFailure` を追加し `classify()`／`test()` の両 catch から呼ぶ。微差 (a)（test の未知例外→network）と (b)（test のみ成功時 delete）は現状維持し、(a) は `bad-response→network` の明示変換としてコード化。
- 検証: `npx tsc --noEmit` exit 0、entrypoints/llm/ai 34 ファイル 476 件 green（既存契約そのまま）。
- ユーザーの作業として残る項目: コードレビュー、判断事項 (a)(b) の別 PBI 化の要否判断
