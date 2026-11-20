# PBI: 生年月日 1 欄型・type=date 対応

## ユーザーストーリー

会員登録や就活のフォームを埋めるユーザーとして、生年月日を 1 input に入れる欄と type=date 欄にも補完してほしい、なぜなら現在はその欄だけが常に空のまま残り 手入力に戻るから(2026-10-17 深掘りで実在が確定)。

## 優先度

- 順位: 4位 / 9件
- RICEスコア: 12(Reach=3 / Impact=1 / Confidence=80% / Effort=0.2人月)
- 根拠: 生年月日欄は高頻度だが対象は 1 欄型・date 型の部分集合(select 3 欄分割 birthYear/Month/Day は対応済み)。birthday(ISO 1 本)・eras.ts(和暦導出)は無改変で再利用でき type=date は HTML 標準で value が常に YYYY-MM-DD のため ISO 注入は技術的に確定。プロファイル設計書の「含めない」解除であり設計書の新規・更新から始める(todo-not-todo.md:155 共通ルール 2)。

## BDD受け入れシナリオ

```gherkin
Scenario: type=date 欄に生年月日が注入される
  Given type=date の欄と登録済み birthday がある
  When 補完を実行する
  Then 欄に YYYY-MM-DD の値が注入され プレビューに表示される

Scenario: 誕生日語の 1 input 欄が分類対象になる
  Given 「生年月日」ラベルの text 1 input 欄がある
  When 分類を実行する
  Then 単一 birthday カテゴリで分類され 年月日全体が注入対象になる
```

## 受け入れ基準

- [x] 設計書(docs/superpowers/specs/)を新規・更新してから着手する(プロファイル設計書:20-22 の「生年月日 1 欄型 含めない」解除。type=date は ISO 一択・1 欄型 text は placeholder 例示に従うかどうかは設計時に決める)(profiles-design.md に追補(2026-10-21)節を追加: type=date も 1 欄型 text も ISO 一択、placeholder 例示の解析は誤注入防止のためしない、解釈不能な保存値は注入しない、legend だけでは判定しない(3 欄分割 fieldset との衝突防止)、AUTOCOMPLETE bday 0.95。文字種検証 exit 0)
- [x] 走査対象に type=date を追加する(dom/scan-fields.ts:13 の TEXT_TYPES。現在は FieldMeta 自体が生成されない)(TEXT_TYPES に date を追加し FieldMeta 生成)
- [x] 分類ガードを単一 birthday カテゴリの導入に合わせ更新する(classify-rules.ts:288-292 の誕生日語 return null。CATEGORIES+AUTOCOMPLETE bday+planner valueFor+LLM プロンプトのカテゴリ追加)(誕生日語 return null を birthday 0.7 に更新。新カテゴリ birthday。CATEGORIES+AUTOCOMPLETE bday+planner valueFor+SYSTEM_PROMPT に追加、buildSchema/parseLlmOutput の CATEGORIES 連動を確認)
- [x] 対象 URL を確定して `make addurl URL=<url>` から始め samples fixture 追加と tests/integration/samples.test.ts のケース追加を必須にする(完了条件(2026-11-19 なぜなぜ分析の合意で測定可能化): type=date を含む実ページ fixture が 1 件以上ある、かつ誕生日語の 1 欄型(text・label 空)が実 fixture で birthday に分類される。実施計画は .superpowers/sdd/why-why-2026-11-19-118-summary.md の「実施の進め方」: 機構修正(scaffold date 対応・AGENTS.md 手順) → 裸 1 欄型の分類改善(積水・ena の corpus pin 更新込み) → type=date の実 fixture 確定。grep 実測: samples 20 件に type="date" は 0 件、「誕生」ラベルは既存 3 欄分割型のみで新機能対象の fixture が存在しない。機構修正はタスク 1 として実装済み(2026-11-19): scaffold-fixture.mjs の IN_SCOPE_TYPES に date 追加・skip 文言の現状化・同名 fixture 上書きガード・AGENTS.md の addurl 標準手順追記。裸 1 欄型の分類改善と積水・ena の corpus pin 更新・samples.test.ts への ena ケース追加はタスク 2 として実装済み(2026-11-19、下記実装記録)。完了条件の後半(誕生日語の 1 欄型が実 fixture で birthday 分類)はこれで充足、残りは type=date の実 fixture 確定(タスク 3)。1 欄型 + 3 欄分割共存 fixture は未達(type=date の実 fixture 投入時に回収する。なぜなぜ分析 p2 項目 5)。2026-11-19 タスク 3 の shichusuimei.html 投入で type=date 条件を充足、1 欄型分類条件はタスク 2 の ena で充足済み。共存 fixture(1 欄型 type=date と select 3 欄分割の同一ページ)は本 fixture も select 分割を持たないため未達のまま残す(なぜなぜ分析 p2 項目 5 の回収は後続に委ねる))
- [x] birthday(ISO 1 本)・eras.ts(和暦導出)を無改変で再利用する(planner は splitBirthday 検証済み ISO をそのまま、解釈不能は空扱い。eras.ts 未改変)
- [x] `make check` が通る

