# Final Review — SIMP-T1〜T9 (read-only)

- 対象: `work/pbi-208-round4`、`6626602..8ca5309` (差分パッケージ `.superpowers/sdd/review-6626602..8ca5309.diff`、140 files、12101行で検証)
- 正本: `.superpowers/sdd/code-review-simplify.md` (C1・S1〜S9)、各タスク報告 `task-SIMP-T*.md`
- 方法: read-only。全 `+`/`-` 行を機械的に分類し、タスク報告の主張と突き合わせ。コード変更なし。
- 注意: 当該 range には SIMP 以外に R4-11a/11b 由来の新規 fixture 5件 (fujita / yamada-holdings / apaman / jpaa / nkanzai + pin・registry) が含まれる。これらは SIMP の成果ではなく前提として扱い、SIMP との干渉がないことのみ確認した (章末に範囲外所見として分離記載)。

## Verdicts

- **Spec: ✅ (9/9 実施。S3 は除外条件優先の代替形で適合。S9 は維持を確認)**
- **Quality: With findings (Critical 0 / Important 0 / Minor 5。いずれも disclosed または無害で、merge を止めるものではない)**

件数: Critical 0 / Important 0 / Minor 5 (うち2件は範囲外 R4-11b 由来の観察記録)。

## 1. Spec compliance (C1・S1〜S8 + 除外条件)

| 提案 |  verdict | 根拠 |
|---|---|---|
| C1 (文字化け placeholder) | ✅ | `samples/sekisui-catalog-request.html` 8件、`samples/sekisui-inquiry-form.html` 9件の `placeholder` 属性のみ削除。差分は属性削除だけ (`+` 行は placeholder なし同型に復帰)。他 fixture・`src/` 不変。T1f で期待値 (`name-kana1: ヤマダ` / `name-kana2: タロウ`)・pin (13,4,8,5,5)→(15,4,10,7,3) を1箇所だけ追随。pin 全体では値変更はこの1行のみ、脱落0 (下記検証)。 |
| S1 (it.each 集約) | ✅ | 削除111件の単発 `it()` 名が `inScopeFixtures` (116件=111+新規5) に全件含有。逆差分なし。`it.each(inScopeFixtures)('%s fills the in-scope fields', …)` でテスト名は `%s` 展開により同一。tooling 照合は `add-fixture.mjs` 読戻しと `sync-target-urls.mjs:160-161` を `'file'` 含有に更新。`:123` の wired-skip 判定は既にファイル名形だったため無変更が正しい。`radioGroups`・特殊12件・anchor系は不変 (radio 含有の dels/adds は0)。 |
| S2 (skip コメント→LEDGER 一本化) | ✅ | `samples/` の `<!-- skip: … -->` 2453行 (111 files) を全削除。worktree の `grep -rn "skip:" samples/` は0件。生成側は維持 (`scripts/scaffold-fixture.mjs:81` の `skipNote` 現存)。scaffold 出力の `trim further before committing` 定型文は残置 (意図的・無害)。 |
| S3 (LEDGER 理由の短縮) | ✅ (代替形) | 素朴な理由コード化は行わず、理由リテラルを一字一句維持したままキー束ね (S4 記法) で削減した。除外条件「理由リテラル不変」を S3 の字面より優先した判断であり、正本の趣旨 (PBI-216 の記録性保持 + 容量削減) を満たす。net -1838行。 |
| S4 (xN / slash-join 集約) | ✅ | `try-gakuin` の `event_data[]` 274連らを `… x274` 1行に、`sekisui-catalog` の `CID x20` / `(no name/id) x45` 等に集約。fixture 本体は `try-gakuin-reserve-form.html` 286行 (全て skip) + 旧3 fixture の hidden/checkbox/submit 実要素33行のみ。信号 (label/placeholder/name/id/option/select/radio/text 系) の削除は samples 全体で0件 (機械分類で確認)。 |
| S5 (pin 行 factory) | ✅ | `const p = (ruleHits, llmFallbacks, fillable, refineChanged, refineDropped)` を追加し134行を `p(…)` 化。非 pin 削除は0行で双方向照合・合計照合は無改変。pin 値は sekisui-inquiry の1行のみ変更 + 新規5行追加。 |
| S6 (scripts 重複一本化) | ✅ (機能完遂・行数見込み未達は開示済み) | `insertAboveAnchor`、`formatExpectedLines/ExcludedLines`、`renderLedgerEntry` の scaffold 集約、`REGISTRY_LINE_RE` + `parseRegistryLine` を確認。production net +48行で「約40行削減」見込みは未達だが、超過分は T2f 残務だった stub 配列対応の新規行であり T8 報告 concerns #1 で開示済み。 |
| S7 (同値 expected 共有) | ✅ | `EPSON_EXPECTED` (2キー)・`FF_EXPECTED` (12キー) を LEDGER 直前に定義し5箇所を参照置換。キー・値は完全同一 (コメント除去 diff ゼロを報告が主張、差分上で kv 一致を確認)。`excluded` は非共有のまま (epson の `1.Eメールアドレス` 等の番号接頭辞を worktree で現存確認)。fixture の共通化なし (samples に fixture 構造変更なし)。 |
| S8 (書式不整合は churn 禁止) | ✅ | doctype 含有の diff 行は0。`value=""` / `id=""` の diff は placeholder 除去後の sekisui 行と削除 hidden シム行のみで、正規化 churn なし。T9 (commit `8ca5309`) は SDD 2件のみの commit でコード無変更。方針 (bare 形を正・既存不変・scaffolder 既定維持) はテストの body-only 参照と整合。 |
| S9 (現状維持) | ✅ | `tests/integration/samples.test.ts` の radioGroups テーブルに dels/adds なし。 |
| 除外条件横断 | ✅ | `src/`・`Makefile`・`site/` の diff はゼロ。理由リテラルは LEDGER 全体で維持 (非 excluded 削除は置換5 expected ブロックのみで kv 同一)。PBI-216 の trace は sekisui excluded 行内の「SIMP-T1 で削除済み」注記で保持。 |

