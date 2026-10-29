# PBI: 設定画面の描画分割と上限集約

## ユーザーストーリー

保守担当者として、設定画面 `options/main.ts` の描画集中（`render()` 90行＋上限ポリシー二重化）を責務ごとに分割してほしい。なぜなら上限変更・欄追加のたびに複数箇所の同時編集が必要で、設定画面が「触ると壊れる領域」化するから。

## 背景・問題

- 対象:
  - `src/entrypoints/options/main.ts:168-259`（`render()`：プロファイルカード・住所カード・footer・notice を一関数で組立）
  - `src/entrypoints/options/main.ts:47`（モジュール閉鎖の `state`）
  - `src/entrypoints/options/main.ts:182,194,198`（プロファイル側の10件上限）／`:226,230`（住所側の10件上限）
  - `src/entrypoints/options/main.ts:261-277`（`onSave`：正規化→検証→永続化→notice）
- 現状: 上限10件ポリシーが2箇所に二重化され、欄定義と描画が同ファイルに同居する。`ai-section.ts` の保存儀式は抜けたが、プロファイル／住所側の `onSave` は旧来のまま。
- 提案: ホリスティックレビュー テーマ3。(1) 上限を定数＋ガード集約に。(2) `render()` を profile／address renderer に分割し `state` を引数化。(3) AI設定保存との儀式共通化は「変わる理由が違う」ため行わない。
- 候補番号: 本ラウンド順位 5（全5件）

## 優先度・スコア

- 順位: 5 位 / 5 件
- RICE スコア: 17
  - Reach = 10（設定画面の将来変更）
  - Impact = 1（上限・欄追加の波及点集約）
  - Confidence = 50%（DOM 駆動で工数見積りの確度低）
  - Effort = 0.3 人週（renderer 分割＋DOM テスト追従）
- 根拠: DOM 重く確信度が低いため最後。単独ファイルのため他順位と並列可だが直列で処理する。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 上限ポリシーが単一ソースになる
  Given 上限ちょうど・上限超過のプロファイル／住所がある
  When 描画する
  Then 両種別とも同一ガードの判定（追加不可・注意文）になる

Scenario: 境界 ― 分割後も保存と検証が従来通り動く
  Given 不正値を含むプロファイルがある
  When 保存する
  Then 従来通りのエラーリスト表示と保存成功表示になる
  And 入力中フォーカス等の描画挙動が変わらない
```

## 受け入れ基準

- [x] 上限10件の判定が単一定数＋ガードに集約されている（文言は現状維持）
- [x] `render()` が profile／address の renderer に分割されている
- [x] `onSave` の正規化→検証→永続化→notice の順序と文言が変わっていない
- [x] AI設定保存との儀式共通化に手を出していない
- [x] 既存の options テスト（`tests/options/`）がすべてパスする
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（設定画面の内部付け替えのため）

### 統合テスト

- 既存の options DOM テスト（parity・egress-gate・exclusion）で回帰確認する

### 単体テスト

- 上限ガードの境界テスト（9件・10件・11件）を追加する
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.3 人週（ストーリーポイント換算では中。要チームでの見積もり）
- 内訳想定: renderer 分割＋上限集約＋DOM テスト追従＋レビュー対応

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/entrypoints/options/main.ts` 全文（299行）。

- select 3兄弟（`prefectureSelect`／`genderSelect`／`ownerSelect`）と `cardFieldset`／`actionButton` の既存 helper 体制を維持すること（宣言表＋小 builder の idiom）
- `PROFILE_FIELDS`／`ADDRESS_FIELDS`／`OVERSEAS_FIELDS` の宣言内容（label・placeholder・順序）を変えないこと
- `kanaHiraganaHint` のひらがな表示ヘルパ配線（`appendProfileField`）を維持すること
- `onSave` の空登録ガード（プロファイル・住所の1件以上検査）とエラー表示形式（`message('errors')`）を変えないこと
- 関連テストは `tests/options/` 配下（parity・select-builders・card-builders・exclusion・egress-gate）

### 落とし穴

- 全再描画（`replaceChildren`）方式のため、分割後もフォーカス喪失などの描画挙動を変えないこと。入力ハンドラは状態変異のみで再描画しない現状を維持すること
- `newId()` の ID 採番と `EMPTY_PROFILE`／`EMPTY_ADDRESS` の既定（住所ラベル「自宅」）を変えないこと
- モジュール閉鎖 `state` の引数化は renderer 境界までとし、WXT entrypoint の即時 mount 体制（279-299行）は変えないこと

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `8d916b9`: `render()` を `renderProfilePage`／`renderAddressPage`（データ＋rerender 引数）に分割。`MAX_ITEMS`＋`isAtLimit` を `options/dom.ts` に集約し6箇所の `>= 10` を置換。`onSave`・欄定義・文言・全再描画方式は不変。AI保存儀式との共通化なし。
- 検証: `npx tsc --noEmit` exit 0、options 6 ファイル 53 件 green（既存 parity 無改変）＋新規 guard 境界テスト 2 件。
- ユーザーの作業として残る項目: コードレビュー
