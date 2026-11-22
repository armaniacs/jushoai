# 実装計画: PBI-259 isRecord 5 重定義を共有ガードに統合 (2026-11-22)

## 背景と目的

PBI: `pbi/2026-11-21-259-refactor-is-record-shared-guard.md` (RICE 95・DRY/KISS 調査 D1)。parse 境界の「unknown を Record に狭める」ガードが 5 ファイルにバイト単位で同一定義されている:

- src/messages.ts:103
- src/ai/settings.ts:7
- src/ai/settings-store.ts:17
- src/ai/audit-log.ts:168
- src/ai/first-dial.ts:27

すべて `typeof v === 'object' && v !== null && !Array.isArray(v)` の完全一致 (2026-11-21 実測)。共有ガードに統合し、parse 境界の意味論を単一所有にする。

## Global Constraints (全タスクに適用)

1. **挙動不変**: ガードの判定結果 (平オブジェクト ✓ / 配列 ✗ / null ✗ / プリミティブ ✗) は置換前後で同一。wire 形式・分類・保存の意味論に触れない。
2. **コメント・識別子は英語**・非自明な WHY のみ・タスク ID を書かない。
3. **コミット規約**: Conventional Commits 日本語・ファイル個別 add・push しない。
4. **完了条件**: `make check` 緑 + focused vitest (messages・ai 系) 緑。
5. 変更許可ファイル: src/core/types.ts (共有ガード追加) / 上記 5 ファイル / 新規 tests/core/types.test.ts (または実装者が tests/core の既存慣行に合わせて選択)。

## Task 1: 共有ガード追加 + 5 箇所置換 + ガード単体テスト

1. src/core/types.ts に `export function isRecordValue(v: unknown): v is Record<string, unknown>` を追加 (CATEGORIES という値が既に同居するため types.ts でも値の export は慣行どおり。types.ts の肥大化が気になる場合は薄い core/guards.ts を選び、判断を report に記録)
2. 5 ファイルのローカル `isRecord` 定義を削除し import に置換。呼び出し箇所が多いファイルは `const isRecord = isRecordValue;` のローカル別名 1 行を許容 (呼び出し面 diff の最小化)
3. 共有ガードの単体テスト 4 件を追加 (平オブジェクト ✓ / 配列 ✗ / null ✗ / プリミティブ ✗)
4. focused vitest (tests/messages.test.ts + tests/ai 配下の settings・audit-log・first-dial 系) 緑 → make check

## 完了後 (controller 実施)

- make check + make eval
- PBI-259 の受け入れ基準更新 + 実装記録 + アーカイブ + INDEX 更新
- graphify update
- 単一タスクの機械的リファクタのため、タスクレビューを最終ゲートとして兼ねる (レビュアーに全ブランチ観点も依頼)
