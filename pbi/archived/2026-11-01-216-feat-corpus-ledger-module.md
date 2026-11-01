# PBI: corpus 台帳の 1 module 化（2 台帳の統合 + add-fixture tooling の regex 編集を interface 消費に変える）

## ユーザーストーリー
保守担当者として、sample corpus の台帳が 1 つの module に束ねられ（name → html + per-fixture 期待値/除外理由）、fixture 追加の配線が「正規表現に一致させる」でなく「interface を使う」になってほしい、なぜなら同じ corpus に 2 つの台帳が異なる収集機構で同居し、台帳に interface がないため tooling が samples.test.ts のソーステキストを regex 解析して機械編集しており、map の形を手で変えると replace が黙って no-op してツールは「wired a case」と成功を報告し、失敗は次の make test の実行時 TypeError として遅れて顔を出すから

## 優先度
- 順位: 4 / 8（優先順位付けラウンドでユーザー承認済みの RICE 順位）
- RICEスコア: 3.2（Reach=1.0（全 fixture 追加の保守タッチ）/ Impact=2（大きい・regex no-op の静かな失敗 + 2 台帳の drift）/ Confidence=80%（収集機構の統一方式は glob で実績あり）/ Effort=0.5 人週（tests/integration + tests/eval + scripts/add-fixture.mjs + 全 fixture の import 削除込み））
- 根拠: regex no-op の静かな失敗解消 + 2 台帳統合。台帳に interface がないことが、tooling がソーステキストを regex 解析して機械編集する直接の原因で、AI-navigability の観点でも fixture 追加手順が「interface を使う」になり「正規表現に一致させる」でなくなる
- 依存: PBI-212 の後に実施（samples.test.ts が同じファイルのため競合。212 は 2026-10-31 実装済み）。pin 表化（215）との順序は自由だが、corpus 土台を先にすると pin 表の置き場所が確定する

## 出どころ
- なぜなぜ分析（.superpowers/sdd/why-why-arch-2026-10-31-summary.md）の発見 2a/2b:
  - 発見 2a（corpus 台帳の 1 module 化）: tests/integration/samples.test.ts の手動 import 台帳（:9-35 の 27 本の ?raw import + :38-66 の SAMPLES map）と tests/eval/corpus.eval.ts:8 の glob 台帳（import.meta.glob 自動収集、PBI-136 のコメント付き）が同じ corpus に異なる収集機構で同居している
  - 発見 2b（add-fixture regex 編集の解消、保守担当者 Top 2）: scripts/add-fixture.mjs:35 の regex 編集が黙って no-op し、ツールは成功を報告。失敗は実行時 TypeError として遅れて顔を出す
- 開発運用 Top 2（項目 3+4 corpus 土台コミット）: 台帳 1 module 化 + addurl regex 編集解消を語彙追加と混在させず、独立コミットに置く。212 が先に実装済みのため、本 PBI は 212 の後の独立コミットとして corpus 土台を置く（なぜなぜ分析時点の「212 の前」は 212 未実装を前提にした順序で、混在させない狙いは同じ）
- 現状コード（2026-11-01 起票時）:
  - scripts/add-fixture.mjs:26-30（insertImport。samples import 行を regex で拾う）と :32-36（insertSampleEntry。SAMPLES map を regex で拾う）は、replace が一致しないとソースを無変更で返す。CLI（:79）は台帳の有無に関係なく「wired a case into samples.test.ts」と成功を報告する
  - insertTestCase（:38-44）はソース末尾の `\n});` に stub を挿入するため、import/map の no-op と case の挿入が分離して壊れる（fixture は書かれ case は足されるが台帳に載らず、`SAMPLES[file]!`（samples.test.ts:89）が undefined のまま走って make test が落ちる）
  - scripts/sync-target-urls.mjs:6・:128-130 も buildWiring（add-fixture.mjs:46）を共有するため、tooling の修正は make addurl と台帳一括 sync の両方に効く
  - tests/scripts/add-fixture.test.ts は insert 関数の「1 回だけ入る・2 回目は無変更」という成功経路だけを固定し、台帳の形が手で変わった経路（no match → 無変更で通る）は検査していない
  - corpus.eval.ts:5-8 の PBI-136 コメントは「no second registry」を実現しているが、それは eval 側だけで、corpus 全体では samples.test.ts 側の手動台帳が第 2 の台帳として残っている

