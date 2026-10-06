# mountAiSection の抽出

- 種別: refactor
- 優先度: 順位 4/4
- RICE: 2.0（Reach=5 / Impact=1 / Confidence=0.8 / Effort=2）
  - 根拠: 前ラウンドの `main.ts` 分割と同じ形の残存 god クロージャ。抽出単位の設計判断が残るため Confidence 0.8。
- 依存: なし
- 見積もり: 2pt

## ユーザーストーリー

設定画面の保守者として、AI 設定欄の構造変更を責務ごとに行いたい。なぜなら表示・キー入力・保存・接続テストが 1 クロージャに同居しているから。

## 背景

`src/entrypoints/options/ai-section.ts` の `mountAiSection`（`ai-section.ts:33-242`）は単一クロージャに以下が同居している。

- `keyField`（`ai-section.ts:49-68`）: `KEYED` プロバイダ向けのキー入力欄と削除チェックボックスの生成
- `render`（`ai-section.ts:70-156`）: `PROVIDER_OPTIONS` の `select`（`ai-section.ts:79-91`）、`openai` 用 `fieldset`（`ai-section.ts:93-120`）、`gemini` 用 `fieldset`（`ai-section.ts:122-131`）、保存・接続テストボタン（`ai-section.ts:133-144`）、`mountAuditSection` の埋め込み（`ai-section.ts:147-149`）
- `onSave`（`ai-section.ts:158-216`）: `resolveOpenAiToSave`、`needsKeyReentry`、`validateAiSettings`、`requestHostPermission`、`saveAiSettings`、`loadPublicAiSettings` による再読み込み
- `onTest`（`ai-section.ts:218-234`）: `testAiViaBackground` による接続テストと `FAILURE_TEXT`（`ai-section.ts:22-29`）の表示
- 共有ミュータブル状態: `settings` / `hasKey` / `keyInput` / `removeKey` / `savedOpenAi` / `testing` / `notice`（`ai-section.ts:34-41`）

前例として `main.ts` の `buildSelect` / `cardFieldset` 抽出に乗る。`render` 内の provider 分岐と `onSave` / `onTest` の副作用境界を責務ごとに切り出す。

## BDD シナリオ

### 1. 表示 parity

```gherkin
Given provider が `none` / `openai` / `gemini` の保存済み設定
When 設定ページの AI セクションを開く
Then provider 切替・ `fieldset`・キー欄の placeholder・削除チェックボックス・監査セクションの表示が抽出前と同一である
```

### 2. 保存 parity

```gherkin
Given `openai` の `baseUrl` を変更しキー再入力が必要な状態
When 保存ボタンを押す
Then `needsKeyReentry` の警告文が表示され保存されない
And 正しいキーを入力して保存すると `saveAiSettings` が呼ばれ `hasKey` が再読み込みされる
```

### 3. 接続テスト parity

```gherkin
Given 保存済みの設定がある状態
When 接続テストボタンを押す
Then テスト中はボタンが disabled になり `接続テスト中…` が表示される
And 成功時は `接続できました（判定: <category>）。`、失敗時は `FAILURE_TEXT` の対応文が表示される
```

## 受け入れ基準

1. `mountAiSection` から `keyField` / `render` / `onSave` / `onTest` 相当が独立した関数またはモジュールに抽出され、共有状態が引数・戻り値で明示される
2. 抽出前後で DOM 構造・文言・イベント配線が byte-identical（目視差分なし。整形のみの差分を作らない）
3. シークレット扱いを維持する: Content Script と設定ページには保存済みかだけ渡す（キー本体を `mountAiSection` 外やログ・DOM 属性に漏らさない）
4. `openai` の `baseUrl` 変更時の再入力要求・権限プロンプトが `click` の user gesture 内で先に実行される順序を保つ
5. `onTest` の二重実行ガード（`testing` フラグ）と `FAILURE_TEXT` の分岐が parity を保つ
6. 既存テストが green（`make check` の typecheck + test + build が通る）
7. `mountAuditSection` の埋め込み位置・順序が変わらない

## テスト戦略

- 自動: `tests/` に vitest を追加し、抽出単位の表示分岐（provider 別 `fieldset`）、`onSave` の再入力要求分岐、`onTest` の成功・失敗文言分岐の parity を検証する
- 手動: 設定ページの目視（`none` / `openai` / `gemini` 切替、キー保存済み表示、保存・接続テストの文言とボタン状態を確認する）

## DoD

- [x] 受け入れ基準 1-7 をすべて満たす
- [x] `make check` が green である
- [x] 設定ページの目視確認が完了している
