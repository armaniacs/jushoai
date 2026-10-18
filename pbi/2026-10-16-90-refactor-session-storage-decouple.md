# PBI: session-storage デカップリング（resolveLastId / resolveAddressId の core 移設）

## ユーザーストーリー
開発者として、セッション選択ロジック（`resolveLastId` / `resolveAddressId`）を DOM・Chrome に触れないテスト可能な純粋モジュールに置きたい。なぜなら現状は副作用のない純粋関数が `chrome.storage` 依存モジュール内に同居し、自己記述とモジュールグラフが不一致で、将来 `storage.ts` にトップレベル初期化が入ると巻き添えで壊れるため。

## 優先度
- 順位: 9位 / 12件
- RICE: 40（Reach=5 / Impact=0.5 / Confidence=80% / Effort=0.05人月）
- 根拠: 予防的リファクタで緊急性は低い。依存なし。振る舞い変更なし。
- 事実確認（2026-10-16）:
  - `plans/2026-10-15-2247-review-1014z.md` Low 指摘:「content-session.ts が storage.ts にモジュール連結（トップレベル副作用なしで実害なし）」
  - `src/content-session.ts:9` が `import { resolveAddressId, resolveLastId } from './storage'` で参照
  - `src/storage.ts:15-31` に純粋関数 `resolveLastId` / `resolveAddressId` が `chrome.storage.local` 使用関数（`loadLastUsed` / `saveLastUsed` / `loadData` / `saveData`）と同居。トップレベル副作用はなし（定数 `KEY` / `LAST_KEY` と `fallbackCounter` のみ）

## BDD受け入れシナリオ

```gherkin
Scenario: セッション選択が core 経由で解決される
  Given 保存済みプロファイル一覧と前回選択 ID が存在する
  When content-session が最終選択・住所選択を解決する
  Then 解決結果は従来と同一であり、参照先は core 側の純粋モジュール（例: src/core/selection.ts）である

Scenario: storage にトップレベル初期化が追加されても巻き添えで壊れない
  Given storage.ts が chrome.storage へのトップレベルアクセスを持つようになった（仮定の将来変更）
  When content-session 関連の単体テストを DOM・chrome なしで実行する
  Then content-session のテストは storage の副作用なしに緑を維持する

Scenario: 振る舞い不変（回帰なし）
  Given 移設前後で同一の入力（profiles / addresses / lastProfileId / lastAddressId / preferredId）
  When resolveLastId・resolveAddressId を新旧経路で実行する
  Then 返り値は完全に一致する
```

## 受け入れ基準
- [x] `resolveLastId` / `resolveAddressId` の実体が core 側（例: `src/core/selection.ts`）に存在し、`storage.ts` と `content-session.ts` の両方がそこから参照する（再エクスポートによる互換維持は可、重複実装は不可）
- [x] 振る舞い変更なし（入出力の等価性がテストで担保される）
- [x] `content-session.test.ts` が緑を維持する
- [x] 採用しなかった代替案（移さない場合は `storage.ts` 先頭に「トップレベル副作用禁止」のコメントガードを残す）を採用／不採用の記録として本 PBI に残す（本 PBI は移設案を採用）
- [x] `core/` の純度規律を壊さない（DOM・LLM・chrome への依存を持ち込まない）

## テスト戦略
- 方針: Outside-In ではなく既存緑の維持＋等価性ロック（予防的リファクタのため新規 E2E なし）
- E2E: なし（ユーザー可視の振る舞い変更なし）
- 統合: `content-session.test.ts` の全緑維持（回帰ゲート）
- 単体:
  - 移設先 `selection.ts` に対する `resolveLastId`（一致・不一致・undefined・空配列）の境界値テスト
  - `resolveAddressId`（preferred 共有／プロファイル紐付き／不一致時の先頭フォールバック／空配列で undefined）の分岐テスト
  - 旧 import 経路が残る場合は新実体への委譲であることの等価テスト（重複実装の検出）
- 実行目安: `npx vitest run tests/content-session.test.ts`（該当パスに合わせて調整）＋ `make typecheck`

## 見積もり
- 0.05人月（RICE 前提）。ストーリーポイント換算では 1pt 未満の微小リファクタ（要チームでの最終見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする（回帰シナリオを含む）
- [x] `make typecheck` が緑である
- [x] `content-session.test.ts` が緑である
- [x] コードレビュー完了（core 純度・循環 import なしの確認を含む）
- [x] ドキュメント更新が不要であることの確認済み（必要なら更新済み）
