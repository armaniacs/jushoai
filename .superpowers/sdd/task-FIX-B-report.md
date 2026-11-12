# Task FIX-B report — M3/M4 照合の厳格化

- ブランチ: work/pbi-208-round4 (開始時 `git status` clean を確認。終了時も `tests/corpus.ts` 不変)
- 正本: `.superpowers/sdd/task-FIX-B-brief.md` / `final-review-SIMP.md` M3/M4
- 前提: `task-SIMP-T2-report.md` concerns #3、 `task-SIMP-T8-report.md` concerns #2
- 実施: サブエージェント駆動なしで直接作業 (委譲深度の上限到達のため。手段のみの差異)
- 方針: 厳格化で smoke が落ちた箇所は revert ではなく「smoke を維持する厳密さ」に調整した。現状維持に倒した項目はなし (全件厳格化を完遂)。

## 変更 (1 commit に集約、push なし)

1. `scripts/add-fixture.mjs`
   - `isFixtureWired(source, file)` を新設・export。wired 判定は次のいずれかのみ:
     - `inScopeFixtures` 要素行 (先頭改行 + 4空白付き `` `\n    'file',` ``。`insertFixtureEntry` の書式と同一)
     - レガシー単発 stub 表題 `it('file fills the in-scope fields'`
     - `planFor('file'` テスト本体呼び出し (後述の5件 specials のため)
   - `insertFixtureEntry` の dup guard と CLI read-back (`testWired`) を同関数に一本化。
   - M3 の要点: brief 例示の `'${file}',` カンマ形では不十分であることを実証した。`anchorFixtures` は単一行 `['a.html', 'b.html']` であり先頭要素に `'a.html',` (カンマ付き) が含まれるため、カンマ形でも別リスト同名を wired 扱いする。改行+インデント付き形のみが `anchorFixtures` を除外しつつ `inScopeFixtures` 全行 (先頭・末尾含む) に一致することを実ソースで確認した。
   - `planFor('file'` 追加の理由: レジストリ対応5件 (formmailer-anketo-gender / formmailer-raijo-age / overseas-webform-joshibi / furigana-fieldset-form / reinvent-registration-contact) は custom 表題の単発 `it()` + 本体 `planFor('file')` で配線されており、要素行・レガシー表題のいずれにも一致しない。含めないと strict 判定で 116/121 wired となり `sync --only/--all` が当該5件を未配線扱いして `inScopeFixtures` へ重複追記する退行を起こす (brief の smoke 維持要件に違反するため追加した。`planFor('` 接頭辞付きであり bare 含有ではない)。
2. `scripts/sync-target-urls.mjs`
   - M3: wired-skip (`:135` 相当) と read-back (`missing`) の test 側照合を `isFixtureWired` (add-fixture.mjs から import) に置換。ledger 側 `'${file}': {` は従来どおり厳密形のまま。URL fallback (`l.includes(url)`) は M3 の対象外 (file 照合ではない) のため不変。
   - M4: `stampRegistry` の writer のみ旧厳格 (`m[1].trim().slice(2) === url` と同等) に戻した。条件に `/^\s*-\s$/.test(parsed.prefix)` を追加。dash 直後は単一空白文字のみ (前置インデントは許容。旧 `slice(2)` が dash+1文字を落とす意味と等価で、単一タブも旧どおり stamp 可)。reader (`parseRegistryLine`/`REGISTRY_LINE_RE`) は tolerant のまま (旧 reader も tolerant だったため忠実な復元)。
3. `scripts/add-fixture.d.mts`: `isFixtureWired` 宣言を追加。
4. `tests/scripts/add-fixture.test.ts`: M3 テスト2件 (isFixtureWired の5形状判定 + anchor 単一行が dup guard を誤作動させないこと)。
5. `tests/scripts/sync-target-urls.test.ts`: M4 テスト2件 (複数空白行は不変・インデント/単一タブは stamp・reader は tolerant のまま)。
6. 触っていないもの: `src/`・`samples/`・fixtures・LEDGER (`tests/corpus.ts`)・pin・`samples.test.ts` 本体・`tests/target-url.md`。brief 対象制限 (scripts/ + tests/scripts/ のみ) を遵守。

## 検証 (全緑・非破壊)

- `npx vitest run tests/scripts/`: 3 files / 37 passed (変更前 33 + 新規 4)。
- `npx vitest run tests/integration/samples.test.ts`: 138 passed。
- 全 suite `npx vitest run`: 2517 passed + 1 expected fail (T8 時 2513 + 新規 4。collateral なし)。
- `npx tsc --noEmit`: exit 0。
- `make addurl-check`: `addurl-check: no '<expected>' remnants.` (ゼロ)。
- 生成経路の非破壊検証 (実 repo への書込なし。memory + tmp コピーのみ。実ネットワーク走行なし):
  1. 架空新規 `zz-dryrun-verify-form.html` の `buildWiring().applyWiring` が非 null、ledger read-back 真、strict test read-back 真、単発 `it()` なし、`it.each` 健在。
  2. 同一配線の再適用が両ソース完全不変 (dup guard)。
  3. 配線済み既存 `sekisui-inquiry-form.html` の再実行が両ソース完全不変。
  4. 配列宣言なし → `null`、ledger anchor なし → `null` (配線失敗の検出維持)。
  5. tmp コピー適用の `diff` が `265a266 / >     'zz-dryrun-verify-form.html',` の1行追加のみ。
  6. registry 対応 121件が strict 述語 + ledger 述語で 121/121 wired。架空名 `no-such-form.html` は missing。
  7. `stampRegistry`: 単一空白行は stamp、複数空白行は不変 (URL 既存のため append もなし)。
- レジストリ実態: `tests/target-url.md` の dash 121行は全行 `- url` 単一空白均一のため M4 の実効差はなし (brief の予測どおり。テストで確認)。

## Concerns

1. brief 例示 (`'${file}',`) からの意図的逸脱: 例示形では M3 の目的 (別リスト同名の誤検出ゼロ) が達成できない (anchorFixtures 単一行の先頭要素が `'x',` を含む) ため、改行+インデント付き形に強めた。目的自体は brief どおり。
2. `planFor('file'` 選言の追加: 要素行・レガシー表題だけでは 116/121 となり smoke 維持要件を満たせないため追加した。`planFor('` 接頭辞付きの seam 照合であり bare 含有への後退ではない。将来 custom 表題以外の配線形状 (例: radioGroups テーブルだけに載る新規形) が増えたら同関数の選言追加 + 本テスト更新が必要。
3. `sync-target-urls.mjs:46` の URL fallback (`l.includes(url)`) は M3 対象外として緩いまま。URL の部分一致 (例: `.../a` が `.../ab` 行に含まれる) で append を抑止し得るが、現 registry では発現せず、旧来からの挙動のため不変とした。
4. 配列検出は `const inScopeFixtures: CorpusName[] = [` の正規表現依存のまま (T8 concern #3 と同一。今回不変)。
5. AGENTS.md のサブエージェント駆動要請に対し直接実施 (委譲深度上限のため)。

## Revert 判断

- なし。M3/M4 とも厳格化を維持したまま全検証が緑のため、現状維持への revert は不要だった。
