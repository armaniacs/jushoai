# PBI: パターン違反の値注入を警告して注入しない（maxlength 超過と同じ位置の軸）

## ユーザーストーリー
海外在住の利用者として、欄の pattern と合わない値を preview で知りたい、なぜなら pattern 違反の値が黙って注入されると送信が壊れるから（maxlength 超過と同じ挙動に揃える）

## 優先度
- 順位: 着手確定（2026-10-31 ユーザー指示。なぜなぜ分析の合意で最上位候補）
- 根拠: なぜなぜ分析（2026-10-31）で利用者・保守担当者の両立場が「起票最上位」と合意。pattern 違反の値注入は maxlength 超過と同じ「黙って壊れる」型の実害で、既に発行済みの 0.1.29 で届く形になっている

## 出どころ
- PBI-208 で露呈した実バグ: samples/nishimachi-inquiry.html の field_963 は `pattern="[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}"`（title「Must contain a date in MM/DD/YYYY format」）の text 欄なのに、tests/integration/samples.test.ts の nishimachi ケースが `field_963: '1990-05-07'`（ISO date）を pin している。planFor は status `ok` の行だけ集める（samples.test.ts:98）ため、pattern 違反の値が `ok` で注入される形が fixture に固定されている
- maxlength は超えていない（'1990-05-07' はちょうど 10 文字で maxlength=10 を満たす）ため、既存の warn-maxlength 軸は効かない。2 つの軸は独立で、pattern 側が丸ごと抜けている
- 起票時の実装確認（2026-10-31）: planner は meta.pattern を width 強制（detectWidthKind、src/core/planner.ts:57）でしか使わず、値の pattern 適合検査は無い。PlanStatus（src/core/planner.ts:17）に pattern 系の warn も無い
- なぜなぜ分析の詳細は `.superpowers/sdd/why-why-2026-10-31-summary.md`（項目 7、利用者・保守担当者とも Top 1）。samples.test.ts の該当行には意図的な pin である旨の注記済み（PBI-210 の起票根拠）

## BDD受け入れシナリオ
Scenario: pattern 違反の値が警告になり注入されない
  Given pattern 属性（MM/DD/YYYY 相当）を持つ text 欄
  When planner が pattern と合わない値（例: 1990-05-07）を plan する
  Then 行は maxlength 超過と同じ位置の warn 状態になり、preview に警告が表示され、承認しても値は注入されない

Scenario: pattern に合う値は従来どおり注入される
  Given 同じ pattern 属性を持つ text 欄
  When planner が pattern に合う値（例: 05/07/1990）を plan する
  Then 行は ok のまま preview され、承認後に注入される

Scenario: pattern を持たない欄は従来どおり
  Given pattern 属性を持たない text 欄
  When planner が値を plan する
  Then 警告は追加されず、従来どおりの plan・注入になる

## 受け入れ基準
- [x] pattern を持つ欄に合わない値を plan したとき、行が maxlength 超過と同じ位置の warn 状態（value 空）になり、preview に警告が表示され、注入されない（検査は正規表現の構造を持つ pattern が対象。ダミー pattern は fail-open スキップ。実装記録参照）
- [x] pattern に合う値は従来どおり ok で注入される
- [x] pattern を持たない欄と、無効な pattern（RegExp パース失敗）の欄は従来どおりの挙動を保つ（裸のリテラル pattern も従来どおり。実装記録参照）
- [x] tests/integration/samples.test.ts の nishimachi ケースが警告に変わる（field_963 の pin 更新。意図注記のコメントは残す）
- [x] tests/eval/corpus.eval.ts の pin を同じ実装コミットで一緒に更新し、make eval の指標差分を記録する
- [x] make check がパスする

