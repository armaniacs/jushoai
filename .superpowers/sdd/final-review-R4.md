# Final Review R4 — work/pbi-208-round4 (PBI-208 Round4: 実ページフォーム収集)

- レビュー範囲 (read-only。コード変更なし): `git status/log` 参照 + 差分パッケージ
  `.superpowers/sdd/review-39d2aaf..36887d0.diff` (36 files, +3001) を精読。
- ブランチ: `work/pbi-208-round4` (base 39d2aaf → HEAD 36887d0)。`git diff --stat` は
  samples 25件 + tests/corpus.ts + corpus.eval.ts + samples.test.ts + target-url.md +
  .superpowers レポートのみ。**src/ 変更なし** (`NO_SRC_TOUCH` 確認済み)。
- 作業ツリーの `M AGENTS.md` はブランチ外の既存ダーティ (sed 注意書き2行追加)。
  本ブランチの diff には含まれない。R4-1 レポートの「作業前から存在」記述と一致。

## Verdicts

- **Spec: ✅ (PASS)** — PBI-208 受け入れ基準をすべて満たす。1件の 404 (SMP-area) は
  文書化された除外で、台帳残滓なし。ブロッカーなし。
- **Quality: With findings (Important ×2 / Minor ×5 / Critical ×0)** —
  マージ可。Important は将来 PBI への申送りで、R4 の honest pin 方針と整合。
  詳細は下記「指摘一覧」。Minor のみ本ファイルに記載し、親への戻りは verdicts + 件数とする
  (本レビューは Critical 0 のため戻りは verdicts のみで足りる)。

## Spec compliance (PBI-208 受け入れ基準)

- [x] **make addurl 手順・台帳・配線**: `tests/target-url.md` に 25行追加
  (44行中。`git diff` で `^+.*→` 25行を確認。R4-2a 11件 + R4-2b 14件)。
  形式は既存どおり `- <URL> → <fixture>`。`tests/integration/samples.test.ts` に
  25ケース追加 (diff L3258-3348)。R4-2a 失敗1件 (No.10 SMP-area 404) は registry
  revert 済みと報告され、diff に残滓なし (target-url.md に area31 行なしを確認)。
- [x] **最小再現**: 全25 fixture が 22–114行の最小再現。先頭コメントに実 URL・欄構成・
  削り方の根拠を記載 (例: brother は plain-div 見出しが nearby 外である旨を明記)。
  `dl/dt/dd` (mitsui-reform/tokyu-land/smp/toshiba)・`tr/th` (auhikari) の復元は
  scanner の nearby 読取と整合し、R4-2a レポート §取込時の修正で理由が説明されている。
- [x] **radio/checkbox/hidden 除外**: 全 fixture の skip コメントと ledger の excluded が対応。
  radio は「name 単位1欄・性別/年代のみ分類」文言で統一、checkbox は `skip fixed`、
  hidden/submit/button/textarea は `exclude`。唯一の radio 解決は otsuka `sex → '2'`
  (gender ルール、女) で政策どおり。`type=hidden` が expected に入った例は0件。
  ただし aeon の `hidden_*` は `type=text` (display:none) のため scanner 可視で fill
  される — 下記 Important I-1 に格付け (honest pin + 将来PBI申送り済みのため Spec は ✅)。
- [x] **期待値緑**: 実測で確認 — `tests/integration/samples.test.ts` 61 passed、
  `vitest.eval.config.ts` 3 passed (pin 照合・privacy・no-network)、`tsc --noEmit` clean。
  corpus.eval.ts の既存32行は無変更 (diff は25行の追加のみ) で、R4-3 報告の
  「既存ドリフト 0」と一致。
- [x] **pin 更新**: `tests/eval/corpus.eval.ts` に25行追加。集計は
  57 fixtures / 691 fields / ruleHits 448 (64.8%) / fillable 283 (41.0%) /
  refineChanged 83 / refineDropped 4。新25件は 189/55.4%/121 と低めだが、
  coded-name 系の honest 未分類が主因という説明は ledger (c_q/e_数字の未分類コメント) と整合。
- [x] **de-identified**: 全 fixture の text 系 `value=""` を確認 (非空 value は
  radio/select の option 値のみ)。ledger の期待値は `山田/ヤマダ/千代田/yamada@example.com`
  の synthetic のみ。ページ由来の placeholder (例: `zemi@benesse.co.jp`、
  `taro.suzuki@toshiba.co.jp`) は入力欄の属性の写しで実個人情報ではない。
  privacy テスト緑を実測で再確認。
- [x] **make check exit 0**: R4-3 レポートが exit 0 を記録。本レビューではフル check
  (両ブラウザ build 含む) は再実行せず、構成要素の `vitest samples` + `vitest eval` +
  `tsc` を実測で緑確認。src 無変更のため回帰リスクは最小。

## Honest-pin 抜き打ち (4件。いずれも現行ルール出力を偽らず固定)

1. `otsuka-opinion-form.html` — fixture L1804-1805 (radio 男 value=1/女 value=2) に対し
  ledger `sex: '2'`。name 自体が gender ルールに一致する前例 (bst-inquire) どおりの解決で honest。