## 2. Task quality (重点: T3・T4・T8 + pin drift・配線破壊の有無)

- T3 (fixture 削除): 承認。286行 (try-gakuin) は全て単独行 skip コメント。旧3 fixture の33行は hidden シム・checkbox 質問ブロック・key hidden・submit のみで、legend 削除 (`当物件をどこで知りましたか?`) も scanner の nearby 参照範囲 (tr/dd/fieldset) 外のため漏洩なし。報告の主張と差分は一致し、samples 期待値・eval pin は無変更のまま全緑が報告されている。
- T4 (LEDGER 集約): 承認 (Minor M1 あり)。corpus.ts の削除2199行のうち非 excluded 行は FF×3 + EPSON×2 の置換 expected ブロック (74行) のみで、置換先 const の kv と一致。同一行反復の束ねに対応する `xN`/slash-join の `+` 行は全て標準 suffix 付き excluded 形式。
- T8 (scripts): 承認 (Minor M3・M4 は開示済み・無害)。`insertAboveAnchor` は LEDGER anchor 行頭・配列 `];` 行頭の双方に正しく挿入される形状。dup guard・null 契約は維持。`tests/scripts/` 33 passed (28+新規5) が報告されている。
- pin drift: なし。値変更は sekisui-inquiry の1行のみ (機序は `src/core/kana.ts` の veto 解除で説明され実測一致)。新規5行は R4-11b 新規 fixture 分。脱落0。
- tooling 配線破壊: なし。新旧述語の smoke (121/121 wired、架空名 missing、再適用 no-op、anchor 欠落 null) が報告され、差分上の述語変更と整合。`d.mts` 3件も輸出宣言が同時更新されている。

## 指摘 (file:line 付き)

### Minor

