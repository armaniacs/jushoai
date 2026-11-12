# Task SIMP-T2 report — S1 定型テストケースの it.each 集約

- ブランチ: work/pbi-208-round4 (開始時 `git status` clean を確認)
- 正本: `.superpowers/sdd/task-SIMP-T2-brief.md` / `code-review-simplify.md` S1
- 実施: サブエージェント委譲なしで直接作業 (委譲深度の上限到達のため。AGENTS.md の要請とは異なるが手段のみの差異で成果物は同一)

## 変更 (1 commit に集約、push なし)

1. `tests/integration/samples.test.ts`
   - 約116件の3行定型ケース `it('X fills the in-scope fields', …)` を
     `const inScopeFixtures: CorpusName[] = […]` + `it.each(inScopeFixtures)('%s fills the in-scope fields', …)` に集約。
   - ファイル内前例 (`demoForms` 55–58行、`anchorFixtures` 138–147行) と同一様式。型注釈 `CorpusName[]` 付き。
   - 特殊ケースは対象外で現状維持: demo-ai-ambiguous (LLM系)、single-field 等の独自アサーション12件、anchor系2件、radioGroups テーブル+テスト。
   - ファイル順序は従来通り (batch1 9件→batch2 107件の順で配列化)。実行順は radioGroups テストの前倒し分だけ変わるが各テストは独立 (DOM を都度再構築) のため影響なし。
   - 差分: +120 / -347 (306→約130行付近。S1 の見込み「約200行削減」と一致)。
2. `scripts/add-fixture.mjs:124` (読み戻し検証)
   - `it('${wiring.file} fills the in-scope fields'` 含有照合 → `'${wiring.file}'` 含有照合 (ファイル名配列の含有照合)。趣旨コメントを付記。
3. `scripts/sync-target-urls.mjs:158-159` (read-back 検証)
   - `it('${name} fills the in-scope fields'` 含有照合 → `'${name}'` 含有照合。趣旨コメントを付記。
   - `:123` の wired-skip 判定 (`'${file}'` 含有) は既にファイル名照合形で集約後も正しく動くため無変更 (意図的)。
4. 触っていないもの: `src/`・`samples/` fixtures・`tests/corpus.ts` (LEDGER)・`tests/eval/corpus.eval.ts` (pin)・上記以外の scripts。
   - `renderCaseStub`/`insertTestCase` の生成形式は変更なし。理由: `tests/scripts/add-fixture.test.ts:60-80` が旧形式を pin しており、当該テストファイルは brief の対象外のため。帰結は concerns に記載。

## 検証 (全緑)

- `npx vitest run tests/integration/samples.test.ts`: 138 passed (前後同数)。verbose 出力のテスト名を集計し、変更前 (`git show HEAD:` から展開した138名) と `diff` で完全一致を確認 (TITLES-IDENTICAL)。`fills the in-scope fields` 出現数は前後とも 232 (=116件×2行表示)。
- `make addurl-check` (= `node scripts/sync-target-urls.mjs --check`): `addurl-check: no '<expected>' remnants.` ゼロ。
- 全テスト `npx vitest run`: 177 files / 2508 passed + 1 expected fail。tooling 単体 (`tests/scripts/`) 28 passed を含む。
- `npx tsc --noEmit`: exit 0。
- tooling の配線検出生残 (破壊なし・ネットワークなしの範囲):
  - 実ソースに対する新述語の smoke: registry の配線済み 121/121 件が `test.includes('file') && ledger.includes('file': {)` で wired 判定、架空名 `no-such-form.html` は missing 判定、既知配線済み (`sekisui-inquiry-form.html`) の add-fixture 側読み戻し述語は true。
  - `buildWiring(...).applyWiring` を集約形の合成ソースに適用→新読み戻し述語 (ledger/test とも true)、アンカー欠落時は `null` (wiring-failure 検出維持)。
  - `make addurl` の実走 (新規 URL の fetch) はネットワーク要のため未実施→検証限界として明記。ただし `make addurl` 経路 (`sync --only`) は `:123` の skip 判定が集約後も有効なことを上記 smoke で確認済み。

## Concerns

1. 将来の `make addurl` は旧形式の単発 `it('X fills the in-scope fields')` スタブを末尾に追加する (生成側は対象外のため未変更)。動作・読み戻し検証は通るが、様式の混在 (drift) が起きる。次回 touch 時に配列への手寄せか、生成側の配列追記化 (別タスク・要テスト更新) を検討。
2. 単発 `node scripts/add-fixture.mjs <url>` を配線済み URL に再実行した場合、旧 `insertTestCase` の冪等検出 (先頭行照合) が効かず重複 `it()` が追加され得る。`make addurl` (`sync --only`) 経路は `:123` で skip されるため安全。単発 CLI の再実行は避けること。
3. 新読み戻し述語 (`'file'` 含有) は旧 (`it('file fills…')` 含有) より緩い。引用符付き完全一致のため誤検出は実質ないが、理論上は別リスト (例: anchorFixtures) に同名があれば wired 扱いになる。現行 registry に該当例なし (smoke で121/121確認)。
4. AGENTS.md のサブエージェント駆動要請に対し本タスクは直接実施 (委譲深度上限)。レビュー指摘のあった場合は別途 subagent に検証委譲可能。
