# PBI: select-option matcher の単一モジュール化

## ユーザーストーリー

保守担当者として、選択肢解決（保存値→option）の matcher 群を単一モジュールに集約してほしい。なぜなら正規化→完全一致→フォールバックの同型が4ファイルに分散し、カテゴリ追加が matcher と planner の同時編集になるから。

## 背景・問題

- 対象:
  - `src/core/prefectures.ts:15-30`（`strip`、`matchPrefectureOption`）
  - `src/core/eras.ts:47-78`（`leadingDigits`、`matchNumber/Decade/EraOption`）
  - `src/core/genders.ts:6-20`（`clean`、`matchGenderOption`）
  - `src/core/planner.ts:119-144`（select/radio 分岐、matcher 振分け 129-137）
- 現状: 各 matcher が NFKC 正規化＋trim、完全一致（text→value）、領域フォールバックの同型を持つ。`buildPlan` がカテゴリ→matcher の対応表を条件分岐で保持するため、カテゴリ追加が2箇所編集になる。
- 提案: アーキテクチャレビュー round 2 候補 #4（Strong）。「カテゴリ・選択肢・生値を渡すと option または null」の小 interface に集約し、領域表・規則は内部 seam に畳む。`buildPlan` は単一呼出しにする。
- 候補番号: 本ラウンド順位 2（全5件）

## 優先度・スコア

- 順位: 2 位 / 5 件
- RICE スコア: 120
  - Reach = 15（選択肢解決の将来変更）
  - Impact = 1（正規化・フォールバックの単一ソース化）
  - Confidence = 80%（純粋関数、表テスト化の見通し明確）
  - Effort = 0.1 人週（モジュール抽出＋表テスト）
- 根拠: 純粋・表テスト化で最安。順位1とはファイル独立のため並列可。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 全カテゴリが単一入口で解決する
  Given 都道府県・元号・年月日・性別・年代・数値の選択肢群と生値がある
  When 解決モジュールに問う
  Then 従来通りの option または null が返る

Scenario: 境界 ― 不一致・未満ガードが保存される
  Given 一致なし・10代未満の年代・数値外がある
  When 解決モジュールに問う
  Then null が返り、`warn-no-option` 経路が保たれる
```

## 受け入れ基準

- [x] 4 matcher が単一モジュールの内部 seam になっている
- [x] `buildPlan` がカテゴリ分岐なしの単一呼出しである
- [x] 年代の未満ガード・数値強制・都道府県コードの振る舞いが変わっていない
- [x] 既存の planner・matcher テストがすべてパスする
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（純粋関数の付け替えのため）

### 統合テスト

- `tests/integration/samples.test.ts` の回帰で充足する

### 単体テスト

- カテゴリ×（完全一致・フォールバック・不一致）の表テスト
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す

## 見積もり

- 0.1 人週（ストーリーポイント換算では小。要チームでの見積もり）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は上記4箇所。都道府県コード（JIS X 0401＝index+1）、年代の未満ガード、性別の先頭文字規則、数値の leadingDigits 吸収を確認すること。

### 落とし穴

- `matchXOption` の公開 interface を残すか消すかは呼び手を数えて決めること（tests からの直接参照があれば移行計画を立てる）
- planner の `isUntouchedSelect` との関係は変えないこと

## 実施記録（2026-10-15、自律タスククローザーによる実装）

- 実装コミット `118fa5f`: `src/core/match-option.ts` 新設（`matchOption` 単一入口）。`buildPlan` の5連 ternary を単一呼出しに置換。領域 matcher は export 維持（既存テストが直接参照）。
- 検証: `npx tsc --noEmit` exit 0、新規表テスト＋既存 planner・matcher テスト green。
- ユーザーの作業として残る項目: コードレビュー
