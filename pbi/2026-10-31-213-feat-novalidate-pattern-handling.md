# PBI: novalidate 時の pattern 検査の扱い（調査 + 判断 + 必要なら実装）

## ユーザーストーリー
「JushoAIで入力」を使う利用者として、ページ自身が検査しないと宣言した pattern（form タグの novalidate）について、拡張機能の pattern 警告の扱いが製品判断として確定していてほしい、なぜなら判断が宙に浮いたままだと、実ページで動いている注入が将来の変更で静かに消えるか、実行されない pattern が誤って警告を出すから

## 優先度
- 順位: 2 / 8（2026-11-01 の RICE 採点。RICE 10.0（Reach=1.0 / Impact=1 / Confidence=100% / Effort=0.1 人週・調査+記録のみ））
- 根拠: PBI-210 review のフォローアップ（「ゲートの根拠は curl の novalidate 証跡。novalidate を尊重する第 3 の選択肢はフォローアップで判断」）。製品判断（ポリシー決定）が主で、実装は判断の結果に従う
- 依存関係: B 採択により corpus.eval.ts に触れないため PBI-215/216 との順序制約は無し

## 出どころ
- PBI-210 の review（progress.md:169-170、レビュー証跡 review-64d2b63..b57b19c.diff）: curl spot-check of pro.form-mailer.jp/fms/12fc22bc297429 confirms novalidate on form + dummy pattern="1" x4 / pattern="5" x2 + structural pattern x5。novalidate-respect as possible follow-up
- 現行の構造ゲート（HAS_REGEX_STRUCTURE）の証跡: src/core/planner.ts:74（正規表現の構造を持つ pattern だけ検査）・:83（裸のリテラルはスキップ）。PBI-210 の実装記録「適用範囲の決定」節に、novalidate を載せる代替案が意味的には最も正確だが走査・FieldMeta・sample HTML の form タグ修正まで必要なスコープ拡大のため採らなかった旨の記録がある
- fixture の証跡: samples/12fc22bc297429.html と samples/2dd1c663300469.html に pattern="1" / "5" / "6" のダミー pattern が 11 欄あるが、保存済み fixture の form タグには novalidate が無い（実ページにはある。curl 実測）。samples/formmailer-anketo-gender.html:11 は novalidate を持つ参照 fixture
- 判断の材料: 2 つの選択肢（A: form タグの novalidate を尊重して pattern 検査をスキップする。B: 現行の構造ゲートのまま）

## BDD受け入れシナリオ
Scenario: 実行されていない pattern が注入を壊さない
  Given form タグに novalidate がある実ページのダミー pattern（例: pattern="1"）
  When 欄を plan する
  Then 実行されていない pattern で警告行にならず、今動いている注入が消えない

Scenario: 実行される pattern の違反値は従来どおり警告になる
  Given 正規表現の構造を持ち、ブラウザが実行する pattern を持つ欄
  When planner が pattern と合わない値を plan する
  Then 行は警告状態になり、承認しても値は注入されない

Scenario: 判断が証跡付きで残る
  Given 調査結果（curl 実測・既存ゲートの根拠・fixture のダミー pattern 11 欄）
  When novalidate を尊重するか、構造ゲートのままにするかを判断する
  Then 判断と理由が実装記録に残り、実装の要否が明示される

## 受け入れ基準
- [x] 調査: 現行の構造ゲート（HAS_REGEX_STRUCTURE）が corpus のダミー pattern 11 欄をどう扱うかを fixture で確認し、novalidate 尊重（A）との差分を実測する
- [x] 判断: A（novalidate を尊重して pattern 検査をスキップ）か B（現行の構造ゲートのまま）を、意味的正確さとスコープ（走査・FieldMeta・sample HTML）の両面から根拠付きで確定させ、実装記録に記録する
- [x] 必要なら実装: B（構造ゲートのまま）を採択したため src/ の実装は無し（pin 拡充と判断記録のみ。A 採択時の手順は実装手順節に残す）
- [x] どちらの選択肢でも、ダミー pattern 12 欄のうち 11 注入欄の現在の注入が消えない（planner の pin 拡充と統合断言で固定。実装記録参照）
- [x] 走査・FieldMeta を触った場合の corpus.eval.ts の pin 更新: B 採択により走査・FieldMeta に触れないため該当なし（corpus.eval.ts は不変。make eval の pin 差分は実測 0）
- [x] make check が exit 0