## 実装手順
- fixture 先行: tests/core/planner.test.ts に pattern 違反 → warn 行（value 空、注入対象外）の再現 fixture を makeMeta で追加して red を確認してから planner を直す。正規表現のテストが落ちたら期待値ではなく正規表現（実装）を直す
- src/core/planner.ts の buildPlan に、maxlength 超過の分岐（:337）と同じ位置で pattern 適合検査を足す。PlanStatus に warn 系（例: warn-pattern）を追加し、行は value 空で返す
- src/ui/preview.ts に警告行の表示を足す（maxlength 超過の警告行と同じ位置・同じ調子の文言）
- src/dom/fill-plan.ts の skipped-status 対応表（:134 付近、'warn-maxlength': 'skipped-status'）に新しい warn 状態を足す（注入しない）
- 統合: tests/integration/samples.test.ts の nishimachi ケースを警告に合わせて更新する（field_963 は warn 行になる。行コメントの意図注記は pin の説明として残す）
- tests/eval/corpus.eval.ts の pin は本 PBI の実装時まで触らず、警告軸の実装と同じコミットで nishimachi ケースと共に更新する。make eval の指標差分（ruleHits・fillable など）を実装記録に残す

## テスト戦略
- 単体: tests/core/planner.test.ts に pattern 違反の再現 fixture（makeMeta で pattern 付き欄）を先に追加し、warn 行（value 空）と pattern 適合時の ok を固定する
- 統合: tests/integration/samples.test.ts の nishimachi ケースが警告に変わる（field_963 の pin 更新を含む）
- 指標: make eval で corpus の分類・注入指標の差分を確認する（corpus.eval.ts は同じコミットで更新）

## 見積もり
2（要チームでの見積もり）

## 技術的考慮事項
- pattern は FieldMeta に既にある（src/core/types.ts:40）ので、走査・分類・wire への追加は不要。LLM wire からは除外済み（src/messages.ts:137）で、本軸は通信なしの端末内検査
- warn 行は注入されないため undo（src/dom/fill-plan.ts の undoFill、filled 行だけ空状態に戻す）の対象外。既存の undo 経路は触らない

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）

```bash
grep -rn "pattern" src/core/planner.ts src/core/types.ts
grep -rn "warn-maxlength" src/ tests/
```

未実装の確認済み（2026-10-31 起票時）: 値の pattern 適合検査は src/ のどこにも無い。

### 落とし穴
- HTML の pattern 属性は値全体への一致（暗黙の anchor と v フラグ相当）。素朴な `new RegExp(pattern)` は部分一致になり、警告が過小に出る
- 無効な pattern（パース失敗）では例外を出さず検査をスキップして従来どおりに倒す（fail-open）。fail-closed にすると pattern の書き方が違うページで全欄が注入できなくなる
- planFor は status `ok` の行だけ集める（tests/integration/samples.test.ts:98）。nishimachi ケースの pin と corpus.eval.ts の pin は、警告軸の実装と同じコミットで一緒に更新する（片方だけ直すと pin の食い違いが持ち越される）
- preview の警告文言は maxlength 超過の行と混ざって読めること。行順・調子は既存の warn 行（warn-no-option など）に寄せる

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-10-31）

### 実装内容

- src/core/planner.ts: PlanStatus に warn-pattern を追加。buildPlan の maxlength 超過の分岐と同じ else if 連鎖の直後に pattern 適合検査を足した。違反値は value 空・display に違反値を載せた warn 行で返す（maxlength 超過と同じ位置・同じ形）。width 変換後の値（preview に見える値と同じもの）を判定対象にするのは maxlength と同じ約束事。両方が同時に当たるときは maxlength が先（既存の warn-maxlength 行の status は一切変わらない）。abbrev・assist 候補は warn-pattern 行に載らず、undo 経路は無変更（warn 行は注入されないため対象外）
- src/ui/preview.ts: STATUS_NOTE に warn-pattern の警告文言を追加。文言は「欄のパターンと合わないため入力しません」。maxlength の「文字数を超えるため入力しません」と同じ調子で、原因（文字数超過とパターン不一致）は読み分けられる
- src/dom/fill-plan.ts: PLAN_STATUS_RESULT に warn-pattern を skipped-status で追加（Record<Exclude<PlanStatus, 'ok'>> の型で強制される）。注入しない。by-design のため部分適用の警告も上がらない
- src/core/fill-one.ts: FILL_ONE_REASON_LABELS に warn-pattern の文言を追加（FillOneReason 型に Exclude<PlanStatus, 'ok'> が乗るため型で強制）。プレビューの STATUS_NOTE と対応

### pattern 正規表現の扱い

