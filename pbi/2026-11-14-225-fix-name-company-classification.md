# PBI: name属性=company の会社名欄を分類する

## ユーザーストーリー
JushoAI利用者として、ラベルがなくても会社名欄に会社名が入ってほしい、なぜなら35件のフォームで取りこぼしているから

## ビジネス価値
- unknown削減：ラベルなし・name=company 系の欄（35件超）が company として読めるようになる
- 測定方法：対象fixtureの ruleHits 増・unknowns 減。`npm run eval` のpin差分で確認

## BDD受け入れシナリオ

```gherkin
Scenario: ラベルなし・name=company は会社名と読む
  Given labelが空で name="company" のテキスト欄がある
  When ルール分類する
  Then company として確定する（LLMに回さない）

Scenario: 会社メール欄を会社名と誤読しない
  Given name="companyEmail" の欄がある
  When ルール分類する
  Then company として読まない（従来どおりの扱い）
```

## 受け入れ基準
- [x] `name` が company 完全一致（および `company_name` 等の明確な変形）のラベルなし欄が company 確定になる
- [x] `companyEmail`・`companyDepartment` 等の派生名を company に誤読しない（除外テストで固定）
- [x] `npm run eval` が全パスし、pin更新は該当fixture行のみ
- [x] `make check` が緑のまま

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（samples.test.ts の既存ケースが回帰網になる）

### 統合テスト
- `tests/eval/corpus.eval.ts` のpin更新分が一致する

### 単体テスト
- `tests/core/` に `makeMeta` fixture を先に追加して失敗させてから直す
- 完全一致・変形・派生名の3系統（EXCLUDE正規表現との境界に注意）

## 見積もり
3 （小規模・name属性を見る初の分類。境界テストが本体）

## 技術的考慮事項
- 依存関係: なし。ただし EXCLUDE 正規表現（company|corp|...）との相互作用を確認する
- テスタビリティ: makeMeta fixture で再現可能
- 非機能要件: ルールは決定的に保つ

## 実装者向け注記

### 現状コードの確認（Phase 0済み・2026-11-14）
```bash
grep -n "meta.name" src/core/classify-rules.ts
```
→ ヒットなし。name属性を見る分類は未実装。会社語は `EXCLUDE` 正規表現（40行目付近）と PBI-119 の緩和境界が既存。

### 実装手順
1. `tests/core/` に失敗するfixtureを先に追加
2. `src/core/classify-rules.ts` に name ベースの company 判定を追加（label空が条件。完全一致リスト＋明確な変形のみ）
3. EXCLUDE との優先順位をテストで固定する（company語彙の欄が company/companyDepartment のまま読めること）
4. `npm run eval` でpin差分を確認し、該当fixture行だけ更新する

### 落とし穴
- 部分一致にすると `companyEmail` などを誤読する。完全一致＋許可リスト方式にする
- corpus.ts をスクリプトで触る場合は行末 `',` を考慮し、`grep -c ",," tests/corpus.ts` が0であることを確認する

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が緑
- [x] pin更新は該当行のみで、他行の差分なし

## 実装記録
- branch feat/samples-311-new-fields の Batch1 で検証・完成（commit a7547eb、レビュー承認）。単体 tests/core/name-company.test.ts、eval pin は該当行のみ更新
