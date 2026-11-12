# Task SIMP-T1f Report — sekisui-inquiry-form の期待値・pin追随

Branch: work/pbi-208-round4
Task: SIMP-T1f (SIMP-T1 commit 0b5305d の後続fix)
方針: SIMP-T1 で正しく分類されるようになった name-kana1/2 に合わせて
  samples 期待値・LEDGER excluded コメント・eval pin 行を追随更新する。
  分類ロジック (src/) には触らない。

## 変更内容 (対象2ファイルのみ + 本report)

- `tests/corpus.ts` の `sekisui-inquiry-form.html` エントリ:
  - `expected` に 2欄を追加:
    - `'name-kana1': 'ヤマダ'` (lastNameKana)
    - `'name-kana2': 'タロウ'` (firstNameKana)
  - `excluded` の旧1行を内容訂正 (行の削除ではなく訂正):
    - 旧: `name-kanji1/2/name-kana1/2 (text): 文字化け placeholder のみ, ...`
    - 新: `name-kanji1/2 (text): 文字化け placeholder は SIMP-T1 で削除済み
      (name-kana1/2 は kana 分類へ復帰し expected へ移動), kanji 2欄は
      stay unclassified (LLM fallback; kanji person-name does not infer)`
    - PBI-216 の記録性 (何を捨てたか) を保つため、placeholder 削除の事実を
      行内に残した。
- `tests/eval/corpus.eval.ts` の当該 pin 行のみ更新:
  - 旧: `{ ruleHits: 13, llmFallbacks: 4, fillable: 8, refineChanged: 5, refineDropped: 5 }`
  - 新: `{ ruleHits: 15, llmFallbacks: 4, fillable: 10, refineChanged: 7, refineDropped: 3 }`
  - 他の pin 行には触っていない。
- `src/` には触っていない (`git diff --stat` で tests 2件のみを確認)。

## 根拠 (実測による裏取り)

- 更新前に `npx vitest run tests/integration/samples.test.ts -t "sekisui-inquiry-form"`
  を実行し、実測が `name-kana1: ヤマダ / name-kana2: タロウ` の2欄追加のみで
  あることを確認 (T1 report の記載と一致)。期待値はこの正直な出力を pin した。
- `make eval` の失敗メッセージが
  `sekisui-inquiry-form.html: ruleHits pin=13 実測=15, fillable pin=8 実測=10,
  refineChanged pin=5 実測=7, refineDropped pin=5 実測=3`
  であり、T1 report の「参考: make eval への波及」の数値と完全一致。
  llmFallbacks は 4 のまま変化なしのため pin 値も据え置き。
- 機序は T1 report の通り (`src/core/kana.ts` の `placeholderRejectsKana` veto が
  外れ、name 属性由来の kana 信号が復活)。`name-kanji1/2` は kana 信号を持たない
  ため従来通り未分類のまま excluded に残る。

## 検証結果 (全緑)

1. `npx vitest run tests/integration/samples.test.ts`
   → 138 passed / 0 failed (全138件)。
2. `make addurl-check`
   → `no '<expected>' remnants.` (ゼロ)。
3. `make eval`
   → 3 passed / 0 failed (pin 不一致なし)。

## concerns

- なし。SIMP-T1 で赤く残っていた inquiry-form 由来の samples 1件・eval 1行は
  いずれも本タスクで緑化済み。catalog 側は T1 時点で変化なしのため対象外。
- 将来実ページ再取得 (方針 (a)) を行う場合は T1 report の concerns の通り
  対象 CGI の現存確認が先決。本タスクの範囲外。