## BDD受け入れシナリオ
Scenario: make addurl が corpus module の interface を消費して fixture を追加する
  Given corpus 台帳が 1 つの module（name → html + per-fixture 期待値/除外理由）に束ねられ、収集が glob 自動方式の状態
  When make addurl URL=<url> を実行する
  Then fixture HTML が samples/ に書かれ、新しい fixture は台帳編集なしで corpus に載る（glob 自動収集）
  And 期待値の雛形と除外理由は tool が corpus module の interface 経由で台帳に追加する（samples.test.ts の import ブロックと SAMPLES map への機械編集は起きない）
  And その後人が最小再現に削って期待値を埋めると、make test と make eval が新しい fixture を含んで緑になる

Scenario: 台帳の形を手で変えても tool が壊れない（regex 編集が消える）
  Given corpus module の台帳 entry の形を手で変えた場合
  When make addurl を実行する
  Then tool は samples.test.ts のソーステキストを regex 解析して機械編集しない（interface 消費なので entry の形の変更が tool を静かに no-op させない）
  And 台帳の更新が反映されない場合、tool は失敗を報告する（成功を偽報告しない）

Scenario: 2 台帳が 1 つに束ねられ収集機構が統一される
  Given samples.test.ts の手動 import 台帳と corpus.eval.ts の glob 台帳が同居している
  When corpus を 1 つの module に束ね替える
  Then 両テストは同じ module から fixture を取得し、収集機構は glob 自動方式に統一される
  And 全 fixture の期待値と make eval の pin は不変で緑になる

## 受け入れ基準
- [x] samples.test.ts の手動 import 27 本（:9-35）と SAMPLES map（:38-66）が消え、fixture 取得は corpus module 経由になっている
- [x] corpus.eval.ts:8 の glob 収集が corpus module 経由になり、収集機構が glob 自動方式に 1 つに統一されている
- [x] corpus module が name → html + per-fixture 期待値/除外理由の interface を公開している（pin 表化 215 の置き場所になる）
- [x] scripts/add-fixture.mjs の insertImport（:29）・insertSampleEntry（:35）による samples.test.ts ソースへの regex 機械編集が消え、tooling は corpus module の interface を消費している（sync-target-urls.mjs の buildWiring 共有分も同じ経路で直る）
- [x] make addurl の手順自体は不変（URL=<url> の 1 コマンドで tests/target-url.md 登録・取得・雛形生成・テスト配線。内部実装だけ interface 消費に替わる）
- [x] 台帳の更新が反映されないとき tool は失敗を報告する（replace が黙って no-op したまま「wired a case」と成功を報告する経路が消える）
- [x] 全 fixture の期待値は不変（samples.test.ts の各ケースの期待値と、make eval の pin 203/61/125・refineChanged 28・refineDropped 0 が束ね替え前後で不変）
- [x] make test + make eval が緑、make check が exit 0

## テスト戦略
- E2E: なし（本 PBI は tests/ と scripts/ の台帳整理で、ブラウザ上の挙動は触れない）
- 統合: make test（全 fixture の期待値が束ね替え前後で不変のことを比較する）+ make eval（pin 203/61/125・refineChanged 28・refineDropped 0 が不変）
- 単体: make addurl の smoke 確認（雛形生成後に台帳の entry が interface 経由で追加されることを 1 fixture で確認。台帳の更新が反映されない経路は失敗を報告することを手で確認）

## 見積もり
2（要チームでの見積もり。RICE の Effort=0.5 人週）

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）

```bash
sed -n '9,66p' tests/integration/samples.test.ts
sed -n '5,8p' tests/eval/corpus.eval.ts
sed -n '26,44p' scripts/add-fixture.mjs
grep -rn 'buildWiring\|applyTest' scripts/
```

未実装の確認済み（2026-11-01 起票時）: sample corpus の台帳 module は無く、samples.test.ts は手動 import 27 本 + SAMPLES map、corpus.eval.ts は import.meta.glob 自動収集のままで 2 台帳が同居している。add-fixture.mjs は regex で samples.test.ts のソースを機械編集している。

