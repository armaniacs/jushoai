# PBI: FAX番号欄の扱いを整理する

## ユーザーストーリー
JushoAI利用者として、FAX番号欄の扱いがルールとして定まっていてほしい、なぜなら5件のフォームで unknown のまま残っているから

## ビジネス価値
- unknown削減：FAX番号ラベルの欄（5件〜）の分類が確定する
- 測定方法：対象fixtureの ruleHits 増・unknowns 減。`npm run eval` のpin差分で確認

## BDD受け入れシナリオ

```gherkin
Scenario: FAX番号欄はFAXとして確定する
  Given ラベルに「FAX番号」を含む電話系の欄がある
  When ルール分類する
  Then 分類が確定する（LLMに回さない）

Scenario: FAX欄に電話番号値が入る
  Given FAXとして確定した欄がある
  When プランを組み立てる
  Then プロファイルにFAX値がなければ電話番号値が入る（従来の流用ルールを維持）
```

## 受け入れ基準
- [x] FAX番号ラベルの欄の分類が確定する（送付対象外になる）
- [x] プロファイルにFAX値がない場合の電話番号値の流用が維持される（既存の期待値を壊さない）
- [x] `npm run eval` が全パスし、pin更新は該当fixture行のみ
- [x] `make check` が緑のまま

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（samples.test.ts の既存ケースが回帰網になる）

### 統合テスト
- `tests/eval/corpus.eval.ts` のpin更新分が一致する

### 単体テスト
- `tests/core/` に `makeMeta` fixture を先に追加して失敗させてから直す
- FAX番号・FAX・fax の表記ゆれ、電話欄との区別ケース

## 見積もり
2 （小規模・既存の流用挙動の確認が本体）

## 技術的考慮事項
- 依存関係: なし。電話系分類との境界を確認する
- テスタビリティ: makeMeta fixture で再現可能
- 非機能要件: ルールは決定的に保つ

## 実装者向け注記

### 現状コードの確認（Phase 0済み・2026-11-14）
```bash
grep -in "fax" src/core/classify-rules.ts src/core/types.ts
```
→ ヒットなし。FAX扱いは未実装（FF系fixtureの期待値コメントに流用の記載のみ）。

### 実装手順
1. `tests/core/` に失敗するfixtureを先に追加
2. `src/core/classify-rules.ts` にFAX番号判定を追加（表記ゆれ：FAX番号・FAX・fax）
3. プラン組み立ての流用（FAX値なし→電話番号値）が維持されることを既存テスト＋新規テストで固定する
4. `npm run eval` でpin差分を確認し、該当fixture行だけ更新する

### 落とし穴
- 電話番号欄との区別を崩さない（FAX確定が tel 分類を奪わないこと）
- corpus.ts をスクリプトで触る場合は行末 `',` を考慮し、`grep -c ",," tests/corpus.ts` が0であることを確認する

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が緑
- [x] pin更新は該当行のみで、他行の差分なし

## 実装記録
- branch feat/samples-311-new-fields の Batch1 で検証・完成（commit a7547eb、レビュー承認）。分類・値流用・型・prompt の4点と単体 tests/core/fax.test.ts、eval pin は該当行のみ更新
