# 設定画面のカード生成の抽出

- 種別: refactor
- 優先度: 順位 6/6
- RICE: 2.0（Reach=5 / Impact=1 / Confidence=0.8 / Effort=2）
  - 根拠: カード追加時の2箇所同時変更の波及コスト削減。抽出単位の設計判断が残るため Confidence 0.8。
  - 依存: NN 19 の後（同ファイルのため 19 先行、19 の helper に乗る）
- 見積もり: 2pt

## ユーザーストーリー

設定画面の保守者として、プロファイル・住所カードの構造変更を1箇所で済ませたい。なぜなら `render()` 263行中の2つのカード生成ループが同じ組み立てパターンの重複で、片方だけ変わりやすいから。

## 背景

`src/entrypoints/options/main.ts` の現状:

- 表定義が3つ並立している: `PROFILE_FIELDS` (`src/entrypoints/options/main.ts:13`)、`ADDRESS_FIELDS` (`src/entrypoints/options/main.ts:27`)、`OVERSEAS_FIELDS` (`src/entrypoints/options/main.ts:35`)。
- `render()` は `src/entrypoints/options/main.ts:104` から `src/entrypoints/options/main.ts:231` まで。
- プロファイルカード生成ループは `src/entrypoints/options/main.ts:111` から `src/entrypoints/options/main.ts:151` までで、`fieldset` / `legend` (`src/entrypoints/options/main.ts:112-115`)、`labeled` + `textInput` のループ (`src/entrypoints/options/main.ts:117-131`)、複製ボタン (`src/entrypoints/options/main.ts:133-140`)、削除ボタン (`src/entrypoints/options/main.ts:141-148`) を組み立てる。
- 住所カード生成ループは `src/entrypoints/options/main.ts:166` から `src/entrypoints/options/main.ts:191` までで、`fieldset` (`src/entrypoints/options/main.ts:167`)、`labeled` + `textInput` のループ (`src/entrypoints/options/main.ts:169-181`)、削除ボタン (`src/entrypoints/options/main.ts:182-188`) を組み立てる。
- 追加ボタンと上限注記も対になっている: プロファイル側は `src/entrypoints/options/main.ts:153-162`、住所側は `src/entrypoints/options/main.ts:193-202` で、いずれも `length >= 10` で `disabled` 化し、上限到達時に注記 `p` を出す。
- 結果として `fieldset` 生成、`labeled` 反復、追加・削除ボタンの配線、上限10件の判定という同じ組み立てパターンが2ループに重複し、カード構造を変えるとき2箇所の同時変更が必要になる。

## BDDシナリオ

### 1. プロファイルの複製・削除・上限の parity

- Given プロファイルが2件登録された設定画面
- When 1件目の「このプロファイルを複製」ボタンを押し、次に複製元の削除ボタンを押す
- Then 複製前後で件数と表示内容の遷移が現状と変わらず、上限10件到達時は複製・新規追加ボタンが `disabled` になり「プロファイルは10件まで登録できます」と表示される

### 2. 住所の追加・削除・上限の parity

- Given 住所が1件登録された設定画面
- When 「住所を追加」ボタンで2件にし、1件目を「この住所を削除」ボタンで消す
- Then 件数と入力欄の並び（使うプロファイル / `ADDRESS_FIELDS` 前半 / 都道府県 / `ADDRESS_FIELDS` 後半 / 英語住所）の遷移が現状と変わらず、上限10件到達時は追加ボタンが `disabled` になり「住所は10件まで登録できます」と表示される

### 3. カード構造変更が1箇所で済む

- Given 共通のカード生成 helper に抽出された状態
- When カード外枠（`fieldset` / ボタン配置など）の構造を変える
- Then プロファイル・住所の両カードに反映され、2つの生成ループを個別に直す必要がない

## 受け入れ基準

1. プロファイル・住所カードの `fieldset` / `label` / 追加・削除ボタンの組み立てが共通 helper に抽出され、`render()` 内の2ループの重複が解消される。
2. 複製・削除・追加・上限10件（ボタンの `disabled` と上限注記の有無・文言を含む）の挙動が現状と同一である。
3. 生成される DOM・表示文言・プレースホルダーは現状と byte-identical であり、差分は組み立てコードの移動・抽出に限る（文言・順序・属性の変更を含めない）。
4. `PROFILE_FIELDS` / `ADDRESS_FIELDS` / `OVERSEAS_FIELDS` の表定義の内容・順序を変更しない。変更が必要になった場合は本 PBI の範囲外として別 PBI にする。
5. `make typecheck` と既存テストがグリーンである。

## テスト戦略

- vitest: 設定画面カードの parity を保証する DOM テストを `tests/options/` に追加する（複製・削除・上限10件の件数遷移、ボタンの `disabled`、上限注記の表示・非表示）。
- 既存の `tests/core/` には影響がないことを全テスト実行で確認する。
- 手動確認: 設定ページを開いて目視する（プロファイル・住所カードの見た目、複製・削除・追加、上限10件時の注記が変わっていないこと）。

## DoD

- [ ] 受け入れ基準1-5をすべて満たす
- [ ] vitest の新規・既存テストと `make typecheck` がグリーンである
- [ ] 設定ページの目視で parity を確認した
