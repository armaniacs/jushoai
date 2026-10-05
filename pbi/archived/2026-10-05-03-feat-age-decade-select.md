# PBI: 年代(select)対応 — 生年月日から年代を導出しselect欄へ自動入力

## ユーザーストーリー
JushoAI利用者として、プロファイルの生年月日から年代(20代〜70代以上)を自動導出してselect形式の年代欄へ自動入力したい、なぜなら来場予約のようなフォームで年代回答の手入力をなくしたいから

## ビジネス価値
- select形式の年代欄があるフォームの入力手数を1欄分削減する
- 測定方法: select年代欄を含むサンプルフォームでプレビュー承認後に正しい年代が選ばれること

## BDD受け入れシナリオ

```gherkin
Scenario: select年代欄に生年月日から導出した年代が入る
  Given プロファイルに生年月日「1990-05-07」が登録されている
  And フォームに年代select欄があり選択肢に「20代」「30代」「40代」が含まれる
  When 利用者がJushoAIボタンを押してプレビューを承認する
  Then 年代select欄に生年月日から計算した年代が選択される

Scenario: 選択肢にない年代は警告して入力しない
  Given プロファイルの生年月日から導出した年代が選択肢にない
  When 利用者がプレビューを開く
  Then 該当欄は warn-no-option で表示され値は入力されない

Scenario: 生年月日未登録や入力済み欄は触らない
  Given プロファイルに生年月日が未登録、または年代欄に既に値が選ばれている
  When 利用者がJushoAIボタンを押す
  Then 該当欄はスキップまたは filled 表示で上書きされない
```

## 受け入れ基準
- [x] 生年月日(YYYY-MM-DD)から満年齢→年代(10代/20代/30代/40代/50代/60代/70代以上)への導出が正しい(誕生日前後の境界含む)
- [x] label/nearby/nameに年齢・年代語彙があり選択肢に「代」を含むselect欄が新カテゴリに分類される
- [x] 数値年齢を直接入れるtext欄(例: 年齢を数字で入力)とは区別され誤分類しない
- [x] select年代欄が導出値と一致する選択肢に解決される(「20代」「20歳代」「20s」等の表記ゆれ対応)
- [x] 選択肢なし・生年月日空・入力済みの場合は入力せず状態表示が正しい
- [x] LLM分類でも新カテゴリが返り得る
- [x] 対象URL相当のradio欄には手を出さない(radioは別PBI)

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 最小限: samples/ へ select年代欄つきフォームを追加し、プレビュー承認で正しく選ばれる手動確認手順を残す(自動E2E基盤なしのため手動)

### 統合テスト
- classifyAll→buildPlan 経由で年代select meta が解決されること
- 生年月日あり/なし・選択肢あり/なし・入力済みの組み合わせ

### 単体テスト
- 年代導出: 満年齢計算(誕生日前日・当日・翌日)、うるう年(2/29生まれ)、70歳以上→「70代以上」、10歳未満の扱いをテストで固定、今日日付の注入可能性(テストで固定できる設計)
- classifyField: 年齢/年齢層/年代/ねんだい/age の positives、人数・学年・年代物などの negatives
- 年代選択肢照合: 表記ゆれと数値コード(value="0"等)への対応可否をテストで固定
- planner.buildPlan(select+年代): ok / warn-no-option / filled / 生年月日空でスキップ
- 比率目安 E2E:統合:単体 = 1:10:100

## 実装アプローチ
- **Outside-In**: 失敗する受け入れテスト(分類→計画の順)から開始し、赤を確認してから実装
- **Red-Green-Refactor**: TDDサイクルを分類・導出・照合・計画の各層で適用
- **リファクタリング**: グリーンになるたびに品質改善

## 見積もり
3pt前後 (要チームでの見積もり)

## 技術的考慮事項
- 依存関係: なし(本PBIはradio対応を含まない。radio解決は `2026-10-05-04-backlog-age-decade-radio.md` に分離し、 radio基盤は `2026-10-05-02-backlog-gender-radio.md` に相乗り)
- テスタビリティ: 今日日付に依存するため導出関数は基準日を引数で受け取る純粋関数にすること。`new Date()` 直呼びはテスト不能になる
- 非機能要件: プロファイル値はLLMに送らない既存原則を維持する。生年月日から年代のみを導出し、生年月日自体は送らない
- 既存分類との整合: `birthYear/birthMonth/birthDay/birthEra` との誤分類に注意(生年月日という語彙を共有するため)

