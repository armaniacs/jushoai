# fix: 失敗理由の可視化（guardedRun一括reloadの分類）

- 種別: fix
- 優先度: 順位 1/6
- RICE: 12.0（Reach=6 / Impact=2 / Confidence=1.0 / Effort=1）
  - 根拠: 分類・注入の失敗全てが「ページを再読み込み」に潰れ、原因特定が遅れる実害の解消
  - 依存: なし（後続の NN 20 が本 PBI の境界に乗る）
- 見積もり: 1pt

## ユーザーストーリー

拡張機能の利用者として、失敗時に次の一手が分かる表示がほしい。なぜなら全ての失敗が再読み込み指示に潰れて、分類失敗と `context invalidated` の区別が付かないから。

## 背景

現状は下記 2 箇所で失敗理由が落とされている。

- `src/entrypoints/content.ts:27-40`: `guardedRun` が `catch {` で全例外を捕捉し、原因を問わず `button.showError('エラー: ページを再読み込み')` を表示する（`src/entrypoints/content.ts:33-35`）。
- `src/llm/handle-message.ts:153-165`: `ai-classify` の `selectClassifier` 失敗時（`src/llm/handle-message.ts:158` の `if (!sel.ok) return { ok: false };`）および `classify` 例外時（`src/llm/handle-message.ts:161-163`）が理由を落として `{ ok: false }` を返す。`authFailed` への記録（`src/llm/handle-message.ts:162`）は行うが、呼び出し側に `reason` を返さない。

このため分類失敗・ネットワーク失敗・`context invalidated` が UI 上で区別できない。

## BDDシナリオ

### 1. `context invalidated` 時は再読み込み案内

- Given `chrome.runtime` が無効化され `Extension context invalidated` が送出される状態
- When 利用者が補完ボタンを押下する
- Then `再読み込み` を促す表示が出る

### 2. 分類失敗時は分類失敗の旨と再試行の案内

- Given AI 分類が `network` / `bad-response` 等で失敗し、ルール分類のみで続行できない状態
- When 利用者が補完ボタンを押下する
- Then `分類に失敗した` 旨と再試行の案内が表示され、再読み込み指示にはならない

### 3. `reason` 付き応答の伝達

- Given `ai-classify` が失敗する状態
- When `content.ts` が background に分類を要求する
- Then background は `{ ok: false }` ではなく `reason` 付きで応答し、`content.ts` は `reason` に応じた表示を選択する

## 受け入れ基準

1. `context invalidated` 時は従来どおり再読み込み案内が表示されること
2. 分類失敗時は分類失敗の旨と再試行の案内が表示され、再読み込み指示と区別できること
3. 成功時の挙動（分類 → プレビュー → 注入）が不変であること
4. 既存テストが green を維持すること（`make check` の typecheck + test + build が通ること）
5. プロファイルの値が LLM 送信対象に含まれない制約が維持されること

## テスト戦略

- 自動: `vitest` を `tests/` 配下（`tests/llm/` の `handle-message` 系、`tests/dom/` または `tests/core/` の該当ディレクトリ）に配置し、上記 BDD の分岐（`reason` 伝達・表示選択）を再現する
- 手動: `samples/` のサンプルフォームで目視確認する（正常系の表示不変、分類失敗時の表示、`context invalidated` 再現時の再読み込み案内）

## DoD

- [ ] 全BDDパス
- [ ] レビュー完了
- [ ] ドキュメント更新
