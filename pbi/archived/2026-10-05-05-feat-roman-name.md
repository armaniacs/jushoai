# PBI: ローマ字氏名対応 — 半角英数Name欄への自動入力

## ユーザーストーリー
JushoAI利用者として、プロファイルにローマ字氏名を登録して海外フォームのName欄へ半角英数で自動入力したい、なぜなら「Name（最大文字数:80）※半角英数で入力」のような欄に漢字氏名が入ってしまう誤入力をなくしたいから

## ビジネス価値
- 海外住所フォームのName欄(例: `https://www.joshibi.ac.jp/overseas/webform` ①Name)の誤入力をなくす
- 測定方法: 半角英数指定のName欄を含むサンプルフォームでローマ字氏名が正しく入ること

## BDD受け入れシナリオ

```gherkin
Scenario: 半角英数Name欄にローマ字氏名が入る
  Given プロファイルにローマ字氏名が登録されている
  And フォームに「Name（最大文字数:80）※半角英数で入力」の欄がある
  When 利用者がJushoAIボタンを押してプレビューを承認する
  Then Name欄にローマ字氏名が半角英数で入力される

Scenario: ローマ字未登録や和文指定欄は従来どおり
  Given プロファイルにローマ字氏名が未登録である
  When 利用者がJushoAIボタンを押す
  Then Name欄には従来の漢字氏名も入れずスキップされる(誤って漢字を半角英数欄に入れない)

Scenario: maxlength超過は警告して入力しない
  Given ローマ字氏名が欄のmaxlengthを超えている
  When 利用者がプレビューを開く
  Then 該当欄は warn-maxlength で表示され値は入力されない
```

## 受け入れ基準
- [x] プロファイルにローマ字姓・名を保存・復元できる(半角英字バリデーション付き)
- [x] 半角英数指定の氏名欄が新カテゴリに分類される(Name + 半角英数/英字の文脈)
- [x] 和文氏名欄(漢字・フリガナ)が従来カテゴリのまま誤分類されない
- [x] 単一Name欄には「名 姓」の順で半角スペース結合される(順序は実装時調整可)
- [x] ローマ字未登録の場合は半角英数欄に漢字を入れない(スキップする)
- [x] LLM分類でも新カテゴリが返り得る
- [x] Country・Address-1〜4等の海外住所欄には手を出さない(別PBI)

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 最小限: samples/ へ半角英数Name欄つきフォームを追加し手動確認手順を残す

### 統合テスト
- classifyAll→buildPlan 経由で半角英数Name meta がローマ字解決されること
- ローマ字あり/なし・和文欄混在・maxlength超過の組み合わせ

### 単体テスト
- classifyField: Name/氏名(英字)/お名前(ローマ字)/Name(半角英数)の positives、漢字氏名欄の negatives
- ローマ字結合: 単一欄の順序と区切り(半角スペース)をテストで固定
- normalizeProfile/validateProfile: ローマ字の半角英字・ハイフン・アポストロフィ許容範囲と不正値の扱い
- planner.buildPlan: ok / warn-maxlength / ローマ字空でスキップ / 入力済みで filled
- 比率目安 E2E:統合:単体 = 1:10:100

## 実装アプローチ
- **Outside-In**: 失敗する受け入れテスト(分類→計画の順)から開始し、赤を確認してから実装
- **Red-Green-Refactor**: TDDサイクルを各層で適用
- **リファクタリング**: グリーンになるたびに品質改善

## 見積もり
3〜5pt (要チームでの見積もり)

## 技術的考慮事項
- 依存関係: なし(本PBIは海外住所を含まない。海外住所は `2026-10-05-06-backlog-overseas-address.md` に分離)
- テスタビリティ: 既存の makeMeta / vitest 流儀に従う。順序(名姓/姓名)はテストで固定し後から変えられるようにする
- 非機能要件: プロファイル値はLLMに送らない既存原則を維持する。ローマ字も個人属性のため設定UIに任意項目である旨を示す