### 実装手順
1. corpus 台帳 module を tests/ 配下の共有位置（例: tests/corpus.ts。配置は実装中に調整可）に作る。interface は name → html + per-fixture 期待値/除外理由（期待値は未収載の fixture では任意にして、glob 収集は html の追加だけで corpus に載る）。除外理由（samples.test.ts の各ケース内の `//   field_xxx ...` コメント行）を entry のデータに移す
2. corpus.eval.ts の glob 収集（:8）を corpus module 経由に替える（glob は module 内の 1 か所に集約。pin 203/61/125 は不変）
3. samples.test.ts を corpus module 経由に替える。手動 import 27 本と SAMPLES map を削除し、各ケースは台帳から fixture を取得する。台帳の期待値 entry を走らせる形（it.each など）にまとめるかどうかは、特殊ケースの扱いと合わせて実装中に調整
4. scripts/add-fixture.mjs の applyTest（:53-57）を interface 消費に替える。insertImport・insertSampleEntry による samples.test.ts ソースへの regex 機械編集を削除し、台帳 entry（期待値雛形・除外理由）の追加に替える。buildWiring を共有する sync-target-urls.mjs は同じ経路で直る
5. 台帳の更新が反映されないとき tool が失敗を報告するようにする（書き換え後に台帳を読み戻して entry の在り方を検証するか、insert 関数の戻り値で無変更を失敗として扱う。CLI の成功報告は検証後に限る）
6. tests/scripts/add-fixture.test.ts を interface 消費に合わせて替える（台帳の形が変わった経路が失敗を報告することも検査する）
7. make test と make eval で全 fixture の期待値が不変のことを確認し、make check で exit 0 を確認する

### 落とし穴
- corpus.eval.ts:8 の glob は import.meta.glob（vite）で、tests/ の module からは使えるが Node 直実行の scripts/ からは使えない。tooling から台帳 entry を追加するときは module のソースを interface の形で書き換え、glob の形は module 内の 1 か所に留めて tool に解析させない
- 台帳を走らせる形にまとめると、samples.test.ts の各ケースが持つ期待値以外の検査（anchor 系・radio 復元・demo-ai-ambiguous の LLM 経路）が台帳の形に乗らない。無理に 1 形に束ねず、期待値と除外理由だけ台帳に載せ、個別検査は台帳の html を消費する従来のケースとして残す
- samples.test.ts の `SAMPLES[file]!`（:89）は非 null assertion で、台帳から消えた fixture を実行時まで黙って通す。台帳統一後は台帳の key 型から file を受けるようにすると、消えた fixture が typecheck で落ちる
- make eval の pin（203/61/125）は束ね替えで動かさない。動いたら台帳の束ね替えが fixture の読み込みを変えた証拠なので、pin を直す前に差分の原因を調べる
- 212 が samples.test.ts を触っているため rebase が起きやすい。本 PBI は 212 の後に独立コミットとして置く（出どころの開発運用 Top 2 と同じ狙い）

## Definition of Done
- [x] 全 BDD シナリオが検証されパスする
- [x] make test + make eval + make check が緑（期待値と pin は不変）
- [x] コードレビュー完了
- [x] ドキュメント更新済み（実装記録を本 PBI に残す。AGENTS.md の make addurl 手順の記載は不変で、台帳の説明が必要ならその範囲で更新）

## 外す条件
- pin の fixture 単位指標表化と世代コメントの整理（PBI-215、発見 3a/3b）。本 PBI は pin 表の置き場所（corpus module）を確定させるだけで、pin の表化はしない
- 分類ルール（src/core/）と全 fixture の期待値の変更。本 PBI は台帳の束ね替えのみで、pin を含む期待値は不変
- make addurl の手順変更（tests/target-url.md への登録・fetch・雛形生成の形は不変。変えるのはテスト配線の内部実装だけ）
- scaffold-fixture.mjs の雛形生成（extractControls・renderFixture・renderTestStub）の変更
- src/ 実装への変更（触れるのは tests/ と scripts/ の台帳と tooling）

## 実装記録（2026-11-01）

