# PBI: 分割グルーピングの一本化

## ユーザーストーリー

保守担当者として、分類 refinement の分割グルーピング2実装を単一の骨格に集約してほしい。なぜなら件数判定や破棄扱いの修正が片方にだけ入ると、電話・郵便番号・姓名で分割落ちの挙動がずれるから。

## 背景・問題

- 対象:
  - `src/core/classify-rules.ts:333-348`（`splitGroups`＋呼び出し4件）
  - `src/core/classify-rules.ts:351-377`（`TEL_PARTS`/`ZIP_PARTS`、`partRank`、`splitGroupsByPart`＋呼び出し2件）
- 現状: group→length→retag の骨格は同一で、キー関数（`label+nearby` 結合 vs `nearby` のみ）と追加条件（連番＋部分順）のみが違う。第3の分割条件が来たら3コピー目が生まれる。
- 提案: ホリスティックレビュー テーマ2（Quick Win）。キー関数と受理述語を注入する単一 grouping に畳み、呼び7件は宣言のまま残す。
- 候補番号: 本ラウンド順位 2（全5件）

## 優先度・スコア

- 順位: 2 位 / 5 件
- RICE スコア: 240
  - Reach = 15（分割欄の将来条件追加）
  - Impact = 1（件数・破棄判定の単一ソース化）
  - Confidence = 80%（同一関数の純粋付け替え、回帰網あり）
  - Effort = 0.05 人週（grouping 統合＋既存テスト回帰のみ）
- 根拠: 順位1と同コストで refinement の波及点を1箇所にする。
- 依存: なし。順位1とはファイル独立のため並列着手可。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 既存の全分割が単一骨格を通る
  Given 電話3欄・郵便2欄・姓名2欄・カナ2欄・部分名称の各 Fixture がある
  When refineClassifications を呼ぶ
  Then 従来通りの分割・破棄結果になる
  And grouping 本体は1実装のみである

Scenario: 境界 ― 過不足グループは従来通り分割しない・破棄する
  Given 件数不一致の同名グループと超過グループがある
  When refineClassifications を呼ぶ
  Then 不一致は unsplit のまま残り、超過は破棄される
```

## 受け入れ基準

- [x] `splitGroups` と `splitGroupsByPart` が単一 grouping（キー関数＋受理述語注入）に統合されている
- [x] 呼び7件（tel・zip・fullName・fullNameKana・tel 部分・zip 部分）の宣言は残っている
- [x] `dropped` 扱いと件数判定の振る舞いが変わっていない
- [x] 既存の分割テスト（`tests/core/` の tel/zip/fullName ペア、共有 legend テスト）がすべてパスする
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（純粋関数の付け替えのため）

### 統合テスト

- `tests/integration/samples.test.ts` の回帰で充足する

### 単体テスト

- 既存の分割テスト群で回帰確認する
- 受理述語の単体テストを1件足す（第3条件の受け皿としての証拠）
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.05 人週（ストーリーポイント換算では最小単位。要チームでの見積もり）
- 内訳想定: grouping 統合＋既存テスト回帰＋レビュー対応のみ

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/core/classify-rules.ts` の `refineClassifications`（320〜390行付近）。

- `splitGroups` のキー（`label\0nearby`）と `splitGroupsByPart` のキー（`nearby`）の差を温存すること
- 部分名称版の追加条件（連番＋`partRank` 順）を `accept` 述語に移すこと
- `TEL_PARTS`（市外/市内/加入者）・`ZIP_PARTS`（上3桁/下4桁）の正規表現は変えないこと（テスト方針：正規表現のテストが落ちたら期待値ではなく正規表現を直す。ここでは正規表現自体を変えない）
- 関連テストは `tests/core/classify-rules.test.ts` の refine 系と `tests/core/analyze.test.ts` の分割テスト

### 落とし穴

- `dropped`（超過グループ破棄）の `Set` 運用を統合後も維持すること。返り値の filter と対にすること
- `addressFull → street/addressNoPref` の絞り込み（refine 後段）は本 PBI の範囲外。触らないこと

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `c40080a`: `splitGroups`／`splitGroupsByPart` を `splitBy(cat, cats, key, accept, dropOversize)` に統合（`exactSize`＋`sameLabel`＋`inPartOrder`）。呼び7件は宣言のまま。超過破棄は第1種のみ（第2種の continue 素通しを保存）。
- 検証: `npx tsc --noEmit` exit 0、`tests/core/` 13 ファイル 320 件 green（新規：非連番の部分名称欄が unsplit のまま残るテスト1件）。
- ユーザーの作業として残る項目: コードレビュー
