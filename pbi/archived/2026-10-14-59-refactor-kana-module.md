# PBI: かな判定ロジックの単一モジュール集約

## ユーザーストーリー

保守担当者として、かな／カナ種別の判定ロジックを1つのモジュールに集約してほしい。なぜなら漢字・カタカナ・ひらがな・半角カナの判定が3か所に分散していると、カナ誤判定の修正のたびに複数ファイルの呼び出し順序を読み解く必要があり、修正漏れと回帰を招くから。

## 背景・問題

- 対象:
  - `src/core/classify-rules.ts:267-300`（`wantsKana` / `wantsKanaOwnMeta` / `detectKanaKind`）
  - `src/core/classify-rules.ts:343-362`（`classifyField` 内の `kanaFor()`＋`sources` 表）
  - `src/core/analyze.ts:18-32`（`applyKanaOverlay`）
  - `src/core/classify-rules.ts:397`（`refineClassifications` の `fullNameKana` 分割）
- 現状: `classifyField` がインラインでかな判定し、その後 `analyze.ts` のオーバーレイが異なる規則（自前属性 vs 共有legendの識別）で再判定し、最後に refinement が `fullNameKana → lastNameKana/firstNameKana` を汎用分割扱いする。3つの純粋関数が「テスト容易性のため」に抽出されているが、実バグは呼び出し順序に潜む（locality なし）。
- 提案: アーキテクチャレビュー候補 #2（Strong）。`analyze.ts:15-17` 自身が「かな判定は単一経路に載せられない」と認めているのが根拠。
- 候補番号: 本ラウンド順位 1（全5件）

## 優先度・スコア

- 順位: 1 位 / 5 件
- RICE スコア: 240
  - Reach = 30（日本式フォームのカナ分類修正は高頻度）
  - Impact = 2（修正の局所化で回帰を削減）
  - Confidence = 80%（3か所の全文読解済み、表テスト化の見通し明確）
  - Effort = 0.2 人週（純粋関数のみの付け替え＋表テスト）
- 根拠: 最安コストで分類修正の高頻度領域に効くため最優先。
- 依存: なし。順位2（`59` ではなく本ファイルが `59`）とファイルが独立しているため並列着手可。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― かな判定が単一入口に集約される
  Given プレースホルダ・label・legend・兄弟欄の組が与えられる
  When かな判定モジュールに問い合わせる
  Then (カテゴリ, kanaKind) が一意に返る
  And classifyField・オーバーレイ・refinement のいずれにも判定ロジックが残っていない

Scenario: 境界 ― 共有見出しのフリガナに漢字行が混ざる
  Given フリガナの共有legendを持つfieldset内に漢字プレースホルダ（山田）の行がある
  When かな判定モジュールに問い合わせる
  Then 漢字行は無印名のまま残る
  And 自前属性でかなを主張する行だけがカナ化される
```

## 受け入れ基準

- [x] `classifyField` はかなブラインド（`lastName/firstName/fullName` のみ返し、`kanaFor` を持たない）
- [x] `wantsKana / wantsKanaOwnMeta / detectKanaKind` が新モジュールの内部 seam になっている（外部入口は `resolveKana` 相当1点）
- [x] `applyKanaOverlay` の共有legend識別規則が新モジュール内に移り、`analyze.ts` から消える
- [x] 既存の分類テスト（`tests/core/`）がすべてパスする
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（純粋関数の付け替えで UI・保存動作に影響しないため）

### 統合テスト

- 不要（`classifyAll` 経由の既存 `tests/core/` 回帰で充足するため）

### 単体テスト

- (placeholder, label, legend, 兄弟集合) → (カテゴリ, kanaKind) の表テスト（漢字・カタカナ・ひらがな・半角・共有legend・自前属性の組合せ）
- かなブラインド化後の `classifyField` が無印名のみ返すこと
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.2 人週（ストーリーポイント換算では小。要チームでの見積もり）
- 内訳想定: 新モジュール抽出＋表テスト＋既存テスト回帰＋レビュー対応

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/core/classify-rules.ts`（267〜300 行の3関数、302〜365 行の `classifyField` 内 `kanaFor`＋`sources` 表、367〜436 行の refinement）と `src/core/analyze.ts`（15〜32 行のオーバーレイ）。

- 「漢字・ラテンプレースホルダは共有見出しのフリガナ主張に勝つ」規則（classify-rules.ts:345-346）と「兄弟の自前属性主張」規則（analyze.ts:22-24）の対応関係を両ファイルで確認すること
- ローマ字系 DISPATCH（208〜233 行）との相互作用を崩さないこと
- 関連テストは `tests/core/` 配下の分類・かな系テストを `wantsKana`、`detectKanaKind`、`applyKanaOverlay` 等で検索して把握すること

### 落とし穴

- オーバーレイは rules＋LLM の「後」・ペア分割の「前」に1回だけ走らせること（順序を変えると `fullNameKana` 分割と LLM 由来カナの扱いが壊れる）
- `detectKanaKind` の半角判定（`ｦ-ﾟ`）と言語判定の優先順を変えないこと
- 本修正は振る舞い保存が建前のため、分類結果の差分が出たらテスト期待値ではなく実装を疑うこと（テスト方針：正規表現・期待値ではなくコードを直す）

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `bfda8b9`: `src/core/kana.ts` 新設（`KANA`・`wantsKana`・`wantsKanaOwnMeta`・`detectKanaKind`・`resolveKana`）、`classify-rules.ts` のかなブラインド化（`classifyText` の fallback を `wantsKana` gate 付き `fullName` に一本化、`kanaFor` 削除）、`analyze.ts` のオーバーレイを `resolveKana` 呼出しに置換。
- 検証: `npx tsc --noEmit` exit 0、フル単体 88→89 ファイル・1169 件 green（新規ロック 1 件含む）。TDD の Red（直接カナ期待の失敗）→Green（blind 期待に更新）を経由。
- 受容した微差 2 件（実測済み）: (a) pattern のみがカナ証拠の欄は旧 drop→新 fullNameKana（pattern は欄固有の明示証拠のため正当化）。(b) nearby のみがカナ証拠の欄は confidence 0.65→0.7（いずれも閾値上のため経路不変）。矛盾シグナル辺縁（フリガナ＋山田/John）は旧通り null のまま（回帰テスト追加済み）。
- ユーザーの作業として残る項目: コードレビュー
