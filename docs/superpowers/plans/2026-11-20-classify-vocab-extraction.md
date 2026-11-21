# 実装計画: 分類語彙テーブルの抽出 (2026-11-20)

## 背景と目的

`src/core/classify-rules.ts` (897 行) は分類 module の implementation として深いが、interface が 12 export に広がり、語彙 1 語の追加が 897 行ファイルの編集と 15 個のテストファイルの見直しを要求する (locality の崩れ)。2026-11-18 レビューは graphify degree 87 の god node として同じ方向を記録済み。planner の `VALUE_ROWS`・options の `SideSpec` で実証済みの「表に 1 行足すだけ」流儀を分類語彙にも適用する。

grilling で確定した決定:

- 語彙定数 + 対応する matcher をドメイン別 module に抽出 (matcher と語彙は同居)。classify-rules.ts は DISPATCH 合成・refine・共通キットを保持
- 優先順は classify-rules.ts の明示的な結合リテラル 1 個が単一所有 (今日の順序を完全保存)
- 配置は `src/core/` 直下 flat、自然ドメイン 6 群 + `dispatch-kit.ts`
- `dropLeftovers` / `narrowAddress` / `refineWithDrops` / `SplitDrop` を非公開化し、直叩きテストを公開 interface 経由に書き換え。`classifyRulePipelineWithTrace` / `RulePipelineTrace` / `TEXT_TO_CATEGORY_STAGES` は eval pin 契約として export 維持 (12 → 8 export)
- 命名: `classify-vocab-<domain>.ts`。ドメイン用語は CONTEXT.md に登録済み

## Global Constraints (全タスクに適用)

1. **挙動不変のリファクタ**: 基点コミット (e1c43f3) に対して分類結果・確度・優先順の意味論を一切変えない。own 0.7 > legend 0.65 のグラデーション、「月・日は 年 に先んじる」「school が氏名 sources に先んじる」等の順序依存はすべて保存する。
2. **テスト資産は触らない**: `samples/` fixture、`tests/integration/samples.test.ts`、`tests/eval/corpus.eval.ts` の `PIN_TABLE` は変更しない。`make eval` は基点と同一結果 (3 passed) であること。
3. **最終公開 interface は 8 個**: `ACCEPT_THRESHOLD`, `isConfident`, `classifyField`, `refineClassifications`, `classifyRulePipeline`, `classifyRulePipelineWithTrace`, `RulePipelineTrace`, `TEXT_TO_CATEGORY_STAGES`。`dropLeftovers` / `narrowAddress` / `refineWithDrops` / `SplitDrop` は Task 4 で非公開化。
4. **新 module の roster** (`src/core/` 直下、flat): `dispatch-kit.ts`、`classify-vocab-office.ts`、`classify-vocab-birth.ts`、`classify-vocab-name.ts`、`classify-vocab-school.ts`、`classify-vocab-address.ts`、`classify-vocab-misc.ts`。
5. **語彙 module の形状**: 各語彙 module は自ドメインの語彙定数 (regex / set) と、それに属する eligibility ヘルパーと、DISPATCH matcher entry を `dispatch-kit` の `MatcherEntry` 型の順序付き配列として所有する。語彙定数はドメイン間で import 可能にする (school の department entry は office の `DEPT_OFFICE` 系ヘルパーを参照し、companyKana entry は birth の `BIRTH_CTX` でゲートする等)。classifyField / classifyText が直接使う語彙定数は所属ドメインの module から import する。
6. **DISPATCH 結合リテラル**: `classify-rules.ts` の `DISPATCH` は 1 個の明示的な配列リテラルで、今日の entry 順を完全保存する (birth → school → office → gender → address → age → romaji-name)。ドメインの entry が今日非連続な場合 (gender が address の前、age が romaji の前)、その module は連続区間ごとに 1 個の配列を export する (misc は `genderEntries` と `ageEntries` の 2 個)。
7. **classify-rules.ts に残すもの**: `classifyField` 本体、`classifyText`、`AUTOCOMPLETE` 表、refine / split 系 (`SplitDrop`、`dropLeftovers`、`narrowAddress`、`refineWithDrops`、`refineClassifications`、`SPLIT_POLICIES`、`TEL_PARTS`、`ZIP_PARTS`)、`TEXT_TO_CATEGORY_STAGES`、pipeline 合成、DISPATCH 結合リテラル。
8. **コメント・識別子は英語**。非自明な WHY のみ。移動する際、日本語コメントは英語に訳して運ぶ (訳にあたり意味を変えない)。語彙定数・正規表現の本体は 1 文字も変えない。
9. **コミット規約**: Conventional Commits の日本語 (例: `refactor(core): ...`)。ファイルは個別に stage し、`git add -A` / `git add .` は使わない。push しない。
10. **各タスクの完了条件**: `make check` 緑 (typecheck + vitest + 両ブラウザ build + manifest 検査 + web-ext lint)。反復中は対象テストを focused run し、コミット前に 1 回だけ make check を走らせる。

## タスク間の依存

Task 1 → Task 2 → Task 3 → Task 4 の直列。Task 2/3 で DISPATCH を段階的に結合リテラルへ寄せ、Task 3 で完成させる。Task 4 はテーブル抽出完了後のみ実施する。

## Task 1: dispatch-kit.ts を切り出す

`src/core/dispatch-kit.ts` を新規作成し、`classify-rules.ts` から次を verbatim で移す: `DispatchCtx`、`Matcher`、`MatcherEntry`、`matchAs`、`ownLegend`。kit 側では export し、`classify-rules.ts` は import してローカル定義を削除する。

