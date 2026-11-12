# Task SIMP-T2f report — addurl生成側の it.each 対応

- ブランチ: work/pbi-208-round4 (開始時 `git status` clean を確認)
- 正本: `.superpowers/sdd/task-SIMP-T2f-brief.md` / `.superpowers/sdd/task-SIMP-T2-report.md` (concerns #1/#2)
- 実施: サブエージェント委譲なしで直接作業 (委譲深度の上限到達のため。AGENTS.md の要請とは異なるが手段のみの差異で成果物は同一。T2 と同じ扱い)

## 変更 (1 commit に集約、push なし)

commit 01a48bc5ae6961bd6a51529a2fb0c79f4fb77e53
`refactor(tooling): addurl生成をinScopeFixtures配列への追記に統一し重複guardを追加`

1. `scripts/add-fixture.mjs`
   - 旧 `renderCaseStub` (単発 `it('X fills the in-scope fields')` スタブ生成) を削除。
   - 旧 `insertTestCase(source, stub)` (最終 `});` 前へのスタブ挿入) を `insertFixtureEntry(source, file)` に置換。
     `inScopeFixtures` 配列宣言 (`const inScopeFixtures: CorpusName[] = [`、正規表現 `INSCOPE_ARRAY_RE` で検出) の
     閉じ `];` 行の行頭に `    'file',` を1行追加する。配列宣言がなければ `null` (配線失敗として caller が中断。従来の anchor 欠落時の契約を維持)。
   - 重複 guard: ソースが `'file'` (配列要素) または `it('file fills the in-scope fields'` (集約前のレガシースタブ) を
     含む場合はソース不変で返す。再実行で重複も様式混在も起きない (T2 報告 concern #2 の解消)。
   - `buildWiring().applyWiring` は新挿入関数を使用。CLI の失敗メッセージと読み戻しコメントを配列前提に更新。
     読み戻し述語そのもの (`'file': {` / `'file'` の含有照合) は T2 で更新済みの形のまま。配線検出の意味は不変。
2. `scripts/add-fixture.d.mts`
   - `insertTestCase` 宣言を削除し、`INSCOPE_ARRAY_RE` と `insertFixtureEntry` の宣言を追加。
3. `tests/scripts/add-fixture.test.ts`
   - stand-in の test ソースを `inScopeFixtures` 配列 + `it.each` 形に更新。
   - 新テスト: 配列へ1行追加・再追加は不変 (dup guard)・レガシースタブ混在時も不変・配列欠落時は `null`。
   - `buildWiring` テスト: 配線結果が `    'c.html',` を含み、単発 `it()` を含まず、`it.each` が残ること。二重配線が完全 no-op であることも検証。
4. 触っていないもの: `src/`・`samples/` fixtures・`tests/corpus.ts` (LEDGER)・`tests/eval/corpus.eval.ts` (pin)・
   `tests/integration/samples.test.ts` (生成側が正規表現で配列を検出するため test 本体への変更は不要だった)・
   `scripts/sync-target-urls.mjs` (wired-skip `:123` と read-back `:160-161` は T2 後の `'file'` 含有照合のままで配列要素と整合するため無変更)・
   `scripts/scaffold-fixture.mjs` (手動取込時の stdout 雛形 `renderTestStub` は brief 対象外のため無変更。残留 concern として下記に記載)。

## 検証 (全緑)

- `npx vitest run tests/integration/samples.test.ts`: 138 passed (T2 と同数)。
- `make addurl-check` (= `node scripts/sync-target-urls.mjs --check`): `addurl-check: no '<expected>' remnants.` (ゼロ)。
- `npx vitest run tests/scripts/`: 28 passed (更新後の tooling 8+20)。
- 全 suite `npx vitest run`: 177 files / 2508 passed + 1 expected fail (T2 ベースラインと同一)。
- `npx tsc --noEmit`: exit 0。
- 生成経路の非破壊検証 (実 URL の `make addurl` 走行はネットワーク要のため未実施。以下はすべてメモリ上 + tmp コピーで実 repo ファイルへの書き込みなし):
  1. 実ソース (`tests/corpus.ts` + `samples.test.ts`) に対する架空新規 `zz-dryrun-verify-form.html` の `buildWiring().applyWiring` が
     非 null、ledger read-back (`'file': {`) 真、test read-back (`'file'`) 真、単発 `it()` なし、`it.each` 健在を確認。
  2. 同一配線の再適用が両ソース完全不変 (dup guard)。
  3. 配線済み既存 `sekisui-inquiry-form.html` の再実行が両ソース完全不変 (concern #2: 単発 CLI の再実行安全)。
  4. 配列宣言なし → `null`、ledger anchor なし → `null` (配線失敗の検出維持)。
  5. 実 `samples.test.ts` の tmp コピーへ適用した `diff` が `265a266 / >     'zz-dryrun-verify-form.html',` の1行追加のみ。
  6. registry 全件 (`tests/target-url.md` の file 付き 121 件) が sync と同一述語で wired 判定 (121/121。T2 の smoke と同値で破壊なし)。
- 検証の限界: 実ネットワーク経由の `make addurl URL=...` 走行は未実施 (外部 fetch 要)。ただし `make addurl` 経路は
  `sync --only` → 同一 `buildWiring`/`applyWiring`/read-back であり、上記 1–6 で全段階を覆盖済み。

## Concerns

1. `scripts/scaffold-fixture.mjs` の `renderTestStub` は旧形式の単発 `it()` を stdout に出すまま (brief 対象外のため無変更)。
   手動取込でその雛形を貼ると様式混在が起きる。次回 touch 時に配列要素の雛形化か、addurl 経路への一本化を検討。
2. 新 dup guard の `'file'` 含有照合は T2 の読み戻し述語と同一で、理論上は別リスト (例: anchorFixtures) に同名があれば wired 扱いになる。
   現行 registry に該当例なし (121/121 smoke で確認)。T2 報告 concern #3 と同一の既知の緩さで、新規悪化なし。
3. 配列検出は `const inScopeFixtures: CorpusName[] = [` の正規表現に依存する。test 側の宣言様式を変える場合は tooling 側の同時更新が必要。
   LEDGER 側のような明示 anchor コメントはない (test 本体への変更をゼロに抑える選択)。将来の様式変更時は `INSCOPE_ARRAY_RE` を更新すること。
