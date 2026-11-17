# PBI: samples 311件体制への拡張（190件追加・14件削除・pin更新）

## ユーザーストーリー
JushoAI利用者として、実ページの多様なフォームで誤注入なく補完してほしい、なぜなら語彙と分類の伸びしろは実物の量でしか測れないから

## ビジネス価値
- 語彙の伸びしろの可視化：311件体制で ruleHits / unknowns / fillable を測り直し、PBI-224〜229 の分類改善の受け皿にする
- 測定方法：`npm run eval` の pin 差分と `SAMPLES_SCORE.md` の集計（keep 180 / review 121 / drop 10）が一致すること

## BDD受け入れシナリオ

```gherkin
Scenario: 追加の190件が台帳に載る
  Given samples/ に190件の実ページフォームがある
  When 台帳とテスト配線を通す
  Then tests/corpus.ts と samples.test.ts に載り、`npm run eval` が全パスする

Scenario: 削除の14件が台帳から消える
  Given 差し替え・重複で不要になった14件がある
  When 台帳とテスト配線から外す
  Then 参照残りがなく、`npm run eval` と `make test` が緑のまま
```

## 受け入れ基準
- [x] 190件の追加と14件の削除が台帳・テスト・pin に反映される
- [x] `npm run eval` が全パスし、pin 更新は該当行のみ
- [x] drop 判定のうち専用テスト持ち5件は保持される（SAMPLES_SCORE.md の救済記録どおり）
- [x] `make check` が緑のまま

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（samples.test.ts の既存ケースが回帰網になる）

### 統合テスト
- `tests/eval/corpus.eval.ts` のpin更新分が一致する
- `tests/integration/samples.test.ts` の追加・削除ケースが通る

### 単体テスト
- 追加不要（fixture 追加が本体。分類の単体は PBI-224〜229 側で持つ）

## 見積もり
5（大規模・件数は多いが作業は台帳配線と pin 固定が本体）

## 技術的考慮事項
- 依存関係：PBI-224〜229 の分類変更の後に pin を確定する（順序制約あり）
- テスタビリティ：`npm run eval` と `make test` で確認する
- 非機能要件：drop 判定でも専用テスト持ちは保持する

## 実装者向け注記

### 現状コードの確認（Phase 0済み・2026-11-15）
```bash
git status --short | grep -c "?? samples/"
git status --short | grep -c "^ D samples/"
```
→ 190件の追加と14件の削除が作業ツリーにある。`tests/corpus.ts`・`corpus.eval.ts`・`samples.test.ts`・`target-url.md` の差分も作業ツリーにある（未コミット）。PBI-224〜229 の実装と対応するテスト（`tests/core/*test.ts` 4件）も作業ツリーにある。新規実装ではなく、作業ツリーの検証・完成・コミットが本体。

### 実装手順
1. PBI-224〜229 の分類実装が `src/` にあることを確認する
2. 追加190件・削除14件を台帳（`tests/corpus.ts`）とテスト配線に載せる
3. `npm run eval` で pin 差分を確認し、該当行だけ更新する
4. `make test` と `make check` を緑にする

### 落とし穴
- corpus.ts をスクリプトで触る場合は行末 `',` を考慮し、`grep -c ",," tests/corpus.ts` が0であることを確認する
- pin 更新は該当行のみ。他行の差分は混ぜない
- 専用テスト持ちの drop 判定5件を誤って外さない（SAMPLES_SCORE.md の救済記録を見る）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が緑
- [x] pin更新は該当行のみで、他行の差分なし

## 実装記録
- branch feat/samples-311-new-fields の Batch2 で検証・完成（commit 2af8930、レビュー承認）。190件追加・14件削除を台帳・テスト・pin・URL に配線。pin は +190/-14 のみで値ドリフトなし。`make check` EXIT 0 を確認
