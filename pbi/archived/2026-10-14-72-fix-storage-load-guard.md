# PBI: storage 読込境界の検証（migrateData の型ガード）

## ユーザーストーリー

保守担当者として、storage 読込時の未知形状データを欄型ごとに検証してほしい。なぜなら手編集・破損・旧バージョン由来の誤型値が現状素通りで state に入り、そのまま入力欄に注入されるから。

## 背景・問題

- 対象:
  - `src/storage.ts:74-96`（`migrateData`／`loadData`）
- 現状: `result[KEY] as LegacyStoredData | undefined`（:96）と `(stored?.addresses ?? []) as Partial<Address>[]`（:85）でキャストした未知形状をスプレッドする（:78-90）。誤型値（例：`lastName: 42`）が state に残り、`buildPlan`→`fillField` に流れる。保存時には `validateProfile` がかかるが、読込時にはかからない。一方 `settings-store.ts:19-29`（`as unknown`→`isRecord`→`isEnvelope`→`normalize`）、`exclusions-store.ts`（parse 検証）、監査ログ（`isEntry`）は検証済みで、境界対応に asymmetry がある。コードベース自身が手編集ストレージを脅威モデルに入れている（`exclusions-store.ts:5-6`）。
- 提案: 型監査所見 #1。欄型ごとの `text()` ガードで誤型を既定値に落とすか、`validateProfile`／`validateAddress` で濾過する（壊れたエントリ全体の扱いは判断事項に分離）。
- 候補番号: 本ラウンド順位 2（全4件）

## 優先度・スコア

- 順位: 2 位 / 4 件
- RICE スコア: 40
  - Reach = 5（破損・手編集ストレージの利用者）
  - Impact = 1（誤型値の注入防止。データ integrity）
  - Confidence = 80%（境界は特定済み、migration テストあり）
  - Effort = 0.1 人週（ガード追加＋migration テスト）
- 根拠: 同点帯ではリスク軽減効果を優先し順位3より先。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 誤型欄は既定値に落ちる
  Given lastName が数値の破損プロファイルを含む保存データがある
  When loadData で読み込む
  Then 当該欄は既定値（空文字）になり、他欄は保持される

Scenario: 境界 ― 壊れたエントリ全体の扱い
  Given profile 構造自体が配列等の異形の保存データがある
  When loadData で読み込む
  Then 拡張機能の起動を妨げず、空リスト扱いまたは既定エントリになる
```

## 受け入れ基準

- [x] `migrateData` が string 欄の誤型値を既定値に落とす（数値・配列・オブジェクトの混入なし）
- [x] 異形エントリ全体でも例外を投げず起動を妨げない
- [x] 正常データの migration 結果が変わっていない（既存テスト green）
- [x] 壊れたエントリ全体の扱い（落とす／既定化）が判断事項として記録されている
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（読込境界の純粋化のため）

### 統合テスト

- 不要（`chrome.storage` 連携挙動は不変のため）

### 単体テスト

- 誤型欄（数値・配列・null）の migration テストを追加する
- 異形エントリ全体のテストを追加する
- 既存の migration テストで回帰確認する
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.1 人週（ストーリーポイント換算では小。要チームでの見積もり）
- 内訳想定: ガード追加＋単体テスト＋レビュー対応

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/storage.ts` の `migrateData`（74-92行）と `loadData`（94-97行）。

- `LegacyStoredData` 型の `Partial<Profile>`／`Partial<Address>` はキャスト由来のため、スプレッド前に欄型を絞ること
- `p.id || newId()`／`p.label || ...` の既存フォールバックは維持すること
- `profileIds` による dangling profileId の共有化（:89）は維持すること
- 関連テストは `tests/` の storage・migration 系（`storage`、`migrateData` で検索）

### 落とし穴

- `...p` のスプレッドは未知キーも運ぶ。欄ホワイトリスト化までは本 PBI の範囲外とし、誤型値の既定化に留めること（拡大は別 PBI 化）
- `isReady` の判定（:103-104）に影響しないこと。空リスト扱いの変更は `isReady`→設定誘導フローに波及するため、判断事項として記録すること

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `3bf2735`: `migrateData` に `isObject`＋`coerceStrings` を導入。誤型 string 欄はテンプレート既定値に、非オブジェクトエントリは破棄、非配列コンテナは空扱いに。`id`／`label` フォールバックと dangling 共有化は維持。
- 検証: TDD の Red（新規2件の失敗）→Green。`npx tsc --noEmit` exit 0、`tests/storage.test.ts` 21 件 green。
- 判断事項の記録: 壊れたエントリ全体は破棄扱いにした（空リスト→`isReady` 不成立→設定誘導）。キー whitelist 化は別 PBI 化せず見送り（現状の判断で完結）。
- ユーザーの作業として残る項目: コードレビュー