- 値全体一致: HTML 仕様どおりの暗黙 anchor で、パターン文字列を ^(?:...)$ で包む。素朴な new RegExp(pattern) は部分一致になり警告が過小に出るため、anchor は必須。既に ^...$ を持つページの pattern（^\d+$ など）は ^(?:^\d+$)$ でも同じ意味で重ねて問題ない
- v フラグ: HTML 仕様のコンパイルモード（ES2024）を先に試す。実行環境（Node 26・Chrome 112 以降）は v をサポートする。v をサポートしない環境では anchored の素の RegExp に倒す（優先順位: v が使えるなら v のみ、パース失敗はスキップ。使えない環境では素の RegExp）。特定の pattern が v でパースに失敗した場合はフラグを変えずにスキップする。ブラウザ自身もコンパイルできない pattern は無視するため、ブラウザと同じ fail-open になる
- fail-open: パース失敗・pattern 属性なしのどちらでも例外を出さず検査をスキップして従来どおり（fail-closed は禁止）

### 適用範囲の決定（起票後に判明した分）

起票後のコード確認で、corpus の fixture に実ページ由来の pattern が載っている欄が複数あることが判明した。

- form-mailer.jp 系 2 fixture（12fc22bc297429・2dd1c663300469）は pattern="1" / "5" / "6" という裸のリテラルを持つ。実ページ（2026-10-31 取得）は form タグに novalidate があり、この pattern はブラウザに実行されていない（form-mailer 独自のチェック種別コード）。姓・名・カナ・会社名など 11 欄がこのダミー pattern を持つ
- PBI 文字どおり「全 pattern に全体一致検査」を入れると、これらの欄が警告行になり、実ページで今動いている注入が消える。fail-closed 禁止の趣旨（pattern の書き方が違うページで全欄が注入できなくなる）と同じ実害が、パース可能なダミー pattern を通しても起きる

このため検査は「正規表現の構造（文字クラス・エスケープ・量指定子・グループ・選択・anchor・ドットのいずれか）を持つ pattern」に限って走らせるゲートを足した。裸のリテラルはページ内部のメタデータとして扱い、検査をスキップする（fail-open）。ゲートの考え方は既存の pattern 消費者 detectWidthKind（formatters.ts、クラス内部の文字だけを根拠にする）と同じ方針。代替案として、スキャンに form の novalidate を載せて実行される pattern だけ警告する方法が意味的には最も正確だが、走査・FieldMeta・sample HTML の form タグ修正まで必要なスコープ拡大になるため本 PBI では採らなかった（将来の軸として残す）

- type=date は pattern 属性の対象外（HTML 仕様で pattern は text/search/url/tel/email/password にのみ効く）。type=date の値は ISO を保つ必要がある（PBI-120 の width 軸と同じ約束事）で、ブラウザも date 入力の pattern を実行しないため、検査対象から外した。tests/core/width-enforcement.test.ts の既存 pin がこの漏れを検出した

### make eval の指標差分

- nishimachi-inquiry.html: fillable 8 → 7（field_963 が warn-pattern 行になったため）。ruleHits 16・llmFallbacks 3・refineChanged 0 は不変
- aggregate: ruleHits 204（不変）・llmFallbacks 46（不変）・fillable 127 → 126。refineChanged 28・refineDropped 0 は不変
- form-mailer.jp 系 fixture の fillable はゲートにより不変（ダミー pattern は検査スキップ）

### 確認したテスト

- tests/core/planner.test.ts: PBI-210 の describe に 6 fixture を追加（違反 → warn-pattern、適合 → ok、pattern なし → 従来、パース失敗 → fail-open、裸リテラル → fail-open、type=date → 対象外）。違反の 1 件を red 確認してから実装した
- tests/integration/samples.test.ts: nishimachi ケースの field_963 pin を外し、意図注記コメントを pin の説明として残した
- make test: 174 ファイル・2241 テスト + 期待失敗 1 件がパス（実測は 2241 passed | 1 expected fail = 2242。旧記載の 2240 は算数の誤りで、コントローラの再実測で訂正した）
- make eval: pin 更新後にパス
- make check: パス
- HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome: 24/24 パス（preview の警告行追加が既存 E2E に影響しないことを確認）
- 文字種チェック（docs-charset）: OK