- 移動対象はこの 5 個のみ。`hasDecadeOptions` (misc 所属) や `romajiBase` (name 所属) は動かさない
- `DispatchCtx` が参照する型 (`FieldMeta`, `SelectOption`) は `./types` から import
- コメントの移動: 「one data row expands to the ordered pair」等の WHY コメントは英語のまま `ownLegend` に付き従う
- テスト追加不要 (挙動不変)。既存テスト全綠でよい

## Task 2: office と birth の語彙テーブルを抽出する

`src/core/classify-vocab-birth.ts` を新規作成: `BIRTH_CTX`, `BIRTH_PHRASE`, `BIRTH_PHRASE_EN`, `ERA_CTX`, `ERA_NAME` とヘルパー `isBirthPhrase`、および DISPATCH entry `[birth-month, birth-day, birth-year, birth-era]` をこの順の配列 (例: `birthEntries`) で export。`classify-rules.ts` の `classifyField` / kana 帰属側が直接使う定数があれば export して import する (使う側を grep して確認)。

`src/core/classify-vocab-office.ts` を新規作成: `EXCLUDE`, `COMPANY_OFFICE`, `DEPT_OFFICE`, `COMPANY_WORD`, `JOB_OFFICE`, `COMPANY_KANA`, `COMPANY_NAME_KEY`、eligibility クラスタ (`hasCompoundDeptJoint`, `officeContextExcluded`, `officeEligible`, `deptOfficeEligible`, `hasOwnDeptName`, `hasCompoundJobJoint`, `jobOfficeEligible`, `officeLegendEligible`, `officeKanaEligible`)、`companyNameKey` / `isCompanyByName`、および DISPATCH entry `[companyNameKana-own/legend, company-own/legend, companyDepartment-own/legend, job-title-own]` をこの順の配列 (例: `officeEntries`) で export。`hasOwnDeptName` は school の department entry から使われるため export しておく (Task 3 で school module が import)。

`DISPATCH` を結合リテラルへ第一段階移行する:

```ts
const DISPATCH: readonly MatcherEntry[] = [
  ...birthEntries,
  // school / department entries remain inline until Task 3
  ...officeEntries,
  // gender 以降も現状インラインのまま
];
```

- entry 順は今日と完全一致させる (birth → school(dept 含む) → officeCompanyNameKana → company → companyDepartment → job → gender → ...)
- `EXCLUDE` は `classifyText` (454 行) が使うため office module から import
- companyKana entry のゲートが `BIRTH_CTX` を参照する (office module が birth module の定数を import する — 許可された語彙横断)

## Task 3: 残り 4 ドメインを抽出し DISPATCH を完成させる

- `src/core/classify-vocab-school.ts`: `SCHOOL`, `DEPT` + entries `[school-own/legend, department-own/legend]` (office から `hasOwnDeptName` を import)
- `src/core/classify-vocab-name.ts`: `LAST`, `FIRST`, `FULL_NAME`, `NAME_EXCLUDE`, `KANA_NOTE`, `ROMAJI_CTX` + `romajiBase`, `isEmailByName`, `isBareMailName` + entries `[romaji-full-name, romaji-last-name, romaji-first-name, romaji-either-name]`。`classifyText` が `NAME_EXCLUDE` / `LAST` / `FIRST` / `FULL_NAME` を使うため export して import
- `src/core/classify-vocab-address.ts`: `COUNTRY`, `ADDR_LINE`, `POSTAL_CODE`, `OVERSEAS_CTX`, `FOREIGN_MARK` + entries `[country-own/legend, address-line-own, address-line-legend, postalCode-own/legend]`
- `src/core/classify-vocab-misc.ts`: `GENDER`, `AGE`, `WEBSITE`, `SEARCH_BOX_NAME`, `isSearchBox`, `hasDecadeOptions` + 連続区間ごとの 2 配列: `genderEntries` `[gender-own, gender-legend]`、`ageEntries` `[age-own, age-legend]`
- `DISPATCH` を最終形に:

```ts
const DISPATCH: readonly MatcherEntry[] = [
  ...birthEntries,
  ...schoolEntries,
  ...officeEntries,
  ...genderEntries,
  ...addressEntries,
  ...ageEntries,
  ...nameEntries,
];
```

- 各語彙 module の配列内順序は今日の entry 順と一致。結合リテラルの並び自体が優先順の単一所有者である旨を 1 行コメントで書く (英語)
- 移動後に classify-rules.ts から消えた定数・ヘルパーの参照が残っていないことを typecheck で確認

## Task 4: refine 3 つ組を非公開化しテストを公開 interface 経由に移す

1. 先にテストを書き換える: `tests/core/classify-rules.test.ts` の `dropLeftovers` / `narrowAddress` / `refineWithDrops` 直叩き (describe 2 本 + refineWithDrops 3 箇所) と `tests/core/send-set.test.ts` の `refineWithDrops` 使用 2 箇所を、`refineClassifications` / `classifyRulePipeline` / `classifyRulePipelineWithTrace` 経由のアサーションに書き換える。この時点では export が残っているのでテストは緑のまま
2. 各アサーションの意図 (PBI-219 の挙動 pin) を公開 interface から観測可能な形で保存する: 生き残り item のカテゴリ列、消失した分類の不在、pipeline の送信集合など。公開 interface から観測できないアサーションがあった場合は黙って削除せずレポートに記録する
3. `classify-rules.ts` から `dropLeftovers` / `narrowAddress` / `refineWithDrops` / `SplitDrop` の export を外す
4. `tests/core/pipeline-entry.test.ts` は変更しない (`TEXT_TO_CATEGORY_STAGES` は pin 契約として export 維持)
5. `make check` 緑 + `make eval` が基点と同一 (3 passed) であることを確認

## 完了後 (controller 実施)

- `make eval` の pin 不変確認
- `graphify update .` でナレッジグラフを更新
- 全ブランチ最終レビュー → 台帳更新