- M1: `tests/corpus.ts:38` — コメント `fill the same thirteen Drupal-form fields` に対し `FF_EXPECTED` (`tests/corpus.ts:43-57`) の実キーは12件 (`name[first]` / `name[last]` / `name_kana[first]` / `name_kana[last]` / `e_mailatoresu[mail_1]` / `e_mailatoresu[mail_2]` / `qinwuxianxuexiaoming` / `postal_code` / `city` / `jianwuming` / `tel` / `fax`)。T6 報告の「同一13件」とも不一致。テスト・動作への影響なし (prose のみ)。直すなら `thirteen`→`twelve` と報告の件数表記。
- M2: `tests/corpus.ts:2708` — `reserve[category_type]/reserve[media_type]/reserve[referrer]/event_type/event_data[] x274` の `x274` は bundle 末尾に付くため「束全体×274」にも読める (実態は単体4キー + `event_data[]`×274 のはず)。T4 報告の R1 規約 (`key xN`) と表記上ずれる。監査上は多重集合一致が主張されておりデータ欠落ではない。可読性の wart として、将来 touch 時に `(event_data[] x274)` の括弧化か注記を検討。
- M3: `scripts/add-fixture.mjs` (T2f 由来、`insertFixtureEntry` の dup guard) および `scripts/sync-target-urls.mjs:160-161` 読戻し — `'${file}'` 含有照合は旧 `it('… fills …')` 含有より緩く、理論上は別リスト (例: anchorFixtures) の同名を wired 扱いにする。現 registry 121件で該当なし・smoke 済みで、報告 (T2 concerns #3 / T8 concerns #2) で開示済み。新規悪化なし。対応不要。
- M4: `scripts/sync-target-urls.mjs` (`stampRegistry`) — 旧 `m[1].trim().slice(2) === url` に対し新 `parsed.url === url` は `-` 直後の複数空白行にも一致する (緩和方向)。対象 registry は全行 `- url` 均一のため実効差なしで、T8 報告で開示済み。対応不要。
- M5 (範囲外・R4-11b 由来の観察記録。SIMP の verdict には算入しない): `tests/corpus.ts:3221` (`mw-wp-form-form-id/mw_wp_form_token/mw-wp-form-form-id/mw_wp_form_token`) と `tests/corpus.ts:3235` (`cx/cof/ie/cx/cof/ie`) は同一行内に重複キーを含む新規 LEDGER 行 (R4-11b の jpaa / nkanzai 追加分)。分類・テストへの影響はなく、SIMP の集約が作ったものでもない。将来 touch 時に `x2` 記法への寄せを検討。

### Important / Critical

- なし。

## 検証ログ (本レビューで実行した読取り専用の確認)

- `grep "^diff --git"` 140 files。`src/`・`Makefile`・`site/` の diff ゼロ。
- samples: `+` 行を持つのは新規5件 (R4-11b) と sekisui-inquiry の placeholder 除去9行・sekisui-catalog の同型8行のみ。`-` 行のうち skip/化け placeholder/T3 既知要素に該当しないものは0件。doctype 含有変更0件。
- `samples.test.ts`: 削除111件の `it()` 名は配列116件に全件含有 (差分5件は新規 fixture)。radio 含有の dels/adds は0件。単発 `it('…fills…')` の `+` 行は0件。
- `tests/corpus.ts`: 非 excluded 削除は FF×3 + EPSON×2 の expected ブロックのみで置換 const と kv 一致。sekisui-inquiry は expected +2 / excluded 訂正1行 (履歴注記付き)。
- `tests/eval/corpus.eval.ts`: 非 pin 行の削除0。値変更は sekisui-inquiry (13,4,8,5,5)→(15,4,10,7,3) の1行のみ。脱落0、追加5行 (新規 fixture)。
- T9 commit `8ca5309`: SDD 2件のみ。worktree: `samples/` の `skip:` 0件、`inScopeFixtures` 2箇所 (宣言+`it.each`)、`EPSON/FF_EXPECTED` 参照5箇所、`scaffold-fixture.mjs:81` の skipNote 生成が現存。
