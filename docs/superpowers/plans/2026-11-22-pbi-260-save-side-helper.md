# 実装計画: PBI-260 save-side の保存失敗処理をヘルパーに統合 (2026-11-22)

## 背景と目的

PBI: `pbi/2026-11-21-260-refactor-save-side-persist-helper.md` (RICE 38・DRY/KISS 調査 D2)。src/entrypoints/options/save-side.ts 内の 2 箇所に、保存 + 失敗処理の完全同形ブロックがある:

- 1 箇所目 (~118-123): `await deps.saveData(spec.buildSave(decision.own, other))` → catch → `console.warn('[JushoAI] save failed', e)` + `deps.ui.showError(['保存に失敗しました。容量不足の可能性があります。'])` + `deps.ui.render()` + return
- 2 箇所目 (~183-188): `await deps.saveData({ profiles: decision.profiles, addresses: decision.addresses })` → 同一の catch 後処理 + return

差分は saveData に渡すペイロード構築のみ。共通の「保存 + 失敗時 UI 処理」をローカルヘルパーに括り、文言・警告経路の 2 重更新リスクを消す。

## Global Constraints (全タスクに適用)

1. **挙動不変**: 保存成功・失敗の意味論 (warn / 容量不足文言 / render / return / 成功時の setState と toast) は 1 文字も変えない。既存の保存系 pin (tests/entrypoints 配下の save-side 系テスト) は無変更で緑。
2. **コメント・識別子は英語**・非自明な WHY のみ・タスク ID を書かない。
3. **コミット規約**: Conventional Commits 日本語・ファイル個別 add・push しない。
4. **完了条件**: `make check` 緑。挙動不変のため `make eval` への影響なし (念のため 1 回実行して確認)。
5. 変更許可ファイル: src/entrypoints/options/save-side.ts のみ。

## Task 1: ローカルヘルパー抽出 + 2 箇所置換

1. save-side.ts 内にローカルヘルパー (例: `persistWithUiError`) を追加する。シグネチャは 2 つの呼び出し側の deps 型 (saveOne 系 deps と SaveBothDeps) の両方を構造的に満たす最小形: `saveData` + `ui.showError` + `ui.render` の Pick 系。戻り値は保存成否の boolean (失敗時は UI 処理を実施して false を返し、呼び出し側が return する)
2. 2 箇所の try/catch をヘルパー呼び出しに置換: `if (!(await persistWithUiError(payload, deps))) return;` — ペイロード構築 (spec.buildSave(...) / 直接オブジェクト) は呼び出し側に残す
3. 完了判定: `grep -c "保存に失敗しました" src/entrypoints/options/save-side.ts` が 1 件 (ヘルパー定義点のみ)
4. focused vitest (tests/entrypoints 配下の save-side 系) 緑 → make check → 念のため make eval

## 完了後 (controller 実施)

- make check + make eval
- PBI-260 の受け入れ基準更新 + 実装記録 + アーカイブ + INDEX 更新
- graphify update
- 単一タスクの機械的リファクタのため、タスクレビューを最終ゲートとして兼ねる