### 台帳 module の配置と interface
- `tests/corpus.ts`（新規）に corpus 台帳 module を置いた。glob（import.meta.glob）はこの module 内の 1 か所に集約し、corpus.eval.ts からは消えた（PBI-136 の「no second registry」を corpus 全体で実現）。
- interface は `CorpusEntry`（html + expected? + excluded?）を fixture 名で key に公開。期待値は samples.test.ts の各ケースから移設し（demo-registration / demo-shop-checkout / demo-request-info の 3 件は `TEN_ADDRESS_EXPECTED` を共有）、除外理由コメント行（`//   field_xxx ...`）を `excluded` の entry データに移した（複数行のものは 1 文字列に連結）。
- 期待値は未収載の fixture では任意: glob 収集は html の追加だけで corpus に載り、台帳 entry の無い fixture は `corpus` に html のみで入る。
- `CorpusName = keyof typeof LEDGER` で file を受け、台帳から消えた fixture は samples.test.ts の case で typecheck が落ちる（`SAMPLES[file]!` の実行時 TypeError を置き換え）。`corpusEntry()` は fixture html が消えた場合に名指しで throw し、`expectedFor()` が標準 fill ケースの期待値を返す（非 null assertion は使わない）。
- PBI-215 の pin 表（PIN_TABLE + pinDiff + corpus/pin 両方向の一致検査）は corpus.eval.ts に残す判断にした。pin 値は `make eval` の reportLine 出力から写す eval 固有のデータで、消費者も eval 側だけのため（移しても PBI-215 の基準は保てるが、diff が増えるだけと判断）。pin 値 203/61/125・refineChanged 28・refineDropped 0 は不変。

### 2 台帳統合の形
- samples.test.ts は手動 import 27 本と SAMPLES map を削除し、`planFor(file: CorpusName)` が corpusEntry から html を受ける。標準 fill ケースは `expectedFor(file)` との比較 1 行になり、anchor 系・radio 復元・demo-ai-ambiguous の LLM 経路の個別検査は台帳の html を消費する従来のケースとして残した（it.each への無理な束ねはしない。落とし穴どおり）。
- corpus.eval.ts は台帳 module の `corpus` を fixture 名 key で受ける（fixtureName ヘルパーも削除）。pin 表の検査は壊れず、両方向の一致検査も不変。

### add-fixture の変更点
- insertImport・insertSampleEntry（samples.test.ts ソースへの regex 機械編集）と varNameFromFile を削除した。
- buildWiring は台帳 entry の雛形（`renderLedgerEntry`。CorpusExtras 形の expected + excluded）を生成し、`applyWiring({ ledger, test })` が LEDGER_ANCHOR コメントの上に entry を挿入してから samples.test.ts に case を挿入する。台帳を先に当てるので、case だけ挿されて台帳に載らない分離した壊れ方は起きない。case stub は台帳 interface を参照する形（`toEqual(expectedFor('...'))`）で add-fixture.mjs 側に生成する。
- scaffold-fixture.mjs（extractControls・renderFixture・renderTestStub）は雛形生成を不変（外す条件どおり）。
- buildWiring を共有する sync-target-urls.mjs も同じ経路で直った。`--check`（make addurl-check）の `<expected>` 残存の走査先を samples.test.ts から tests/corpus.ts に替えた（雛形の置き場所が台帳に移ったため）。

### 失敗報告の実装
- insertLedgerEntry・insertTestCase は anchor が無いとき null を返し、applyWiring はそこで null を返す。CLI は書き込み前に in-memory で当てるため、anchor が無い場合は何も書かずに中断する。
- CLI（add-fixture.mjs）は書き込み後に台帳とテストを読み戻して entry の在り方を検証し、検証を通った場合のみ成功を報告する。sync-target-urls.mjs も同じ検証を持ち、wiring 失敗をログして残りを続行した上で、失敗が 1 件でもあればコマンド全体を exit 1 にする（成功を偽報告しない）。
- tests/scripts/add-fixture.test.ts は「1 回だけ入る・2 回目は無変更」に加えて、anchor が無い経路（no match → null）と、台帳が先に失敗したとき samples.test.ts を触らないことを検査する。
- tests/integration/target-urls.test.ts は旧 import 行（`from '../../samples/...?raw'`）の形を pin していたため、corpus ledger の entry の在り方（`'${file}': {`）で検査する形に替えた（registry の全 URL が配線済み fixture を持つという目的は不変）。

### 検証結果
- make test: 174 ファイル、2260 passed + 1 expected fail。全 fixture の期待値は束ね替え前後で不変。
- make eval: fixtures=27、ruleHits=203、llmFallbacks=61、fillable=125、refineChanged 28（pin 表の行合計）、refineDropped 0 で不変。
- make check: exit 0。
- make addurl の smoke: 1 fixture（smoke-check.html）で雛形生成 → 台帳 entry の interface 追加（LEDGER_ANCHOR の上）→ case 配線を確認し、検証後に生成物を削除済み。anchor を壊した経路では「wiring failed: ... the corpus ledger anchor ... is missing; fixture not written」を報告して make addurl が失敗し、fixture も台帳 entry も書き込まれないことを手で確認した。
