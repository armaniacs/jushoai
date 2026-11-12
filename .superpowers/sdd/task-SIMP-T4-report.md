# Task SIMP-T4 report — S3+S4 LEDGER同一理由行の集約 (slash-join/xN)

- branch: `work/pbi-208-round4` (開始時に `git status` で clean + 当該ブランチを確認)
- status: 完了。push なし (brief 指示通り)。1 commit に集約。
- 対象: `tests/corpus.ts` の `excluded[]` のみ。`expected`・pin・fixtures・scripts・他tests・src は不変 (下記 diff 監査で保証)。

## やったこと

`excluded[]` (全116エントリ・2955行相当) を走査し、同一 `(type, 理由)` の連続行を束ねた。記法は LEDGER 内前例 (`reserve[pref_name]/…` の slash-join、`q x2 (search)` のカウント) に倣った。

- R1 完全同一文の連続反復 → `key xN (type): <理由>` (xN は key 直後・前例多数派に統一)
- R2 同一 `(type,理由)`・異キーの連続 → `k1/k2/… (type): <理由>` (full-key slash-join、grep 可能)
- R3 ちょうど2種の `(type,理由)` が交互する block (len>=4・各群>=2・両方定型理由) → 群ごとに束ねて2行化 (例: hidden/checkbox 交互、`CID x20` / `(no name/id) x45`)
- R3 不成立の 2理由 span は same-TR sub-run に分解して R1/R2 のみ適用 (単独 image 行に後続 274連 hidden が巻き添え keep される問題を回避)
- guard (不変): 既集約 `xN` 行、bare-slash を含む既 bundle キー (`a/b` 等は過去ラウンドの集約とみなし維持)、`(…)` なし等の非定型行・`//` コメント行
- 和文固有理由は理由完全一致の場合のみ束ね、suffix 共有の一般化はしない (例: `お問い合わせ学部、コース,` と `お問い合わせ項目,` は別理由として残存)

代表例:

- `try-gakuin-reserve-form.html`: `event_data[]` 274連 + 同伴 hidden 4種 → `reserve[category_type]/reserve[media_type]/reserve[referrer]/event_type/event_data[] x274 (hidden): …` 1行
- `sekisui-catalog-request.html`: hidden 15種 slash-join 1行 + `(no name/id) x45 (button)` + `CID x20 (checkbox)` + radio 対 `x2` 群
- `12fc22bc297429.html`: `field_4647582[0..4]` hidden/checkbox 交互 10行 → 2行

## 削減行数 (ground truth: `git diff --numstat`)

- `tests/corpus.ts`: 5168行 → 3330行
- 除外行: 2157 removed / 319 added / **net -1838行**
- 変更エントリ: 102/116 (14件は束ね対象なしで不変)
- 変更行は全て `excluded[]` 内文字列リテラル (正規表現で全2476行を確認、非リテラル変更 0)

## 制約遵守の機械検証 (human review の代替ではなく裏付け)

1. 理由リテラル一字一句不変: 独立監査スクリプトで HEAD 対 worktree を比較。全エントリで `(key,type,reason)` 多重集合が完全一致し、worktree の全理由が同エントリの HEAD 理由と完全一致 (`AUDIT OK`)。
2. キー束ねのみ: コード化・const 化なし。キー↔事由対応は多重集合一致で保証。
3. 対象限定: `git status` は `M tests/corpus.ts` のみ。`expected`・pin・fixtures・scripts・他tests・src は diff ゼロ。

## 検証結果 (全緑)

- `npx tsc --noEmit`: exit 0
- `npx vitest run tests/integration/samples.test.ts`: 138/138 passed
- `make addurl-check`: `no '<expected>' remnants.` (ゼロ)
- `make eval`: 3/3 passed (pin 不変、aggregate 行は同一値を確認)
- 全 suite `npx vitest run`: 177 files, 2508 passed + 1 expected fail (事前からの expected fail、異常なし)

## concerns (残る wart・判断記録)

1. 非対称 bundle が数件ある。例: `2dd1c663300469.html` で hidden 群 `field_4696236[1]/[2]/[3]/[4]/[5]` に対し checkbox 群 `[0]/…/[5]` (hidden `[0]` は前 chunk の `field_4695584/field_4696236[0]` に吸着)。記録は完全 (監査で多重集合一致) だが見た目が非対称。厳密交互のみ R3 適用にすると逆に他所で行が増えるため現状を採用。
2. 最長 624字の行が5行ある (同一理由・全キー明示の代償)。tsc/vitest に影響なし。
3. `xN` 位置は `key xN (type)` (多数派前例) に統一。少数派 `key (type) xN` の既存 3行は不変のまま (混在は既存由来)。
4. サブエージェント駆動 (AGENTS.md) は採らず自前実施: 委譲 depth 上限 (current 1/max 1) のため `subagent` 不可。機械的編集+二重監査で代替した。
5. 変換・監査スクリプトは `/tmp/simp-t4-transform.mjs`・`/tmp/simp-t4-audit.mjs` (repo 外、一時物)。再現時は同planChunksロジックを用いること。