## 実装手順
- 調査: samples/12fc22bc297429.html・2dd1c663300469.html のダミー pattern（pattern="1"/"5"/"6"）を fixture で plan し、現行ゲート（src/core/planner.ts:74・:83）がスキップすることを確認する。実ページの novalidate は curl spot-check 済み（progress.md:169）で、ブラウザはこの pattern を実行していない
- 判断: A と B を比べる。A は意味的に最も正確だが、novalidate を form タグから読む走査の追加・FieldMeta と messages.ts の wire・sample HTML の form タグ修正まで必要。B はスコープが最小で、ダミー pattern の実害は構造ゲートで既に抑えられている。採択と理由を本 PBI の実装記録に残す
- 必要なら実装: fixture 先行 TDD（tests/core/ に再現 fixture を makeMeta で追加して失敗させてから直す）。A 採択時は src/dom/scan-fields.ts の欄の所属 form 読み（:70 の el.form ?? el.closest('form')）に novalidate の読みを足し、FieldMeta・messages.ts の wire・該当 sample HTML の form タグまで揃える
- 指標: 走査・FieldMeta を触った場合は make eval の pin 更新を同じコミットで行う

## テスト戦略
- 単体: pattern 検査の扱い（A/B どちらでも）を tests/core/planner.test.ts に fixture で固定する（makeMeta）
- 統合: A 採択時は tests/integration/samples.test.ts の該当ケースで novalidate 付き form の挙動を固定する
- 指標: make eval（走査・FieldMeta を触った場合は pin 更新込み）

## 見積もり
1（要チームでの見積もり）

## 技術的考慮事項
- pattern は FieldMeta に既にある（src/core/types.ts:40）が、novalidate は無い。A 採択なら FieldMeta と messages.ts の wire（:137 の LLM wire からは除外の約束事を保つ）への追加が必要
- PBI-210 の実装記録に代替案として記録済み（将来の軸として残す旨）。本 PBI はその判断を確定させる
- B 採択のときも実装は無し（判断の記録のみ）でよい。DoD の実装項目は判断に従う

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）

```bash
grep -n 'HAS_REGEX_STRUCTURE' src/core/planner.ts
grep -rn 'novalidate' src/ tests/ samples/ | head
npx vitest run tests/core/planner.test.ts -t 'pattern'
```

走査は novalidate を読んでいない（src/ に novalidate の実装は無く、planner.ts:69 のコメント言及のみ）。fixture は 12fc22bc297429・2dd1c663300469 の form タグに novalidate 無し、formmailer-anketo-gender.html:11 に有り（2026-10-31 起票時確認）。

### 落とし穴
- A 採択時、欄の所属 form は el.form ?? el.closest('form') で辿る（src/dom/scan-fields.ts:70）。div role="group" 経由の欄でも form タグに届くことを fixture で確認する
- sample HTML の form タグに novalidate を足すと、保存済み fixture が実ページの状態とずれていた点が消える。12fc22bc297429・2dd1c663300469 だけを揃え、novalidate 無しの実ページ（nishimachi など）は触らない
- 現行ゲートの根拠は curl の novalidate 証跡（progress.md:169）。判断を B から A へ（または逆へ）書き替えるとき、根拠の証跡を残す。pin・文言・判定の意図は挙動と一緒に記録する（なぜなぜ分析の構造根因 2）
- B 採択でも「ダミー pattern 11 欄が消えない」を fixture で固定する（現行の振る舞いが意図であることを残す）

## Definition of Done
- [ ] 調査・判断が実装記録に証跡付きで残る
- [ ] BDD シナリオが自動テスト（または判断記録）として検証される
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-11-01）

### 判断: B（現行の構造ゲートのまま）を採択

- 2026-11-01 にユーザーが B（現行の構造ゲート HAS_REGEX_STRUCTURE、src/core/planner.ts:74・:83 のまま）を採択した。src/ の実装変更は無しで、pin 拡充と本節の記録・証跡の写しを 1 コミットで行う
- 根拠:
  - なぜなぜ分析（10 項目 x 3 立場・30 本・計 203 段）の支配的構造根因「fail-open の意図が pin 1 組合せと gitignored な台帳に分散」を、pin 拡充（"5"/"6"）と証跡の台帳への写しで閉じる
  - corpus 上の実害なし（実測: make eval の pin 差分 0。203/61/125・refineChanged 28・refineDropped 0 を再確認済み）
  - A（novalidate を尊重して pattern 検査をスキップ）は約 10 ファイルのスコープ拡大（src 5・samples 2・tests 3〜4）で、誤警告予防の利得は現在値が一致するため計測に現れない
- 受容するリスク: novalidate form の構造 pattern（tel ^\d+$ 3 欄・生年月日の年 1 欄、実ページではさらにカナ文字クラス 2 個）をブラウザが実行しないのに現行ゲートは検査する非対称が残る。現在の注入値はいずれも pattern と一致するため実害なし。将来の値不一致で誤警告が観測されたら A 再検討のトリガーにする

### curl 証跡の写し（git に乗る形）

- 実ページ pro.form-mailer.jp/fms/12fc22bc297429 の spot-check。PBI-210 review の 2026-10-31 実測を 2026-11-01 に再実行して一致を確認した:

```
curl -s https://pro.form-mailer.jp/fms/12fc22bc297429 | grep -o 'novalidate\|pattern="[^"]*"' | sort | uniq -c
  ->    1 novalidate
         4 pattern="1"
         2 pattern="5"
         2 pattern="^[\u2015\u3000\u3041-\u3093\u309B-\u309E\u30FC]+$"（カナ文字クラス）
         3 pattern="^\d+$"
```

- form タグに novalidate 1・ダミー 6 個（pattern="1" x4・pattern="5" x2）・構造 pattern x5（tel ^\d+$ 3 欄 + カナ文字クラス 2 個）
- 実ページは novalidate のためブラウザはこれらの pattern を実行しない。現行ゲート（B）は正規表現の構造を持つ pattern を検査するため、tel ^\d+$ 3 欄・生年月日の年 1 欄（fixture 側の構造 pattern）とカナ文字クラス pattern 2 個（実ページのみで fixture には載らない）を検査する。現在の注入値はいずれも pattern と一致するため実害なし
- 数え方の注記: grep は部分一致のため、実ページのダミー 6 個は data-pattern 属性として数えられる（フリガナ欄 field_4647588_sei/mei は data-pattern="5" と pattern=カナ文字クラスの両方を持つ）。保存済み fixture はフリガナ欄を pattern="5" のみに写している

### ダミー pattern 12 欄の内訳（両 fixture 合計）

| fixture | 欄 | pattern | 分類 | 現在の plan |
|---|---|---|---|---|
| 12fc22bc297429 | field_4647587（法人・団体名） | "1" | company | 注入 'ok' |
| 12fc22bc297429 | field_4647576_sei | "1" | lastName | 注入 'ok' |
| 12fc22bc297429 | field_4647576_mei | "1" | firstName | 注入 'ok' |
| 12fc22bc297429 | field_4647588_sei | "5" | lastNameKana | 注入 'ok' |
| 12fc22bc297429 | field_4647588_mei | "5" | firstNameKana | 注入 'ok' |
| 2dd1c663300469 | field_4695578_sei | "1" | lastName | 注入 'ok' |
| 2dd1c663300469 | field_4695578_mei | "1" | firstName | 注入 'ok' |
| 2dd1c663300469 | field_4695585_sei | "6" | lastNameKana | 注入 'ok' |
| 2dd1c663300469 | field_4695585_mei | "6" | firstNameKana | 注入 'ok' |
| 2dd1c663300469 | field_4695587（学校名） | "1" | school | 注入 'ok' |
| 2dd1c663300469 | field_4695590（学部・学科） | "1" | department | 注入 'ok' |
| 2dd1c663300469 | field_4696239（その他の当社を知った経緯） | "1" | 未分類 | plan 行に載らず A/B どちらでも不変 |

- 合計 12 欄（"1" x8・"5" x2・"6" x2）。うち 11 欄が現在注入 'ok'、残る 1 欄（field_4696239）は未分類で buildPlan の skip により plan 行に載らず、A/B どちらの判断でも不変。受け入れ基準・BDD の「11 欄」の実体はこの注入される欄数

### pin 拡充と統合断言

- tests/core/planner.test.ts: 裸リテラル "5"/"6" が正規表現の構造なしと判定され fail-open で status 'ok' になる pin を追加した（"5"・"6" を 1 テストにまとめ、既存の "1" pin と同じ形）。pin テストのコメントに「fail-open は意図（PBI-213 で B 採択、2026-11-01）」を残した
- 分類代表の構造 pattern の pin: 生年月日 MM/DD/YYYY 相当は既存テストと重複するため足していない（planner.test.ts の mmdd、nishimachi の生年月日 pattern が warn（違反）と maxlength 順位で検査対象を固定済み）。tel ^\d+$ は既存 7 本の pattern テストに tel 型の組合せが無いため、構造 pattern を検査対象にすることを tel 型で固定する pin（違反値 → warn-pattern）を追加した
- tests/integration/samples.test.ts: 触れていない。両 fixture ケース（12fc22bc297429・2dd1c663300469）は planFor（status 'ok' の行だけを map に載せる）の toEqual 断言で、ダミー pattern を持つ注入欄 11 欄の注入を既に固定している（欄が warn-pattern に倒れると map から消えて断言が失敗する）。不足がないため追加は無し

### fixture・実ページのずれの許容

- 保存済み fixture（form タグに novalidate 無し）と実ページ（novalidate 有り）のずれは、B 運用では挙動に出ないため許容する。fixture は実ページの最小化コピーで、ダミー を data-pattern 属性から pattern 属性に写す単純化と、フリガナ欄のカナ文字クラス pattern の省略を含む。実ページ再取得時の差分はこの注記と照らして読む