## 実装者向け注記

### 現状コードの確認
着手前に必ず実行すること。2026-10-05時点で以下を確認済み(未実装):

```bash
grep -rn "年齢\|年代\|20代\|ageDecade\|ageGroup" src/ tests/
# src/tests ともに該当なし
grep -rn "CATEGORIES" src/core/types.ts
# CATEGORIES に年代なし。Profile は birthday(YYYY-MM-DD)のみで年齢欄なし
```

- `src/core/types.ts:1-11` CATEGORIES に年代なし、`Profile.birthday` のみ存在
- `src/core/eras.ts` に `splitBirthday/matchNumberOption/matchEraOption` あり。年代導出・照合はここに寄せるのが自然
- `src/core/planner.ts:100-122` は select を prefecture/birthMonth/birthDay/birthEra のみ解決し他は skip。新カテゴリの分岐追加が必要
- 対象URL `https://pro.form-mailer.jp/lp/f9334cf2294970` の年齢欄は radio(`field_4609097`, 20代value=0〜70代以上value=5)。本PBIでは扱わずradioはPBI-04に分離
- 直前の性別PBI `2026-10-05-01-feat-gender-select.md` と select分岐の競合に注意(同時実装時は planner の select 分岐をまとめて扱う)

### 実装手順
Outside-Inの縦スライス順に進める:

1. E2E相当の赤を作る: `tests/core/` に年代selectの fixture(makeMetaで select+options「20代」等+label年齢)で classifyAll→buildPlan が解決しないことを失敗テストとして書く
2. 導出を緑にする: 生年月日→年代の純粋関数(例 `toDecade(iso, today)`)を `eras.ts` 近傍に新設し単体テストを緑にする。70歳以上は「70代以上」、10歳未満の扱いはテストで固定する
3. 分類を緑にする: `CATEGORIES` に新カテゴリ(例 `ageDecade`)追加、`classify-rules.ts` に年齢・年代語彙の判定追加。数値年齢text欄との区別(選択肢に「代」を含むか)を条件に入れる。`SYSTEM_PROMPT` に年代行を追加
4. 値解決を緑にする: 年代選択肢照合関数(例 `matchDecadeOption`)を新設し `planner.ts` の select分岐に新カテゴリを追加
5. 文面を更新する: 対象欄一覧に年代があれば追記し `make check` を通す

### 落とし穴
- 「年齢」というlabelは数値入力欄にも使われる。options の有無・内容(「代」を含むか)を見ずに分類すると数値欄に「30代」を入れようとして warn になる
- 対象URLの value は “0”〜“5” の数値コードでテキストと1:1でない。テキスト一致優先・コード対応は別途決めること(安易な数値対応は誤爆する)
- 満年齢計算は誕生日前後で1歳ずれる。テストは境界日(前日・当日・翌日)を必ず入れること
- `new Date()` を導出関数内で直呼びしないこと。テストで基準日を固定できない
- radio欄(対象URLの形式)に手を出さないこと。radioは scan/planner/fill の基盤改修が必要で本PBIの規模を超える

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする(E2E相当の手動手順を除く)
- [x] テストカバレッジが基準を満たす（E2E/統合/単体すべて）
- [x] `make check` (typecheck + test + build)が通る
- [ ] コードレビュー完了(ユーザー作業として残す)
- [x] リファクタリング完了（グリーン後）
- [x] ドキュメント更新済み

## INVEST + Readyチェック
- Independent: radio対応なしで単独提供可
- Negotiable: 年代語彙・表記ゆれ範囲は実装時に調整可
- Valuable: select年代フォームで1欄分の自動入力価値
- Estimable: 影響範囲が分類・導出・計画に限定され見積可
- Small: 1スプリントで完了(3pt想定)
- Testable: 上記受け入れ基準で検証可
- BDD: 独立したユーザーシナリオを持つ
- t_wada: Outside-Inで段階的にテストを書ける