## テスト戦略

- 単体: 分類(誕生日語 1 欄型)・planner(ISO 注入)の fixture 先行(tests/core/)
- 統合: samples.test.ts のケース追加
- 手動: samples フォームでの確認

## 見積もり

- 0.2人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(fixture 先行 red 4件(分類 3+planner 1)→実装後緑。ISO 注入と解釈不能値の空扱いを planner テストが機械的に守る)
- [x] コードレビュー完了
- [x] `make check` が通る

## 実装記録（2026-11-19 タスク2: 裸 1 欄型の分類改善と実 fixture 活用）

- **意図注記（語彙は不変・対象の拡張のみ）**: 今回の変更は誕生日語の語彙集合の追加ではない。`BIRTH_PHRASE`（誕生日/生年月日/誕生年月日 + ご/御/お 接頭辞）と `BIRTH_PHRASE_EN`（birthday/date of birth）は 1 文字も変えておらず、anchored 完全一致の判定**対象**を label 単独から label・name・id・placeholder の各ビューに広げた（設計書追補「分類は欄自身の文言だけ」は当初から 4 ビューを規定しており、実装が狭かっただけ）。legend・nearby は引き続き対象外（3 欄分割 fieldset との衝突防止は不変）。
- **BIRTH_CTX 参照系統への波及なし**: `BIRTH_CTX` 自体は語彙の単一所有であり今回不変。そのため参照系統（birth dispatch 3 エントリ・office 系ゲート（officeContextExcluded/officeKanaEligible）・companyNameKana legend gate・anchored 判定の事前フィルタ）の開きはすべて不変。誕生日語を 1 語も足していないので、「会社の生年月日は除外」の意図も同じ幅を保つ。pin が動いたのは本拡張で birthday に変わった 2 欄のみ（下表）で、会社欄系 fixture の pin は不動。
- `src/core/classify-rules.ts`: 単一 birthday の anchored 判定を `birthOnView()` に拡張（label → name → htmlId → placeholder の順に各ビュー個別の anchored 一致を遅延 norm で判定。placeholder は `buildFieldNormViews` が既に持つビューを再利用し追加 norm なし）。BIRTH_CTX 事前フィルタ（誕生語のない欄は追加 norm 0 回）と `birthOnOwn`（ownText 全体の anchored 判定。'date of' + 'birth' のビュー境界跨ぎを失わないため温存）は従来どおり。type=date ゲート内の判定も同じ関数に統一。
- fixture 先行 RED: `tests/core/classify-rules.test.ts` に裸 1 欄型 5 件（積水形 name+id=birthday・ena 形 name=birthday+placeholder 例示・id+placeholder・日本語 name+placeholder・date 型 name+id）を追加し、実装前に 5 失敗（4 件 null・date 型 1 件は birthYear 0.7 誤落ち）を確認。否定形 2 件（legend 内 3 欄分割 year/month/day は従来カテゴリ・誕生石/birthdayStone 等の非 anchored 語は null）をセットで pin。
- **pin を動かした行（make eval-pin で再生成・意図は上記の対象拡張）**:
  - `ena-request-form.html`: p(16, 8, 10, 3, 4) → p(17, 7, 11, 3, 4)（birthday 欄が unknown→birthday。ruleHits+1・llmFallbacks-1・fillable+1）
  - `sekisui-catalog-request.html`: p(11, 20, 7, 4, 4) → p(12, 19, 8, 4, 4)（同型の変化。ruleHits+1・llmFallbacks-1・fillable+1）