2. `toshiba-gx-contact-form.html` — `department → 普通科` を honest pin
  (tests/corpus.ts:2641 付近)。company は未分類のまま。学校 dept 誤読の可能性をコメントで
  明示しており、語彙候補への先送りは正直。
3. `epson-csr-form.html` / `epson-ir-form.html` — ともに `c_q14/15_citycode → 千代田区` のみ
  解決・fillable 0 (tests/corpus.ts:2523/2904 付近 + pin L3203-3204)。coded-name の未分類を
  盛らずに pin しており honest。thin fixture として多様性寄与のみという評価も妥当。
4. `mitsui-chintai-inquiry-form.html` — `singleAnswer(ANSWER1862): ヤマダ タロウ` のみ
  (tests/corpus.ts:1188)。refineDropped=4 は corpus 唯一だが pin L3224 に明示。
  既存ドリフトなしと合わせて、分類パイプラインの劣化ではないという R4-3 の主張と整合。

## 指摘一覧 (file:line 付き)

### Important (将来PBI申送り。R4内対応不要)

- **I-1. Salesforce ミラー欄 (type=text display:none) の fill 是非が未決定**:
  samples/aeon-voice-form.html:14-15 (`hidden_name/sex/email/phone` が in-scope として fill)、
  tests/corpus.ts:1396-1399 (期待値に pin)。`type=hidden` ではないため scanner 可視なのは
  正しいが、「hidden は除外」という AGENTS.md の字面と tension がある。R4-2b N1・R4-3 §8 で
  将来PBI化済み。提案: hidden という名でも `type=text` は fill するという現行仕様を
  AGENTS.md/テスト方針に一行追記するか、ミラー除外の語彙 PBI を起票する。
- **I-2. 住所の重複 fill (C8系) が4 fixtureで pin 済みのまま**:
  tests/corpus.ts:2751-2754 (kojin 二重ブロック)、tests/corpus.ts:1442
  (auhikari `add7: 千代田ビル101` が add6 と同値)、mitsui-reform `address3/4`・
  mitsuihome `address3`・smp `address3`・toshiba `addressone` (連結値)。
  いずれもコメントで honest 宣言済み。refine の重複抑止対象にするかは将来PBI。
  現状マージを止めない。

### Minor (運用・表記の磨き。将来的に直せばよい)

- **M-1. R4-3 レポートの typo**: `.superpowers/sdd/task-R4-3-report.md:38`
  「Struts 栖」→「Struts 棲/系」の誤字。指標・検証には影響なし。
- **M-2. thin fixture の割合**: `ricoh-vulnerability` (fillable 0)・`epson-csr/ir` (0)・
  `ricoh-risb` (0)・`kobe` (1)・`mitsui-chintai` (1)。R4-3 §C9 で多様性寄与として
  正当化済み。 Rule-hit 低下 (55.4%) の説明とセットで PBI 台帳に残すこと。
- **M-3. brother 都道府県値の非JIS順**: tests/corpus.ts:2956 付近
  (`prefecture_master_id → '10'` で東京都に解決)。option-text 解決として honest だが、
  サイトの独自順序に依存する。値ベース照合の前提崩れは R4-2b N3 で申送り済み。
- **M-4. 除外理由コメントの重複行**: `mitsuihome-sonota` の `ie (hidden)` ×2・
  `(no name/id) (submit)` ×2 は fixture の skip コメント (samples 側 L1757-1761) と
  1:1 に対応しており ledger のミスではない。ただし初見ではコピペ重複に見えるため、
  将来は「実ページに同名 control が複数ある」旨を一行添えると親切。
- **M-5. toshiba `Inquiry[agree]` の二重 listed**:
  tests/corpus.ts:954-956 (checkbox skip + hidden exclude + checkbox skip)。
  fixture samples/toshiba-gx-contact-form.html:2234-2236 と対応しており正確。
  hidden+checkbox 同名ペアは Pardot/CakePHP の定型なので、コメントに定型名を残す現状でよい。

### Info (記録のみ。対応不要)

- 作業ツリーの `M AGENTS.md` (sed/Edit 注意書き2行) は base 前からの既存ダーティで
  本ブランチ外。マージ時は含めないこと。
- P3 予備2件 (No.135 BRANZ 4件目・No.179 ホンダ販売店) は未着手。Round5 以降の候補として
  R4-1 レポートに残っている。

## 検証ログ (本レビュー実測)

- `npx vitest run tests/integration/samples.test.ts` → 61 passed
- `npx vitest run --config vitest.eval.config.ts` → 3 passed
  (aggregate fixtures=57 fields=691 ruleHits=448 llmFallbacks=247 fillable=283)
- `npx tsc --noEmit` → exit 0
- `grep -c "^+.*→" tests/target-url.md (39d2aaf..HEAD)` → 25
- `git diff 39d2aaf..HEAD --name-only | grep -E "^(src/|tests/core/|tests/build/|site/|scripts/)"` → なし
