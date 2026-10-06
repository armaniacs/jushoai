# PBI-19: 設定画面のselect生成3兄弟の集約

- 種別: refactor
- 優先度: 順位 3/6
- RICE: 5.0（Reach=5 / Impact=1 / Confidence=1.0 / Effort=1）
  - 根拠: オプション追加時の3箇所同時変更の波及コスト削減
  - 依存: なし（後続の NN 22 が本 PBI の helper に乗るため 22 より先行）
- 見積もり: 1pt

## ユーザーストーリー

設定画面の保守者として、選択肢の追加を1箇所で済ませたい。なぜなら都道府県・性別・紐付けの3 select が同じ生成パターンの並列実装で修正漏れの温床だから。

## 背景

`src/entrypoints/options/main.ts` の以下3関数が select 生成・option 追加・change 監視の同一パターンを繰り返している。

- `src/entrypoints/options/main.ts:47-58`: `prefectureSelect(value, onChange)` — `['', ...PREFECTURES]` を走査し、`option` の `value` / `textContent` / `selected` を設定して `select.append(o)`、空文字は `'選択してください'` を表示、`change` で `onChange(select.value)` を発火。
- `src/entrypoints/options/main.ts:60-71`: `genderSelect(value, onChange)` — `['', ...GENDERS]` を走査し、同様に生成。空文字の表示だけ `'選択してください（任意）'` が異なる。
- `src/entrypoints/options/main.ts:73-89`: `ownerSelect(value, onChange)` — 先頭に `value=''` の共通 option（`'共通（どのプロファイルでも使う）'`）を追加後、`state.profiles` を走査して `p.id` / `p.label || プロファイル ${i + 1}` の option を追加、`change` で `onChange(select.value)` を発火。

3兄弟はいずれも `document.createElement('select')` → ループで `document.createElement('option')` → `select.append` → `select.addEventListener('change', ...)` の同一手順であり、placeholder 文言と option リストの作り方だけが違う。

## BDDシナリオ

### Scenario 1: 既存3 select の表示 parity

- Given 設定ページを開いている
- When 都道府県・性別・紐付けの各 select を表示する
- Then リファクタ前後で option の順序・`value`・表示文言・初期選択が同一である

### Scenario 2: 選択変更の挙動 parity

- Given 設定ページでいずれかの select の値を変更する
- When `change` イベントが発火する
- Then 対応する `onChange(select.value)` がリファクタ前と同じ値で1回だけ呼ばれる

### Scenario 3: 選択肢追加が1箇所で済む

- Given 共通 helper に集約されている
- When 新しい選択肢（例: 性別の選択肢）を追加する
- Then helper の呼び出し側のデータ定義だけを変更すればよく、3兄弟の重複箇所を同時編集する必要がない

## 受け入れ基準

1. `prefectureSelect` / `genderSelect` / `ownerSelect` が単一の helper（例: `buildSelect`）に集約され、重複した生成ループが存在しないこと。
2. 挙動不変（byte-identical の規律）: 生成される DOM の option 順序・`value`・`textContent`・`selected` 初期状態、`change` 時のコールバック値・回数がリファクタ前と同一であること。
3. parity テスト先行: 実装前に既存3 select の表示・選択挙動を固定する parity テストを追加し、リファクタ前は green、helper 置換後も green であること。
4. `core/` に DOM 依存を持ち込まないこと（helper は options 側に置き、`core/` の純粋性を保つこと）。
5. `make typecheck` および既存テストがすべて green であること。

## テスト戦略

- vitest: parity テストを `tests/options/select-builders-parity.test.ts`（新規）に配置し、3 select の option 一覧・初期選択・`change` 発火値を固定する。既存テストへの影響がないことを `npx vitest run` で確認する。
- 手動確認: 設定ページを開き、都道府県・性別・紐付けの3 select の表示と選択変更が従来通りであることを目視する。

## DoD

- [x] parity テストが先行追加され、リファクタ前後で green である
- [x] 3兄弟が helper に集約され、挙動不変であることがテストと目視で確認できている
- [x] `make typecheck` が green である
