# PBI: オーバーレイパネルの相互排他（プレビューと AI ガイドの重なり解消）

## 優先度

| 項目 | 値 |
|---|---|
| 実行順位 | 1 / 6 |
| RICE スコア | 12.0（Reach 6 × Impact 2 × Confidence 1.0 / Effort 1） |
| 根拠 | 実害（2 パネルの完全重なり・単一 Escape で両方閉じる）がコードで確定。修正は 2 箇所のみ |
| 依存 | なし（バッチ 1 で並列実装可。PBI 04 の overlay 抽出と担当ファイルが非重複） |

## ユーザーストーリー

フォーム入力者として、入力プレビューと AI 状態ガイドが同じ位置に重なって表示されないことがほしい。重なるとどちらも読めず、Escape を押すと両方消えてしまうから。

## 背景（現状）

- プレビューと AI ガイドはどちらも `position: fixed; top: 16px; right: 16px` の Shadow DOM パネル（`src/ui/preview.ts:58-60`、`src/ui/ai-guide.ts:143-145`）で、両方 `z-index: 2147483647`（`src/ui/host.ts:5`）。
- `src/entrypoints/content.ts:74` はプレビューを開く前に `openPreview?.close()` のみ、バッジ押下ハンドラ（`src/entrypoints/content.ts:106-108`）は `openGuide?.close()` のみを閉じる。
- そのため、プレビュー表示中にバッジを押すとガイドがプレビューの上に重なって開く。Escape は 2 つの document レベル capture リスナー（`src/ui/preview.ts:130-137`、`src/ui/ai-guide.ts:178-190`）が両方反応し、1 回の Escape で両方閉じる。

## BDD 受け入れシナリオ

```gherkin
Scenario: プレビュー表示中に AI バッジを押す
  Given フォームで「入力する」を押してプレビューが開いている
  When 同じフォーム（または別フォーム）の AI バッジを押す
  Then プレビューは閉じられる
  And AI ガイドだけが表示される

Scenario: AI ガイド表示中に「入力する」を押す
  Given AI バッジを押してガイドが開いている
  When ボタンの「JushoAI で入力」を押す
  Then ガイドは閉じられる
  And プレビューだけが表示される

Scenario: 同種のパネルの切替は現行どおり
  Given 別フォーム A でガイドが開いている
  When フォーム B のバッジを押す
  Then フォーム A のガイドは閉じられ、フォーム B のガイドが開く
```

## 受け入れ基準

- [ ] バッジ押下のハンドラで `openPreview?.close()` と `openPreview = null` を行う
- [ ] プレビュー表示（`run()`）の前に `openGuide?.close()` と `openGuide = null` を行う
- [ ] 同種パネル間の切替（複数フォームのバッジ → ガイド、複数ボタン → プレビュー）は現行どおり
- [ ] プロファイル値・API キー・`validateBaseUrl` に触れない（プライバシー保証の維持）
- [ ] `npx tsc --noEmit` と既存テストが green

## テスト戦略

- content.ts は既存慣行どおり wiring 未テスト（tests/entrypoints は handle-message のみ）。本修正は 2 箇所の wiring 変更のため新規ハーネスは作らない。
- 回帰確認: `npx vitest run tests/ui`。
- ページ上の挙動（重なり解消）は `samples/` のサンプルフォームで手動確認（DoD の手動確認手順）。

## 見積もり

1 ストーリーポイント

## 技術的考慮事項

- 依存関係: なし
- テスタビリティ: entrypoint wiring のため既存の自動テスト対象外。手動確認は samples/。
- 非機能要件: なし

## 実装者向け注記

### 実装手順

1. `src/entrypoints/content.ts` のバッジ押下ハンドラ（`sync()` 内 `mountButton` の onBadgeClick）に `openPreview?.close(); openPreview = null;` を追加
2. `run()` の `openPreview?.close();` の隣に `openGuide?.close(); openGuide = null;` を追加
3. `npx tsc --noEmit` → `npx vitest run tests/ui`

### 落とし穴

- 閉じたら必ず `null` を代入する。参照残しだと close 済みパネルへの二重 close になる（ai-guide の close は冪等だが、`content.ts:86-91` の onApply/onCancel ですでにある null 代入の慣行に合わせる）

## Definition of Done

- [ ] 上記受け入れ基準をすべて満たす
- [ ] `npx tsc --noEmit` green
- [ ] `npx vitest run tests/ui` green（回帰なし）
- [ ] 挙動変更のため、samples/ での手動確認手順を本 PBI に記載済み（プレビューを開いた状態でバッジ → ガイドのみ表示、逆も同様）
- [ ] コミット済み（fix: プレビューと AI ガイドの相互排他）
