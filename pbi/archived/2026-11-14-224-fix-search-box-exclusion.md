# PBI: 検索窓系フィールドの除外（q/query/keyword/kw/s）

## ユーザーストーリー
JushoAI利用者として、サイト内検索窓に自分の住所・氏名が入らないでほしい、なぜなら誤注入は未注入より有害だから

## ビジネス価値
- unknown削減：`q`(31件)・`query`(14件)・`kw`(7件)・`keyword`(4件)・`s`(5件)の検索窓がLLM送付対象から外れ、送付量と分類ノイズが減る
- 誤注入防止：検索窓にプロファイル値が入る事故を構造的に防ぐ
- 測定方法：`npm run eval` の unknowns / llmFallbacks が減り、既存pinの他行が不変

## BDD受け入れシナリオ

```gherkin
Scenario: ラベルなし検索窓は送付対象にならない
  Given name属性が "q" のラベルなしテキスト欄がある
  When ルール分類する
  Then LLM送付対象にならず、fillプランにも入らない

Scenario: 本物の問合せ欄は除外されない
  Given 問合せ内容の textarea がある
  When ルール分類する
  Then 従来どおり unknown のまま扱いが変わらない
```

## 受け入れ基準
- [x] 上記5名称のラベルなし欄が送付対象外になる（単体テストで確認）
- [x] `npm run eval` が全パスし、pin更新は該当fixture行のみ
- [x] `make check` が緑のまま（他テストの退行なし）

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（分類のみの変更。samples.test.ts の既存ケースが回帰網になる）

### 統合テスト
- `tests/eval/corpus.eval.ts` のpin更新分が一致する

### 単体テスト
- `tests/core/` に `makeMeta` で作る fixture を先に追加して失敗させてから直す（AGENTS.mdのテスト方針）
- 名称5種 × input type text/search の組み合わせ、問合せtextareaの非除外ケース

## 見積もり
3 （小規模・分類ルール1点の追加と除外境界の確認）

## 技術的考慮事項
- 依存関係: なし（classify-rules 内の独立した判定追加）
- テスタビリティ: makeMeta fixture で再現可能
- 非機能要件: ルールは決定的に保つ（LLMに依存しない）

## 実装者向け注記

### 現状コードの確認（Phase 0済み・2026-11-14）
```bash
grep -n "'q'\|query\|keyword" src/core/classify-rules.ts src/dom/scan-fields.ts
```
→ 検索語の除外は未実装（ヒットはコメント・DOM走査のquerySelectorのみ）。`meta.name` を見る分類も未実装。

### 実装手順
1. `tests/core/` に失敗するfixtureを先に追加（AGENTS.md: 正規表現のテストが落ちたら期待値ではなく正規表現を直す）
2. `src/core/classify-rules.ts` に検索窓判定を追加（label空 × name in {q, query, keyword, kw, s} × text/search）
3. 除外の表現は既存の除外流儀（EXCLUDE正規表現・skip扱い）に合わせ、classify結果が送付対象外になることを単体テストで固定する
4. `npm run eval` でpin差分を確認し、該当fixture行だけ更新する

### 落とし穴
- `company` などの正当なname値と衝突しないよう、対象名称は完全一致リストにする（部分一致にしない）
- corpus.ts をスクリプトで触る場合は行末 `',` を考慮し、`grep -c ",," tests/corpus.ts` が0であることを確認する
- tsc の TS1117（expected重複キー）に注意：重複キーは expected から落とす

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が緑
- [x] pin更新は該当行のみで、他行の差分なし

## 実装記録
- branch feat/samples-311-new-fields の Batch1 で検証・完成（commit a7547eb、レビュー承認）。単体 tests/core/search-box-exclusion.test.ts、eval pin は該当行のみ更新
