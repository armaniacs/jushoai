# Task R4-12 フルレポート — R4-11b追加5件分のpin更新と全体検証

- ブランチ: work/pbi-208-round4
- 前提: R4-10 (129件pin・make check exit 0) の後、R4-11b で5件
  (フジタ・ヤマダHD・アパマン・弁理士会・日本管財) を corpus に追加。
  開始時は 134 fixtures で `make eval` RED (pin行欠落のみ)。
- 結果: pin 5行追加のみで `make eval` 緑、`make check` exit 0。
  src/ 変更なし。push なし。

## やったこと

1. `make eval` を実行し、追加5件分の実測を取得した。
   RED の原因は pin 表の行欠落5件のみで、既存129行のドリフトはなかった。
2. `tests/eval/corpus.eval.ts` の PIN_TABLE に5行を追加した
   (アルファベット順の位置に挿入。集計は pin 表の合計として自動追従)。
3. `make eval` 緑を確認 (privacy 含む3テスト全 pass)。
4. `make check` exit 0 を確認。

## 指標の変化 (旧 pin → 実測)

既存129行は無変更 (ドリフトなし)。追加5行は新規のため旧 pin なし。
実測は `make eval` の reportLine 出力をそのまま転記した (honest pin)。

| fixture | fields | ruleHits | llmFallbacks | unknowns | refineChanged | refineDropped | fillable |
|---------|--------|----------|--------------|----------|---------------|---------------|----------|
| apaman-contact.html | 9 | 9 | 1 | 0 | 0 | 0 | 7 |
| fujita-contact.html | 11 | 10 | 1 | 1 | 0 | 0 | 6 |
| jpaa-contact.html | 11 | 9 | 2 | 2 | 3 | 0 | 7 |
| nkanzai-contact.html | 4 | 3 | 1 | 1 | 0 | 0 | 3 |
| yamada-holdings-contact.html | 6 | 4 | 2 | 2 | 0 | 0 | 4 |

pin 行 (転記分):

- `'apaman-contact.html': { ruleHits: 9, llmFallbacks: 1, fillable: 7, refineChanged: 0, refineDropped: 0 }`
- `'fujita-contact.html': { ruleHits: 10, llmFallbacks: 1, fillable: 6, refineChanged: 0, refineDropped: 0 }`
- `'jpaa-contact.html': { ruleHits: 9, llmFallbacks: 2, fillable: 7, refineChanged: 3, refineDropped: 0 }`
- `'nkanzai-contact.html': { ruleHits: 3, llmFallbacks: 1, fillable: 3, refineChanged: 0, refineDropped: 0 }`
- `'yamada-holdings-contact.html': { ruleHits: 4, llmFallbacks: 2, fillable: 4, refineChanged: 0, refineDropped: 0 }`

集計 (pin 表の合計として読む。旧 = HEAD の129行合計、実測 = 134行):

| | fixtures | fields | ruleHits | llmFallbacks | fillable | refineChanged | refineDropped |
|---|---|---|---|---|---|---|---|
| 旧 pin 合計 | 129 | — | 1173 | 629 | 699 | 280 | 58 |
| 実測 (今回) | 134 | 1883 | 1208 (+35) | 636 (+7) | 726 (+27) | 283 (+3) | 58 (+0) |

差分 (+35/+7/+27/+3/+0) は追加5行の合計に完全一致し、
既存行の寄与はゼロ。分類の変化は起きていない。

## 検証結果

- `make eval`: 緑。3 tests passed
  (pin 照合・privacy「keeps page content out of every report line」・
  「never reaches the network」)。
- `make check`: exit 0。web-ext lint の WARNING 2件あり
  (data_collection_permissions に対する min_version 系の既知の警告。
  R4-10 時と同内容で exit には影響しない)。
- `git diff --stat`: tests/eval/corpus.eval.ts のみ、5 insertions(+)。
  src/・fixture・corpus 台帳への変更なし。

## commit

- pin 更新: 1 commit (Conventional Commits 日本語。push なし)
- 本レポート: 別 commit (docs のみ。push なし)

## Concerns (将来PBI候補。語彙追加が必要なため直さず honest pin のまま残す)

R4-11b レポートの Concerns 1〜9 をそのまま引き継ぐ。
今回の5件で新規に見つかった劣化・ドリフトはないため、追加の Concerns はない。

1. 姓/名・セイ/メイ label が各々フルネーム読みになる (フジタ)。first/last-label 分割の語彙候補。
2. tel01/02/03 の3分割が未分類 (フジタ)。tel-split-by-name 候補。
3. お問い合わせ分類 select が未分類 (フジタ contact_type・ヤマダHD TITLE)。inquiry-kind select 候補。
4. フリガナが th-nearby + placeholder のみで未分類 (ヤマダHD f02)。kana-via-nearby 候補。
5. かな欄がひらがな placeholder をそのまま保持 (アパマン)。かな正規化候補。
6. 携帯/固定の2欄とも tel 値で fill (アパマン)。重複 fill の扱いは要検討。
7. FAX に tel 値が入る (アパマン)。fax-vocabulary 候補。
8. 職種/業種 select が未分類 (弁理士会)。LLM fallback。
9. 件名 (contact_subject) は profile 値なしのため正しく未充填 (日本管財)。仕様どおり。