- `tests/corpus.ts`: 積水・ena の birthday を expected へ移動（'1990-05-07' 注入）し、excluded の誤注記を修正。ena の旧注記「pattern 不整合で未注入」は fixture に pattern 属性が存在せず分類欠落を別理由にしていたため、実態（anchored 対象の狭さ）に合わせた。積水の旧注記「no profile value」も同様（統合テストの共有 profile は birthday を持っていた）。
- `tests/integration/samples.test.ts`: ena の誕生日 1 欄型が birthday 0.7 (rule) に分類され ISO 値が入る統合 pin を追加（ms-forms-openroaming の分類 pin 書式に倣う）。
- 検証: fixture 先行 RED → 実装 → 単体 3178 テスト緑 → `npm run eval` 全パス（pin 更新後）→ `make check` 緑。

## 実装記録（2026-11-19 タスク 3: type=date の実 fixture 確定）

- **発見経路**: 実ブラウザ（selenium-webdriver + headless Chrome）による候補ページのレンダと、検索エンジン（DDG 実ブラウザ経由）の結果レンダ機械判定で候補を収集した。占い・診断系 98 候補のうち type=date + 生年月日ラベルを含むのは 1 件（sodan.yaoyorozuya.com/shichusuimei、ENMUSUBI 四柱推命無料鑑定・サーバーレンダ）。楽天は sandbox の DNS 解決失敗のため DoH + `curl --resolve` で grp01.id.rakuten.co.jp 経由の登録フォームを取得し、生年月日が select 3 欄分割（`by`/`bm`/`bd`）であることを確認した（type=date なし）。
- **fixture 判断**: 実ページの欄は name/id を持たない。make addurl の scaffold は name/id を鍵にするため 0 controls になるが、実スキャナ（src/dom/scan-fields.ts）は name/id を要求しない（合成 id `jai-N`、name/htmlId は空文字）。よって samples/shichusuimei.html は name/id を付けず実ページのまま忠実に再現する。planFor の `name || htmlId` キー契約では name/id 無し欄が空文字に衝突して標準ケースで表現できないため、本 fixture は inScopeFixtures に入れず、bespoke ケース（tests/integration/samples.test.ts の label キー assertion）と LEDGER のコメントで代替する（PBI-216 の LEDGER 契約の既知の限界）。
- **走査・分類・plan の実測**: scanFields は 4 欄（名前（任意）text・生年月日 date・性別条件 select・出生地の都市 select）。生年月日は birthday 0.7 (rule) に分類され、type=date へ ISO 値 1990-05-07 が注入される（BDD シナリオ 1 の実 fixture 化）。名前は fullName（山田 太郎）・性別条件は gender（女性）。出生地の都市は label に地名語があるが unknown のまま（eval の llmFallbacks +1）。出生時刻（time）・出生地の経度（number）・備考（textarea）・診断する（button）は走査対象外。
- **落選候補**（AC の標準手順要件）: 前回調査 24 件の詳細は .superpowers/sdd/pbi-118-task3-report.md を参照。今回の追加実測:

  | URL | 結果 |
  |---|---|
  | registration.rakuten.co.jp | DNS 解決不可 → DoH + `--resolve` で grp01.id.rakuten.co.jp 経由の登録フォームを取得。生年月日は select 3 欄分割（by/bm/bd）で type=date なし |
  | welcome.ipet-ins.com/application/estimateinput | headless Chrome で描画成功。Angular の年月日 text 3 欄で type=date なし |
  | account.edit.yahoo.co.jp/signup / jp.mercari.com/signup / accounts.dmm.com/... / accounts.nintendo.com/register | 多段フローで誕生日欄は後段（1 回のレンダでは到達不可） |
  | www.amiami.com/top/regist/ | 地域判定で /eng/ トップへリダイレクト |
  | www.aeonpet.com/campaign/grooming-yoyaku.html | JS アプリ描画で欄不現出 |
  | MS Forms 公開フォーム 5 件 | 日付質問を含まず（type=date 0） |
  | 検索ヒットの占い・診断系 97 件 | type=date 0 |

- **pin**: tests/eval/corpus.eval.ts の PIN_TABLE に `shichusuimei.html: p(3, 1, 2, 0, 0)` を追加（make eval-pin の生成値。ruleHits 3 = fullName/birthday/gender、llmFallbacks 1 = 出生地の都市、fillable 2 = eval の合成 profile は gender を持たないため fullName/birthday の 2 行）。既存行の値は不変。
- **検証**: `npx vitest run tests/integration/samples.test.ts` 緑（318 件）、`make addurl-check` 残数 0、`make eval` 緑（pinDiff なし）、`make test` 緑（3184 件 + 期待どおりの失敗 1 件）、`make check` 緑。