## 実装者向け注記

### 現状コードの確認
着手前に必ず実行すること。2026-10-05時点で以下を確認済み(未実装):

```bash
grep -rn "roman\|alphabet\|latin\|overseas\|海外" src/ tests/ --include="*.ts" | head -30
# roman/alphabet の分類・Profile なし。latin は kana 判定コメントのみ
grep -rn "CATEGORIES" src/core/types.ts
# CATEGORIES に roman 系なし。Profile は lastName/firstName(漢字想定)のみ
```

- `src/core/types.ts:1-11` CATEGORIES に roman 系なし、`Profile` にローマ字なし
- `src/entrypoints/options/main.ts:11-21` PROFILE_FIELDS にローマ字なし
- `src/core/classify-rules.ts` の FULL_NAME は `name` に反応するため、対象の「①Name」欄は現状 fullName に誤分類され漢字が入る。これが今回の不具合の機序
- 対象フォーム `https://www.joshibi.ac.jp/overseas/webform` ①Name は text欄・maxlength 80・半角英数指定。②Country ③Address-1〜⑦Postal code は本PBI対象外

### 実装手順
Outside-Inの縦スライス順に進める:

1. E2E相当の赤を作る: `tests/core/` に半角英数Nameの fixture(makeMetaで label「①Name（最大文字数:80）※半角英数で入力」+ text欄)で classifyAll→buildPlan がローマ字解決しないことを失敗テストとして書く
2. 型と分類を緑にする: `CATEGORIES` に新カテゴリ(例 `lastNameRomaji/firstNameRomaji/fullNameRomaji`)追加、`Profile` にローマ字姓・名追加。`classify-rules.ts` に半角英数文脈(半角英数/英字/ローマ字/alphabet)と Name 語彙の組み合わせ判定追加。和文欄との優先順位をテストで固定する
3. 値解決を緑にする: 単一欄の結合順序(例 `名 姓`)とバリデーション(半角英数・maxlength)を `planner.ts` に追加。ローマ字空の場合は漢字で埋めない分岐を必ず入れる
4. UIと保存を緑にする: options のプロファイル編集欄にローマ字姓・名追加、既存保存データにキーがなくても壊れない互換を保つ
5. 文面を更新する: 対象欄一覧にローマ字氏名を追記し `make check` を通す

### 落とし穴
- 現行の FULL_NAME 正規表現は `name` に素朴に反応する。半角英数文脈の判定を後付けにすると和文Name欄まで新カテゴリに引っ張られる。文脈(半角英数/ローマ字の併記)の有無を条件に入れること
- 単一Name欄の順序は日英で逆になる(漢字は姓 名、ローマ字は名 姓が自然)。既存の `joinName/detectNameSeparator` を流用すると順序が逆になるため別経路にすること
- ローマ字空欄時のフォールバックで漢字を入れないこと。本PBIの核心価値(誤入力防止)が崩れる
- `maxlength` 超過は切り詰めず警告する既存原則を守ること(海外欄は80文字等の指定あり)

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする(E2E相当の手動手順を除く)
- [x] テストカバレッジが基準を満たす（E2E/統合/単体すべて）
- [x] `make check` (typecheck + test + build)が通る
- [ ] コードレビュー完了(ユーザー作業として残す)
- [x] リファクタリング完了（グリーン後）
- [x] ドキュメント更新済み

## INVEST + Readyチェック
- Independent: 海外住所なしで単独提供可
- Negotiable: カテゴリ名・結合順序・許容文字は実装時に調整可
- Valuable: 半角英数Name欄の誤入力防止という単独価値
- Estimable: 影響範囲が分類・計画・Profile・options・文面に限定され見積可
- Small: 1スプリントで完了(3〜5pt想定)
- Testable: 上記受け入れ基準で検証可
- BDD: 独立したユーザーシナリオを持つ
- t_wada: Outside-Inで段階的にテストを書ける
