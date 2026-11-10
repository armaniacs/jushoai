# PBI: planner のカテゴリ別値解決を表駆動化する

## ユーザーストーリー
開発者として、新しいプロファイル項目を1箇所の行追加で足せるようにしたい、なぜなら現在は valueForBase の switch・ABBREVIATABLE/ASSISTABLE 集合・assistFor の switch・select/radio 分岐の4箇所編集が必要で足し忘れが起きる構造だから

## 優先度
- 順位: 1 / 5
- RICEスコア: 9.4（Reach=5 / Impact=2 / Confidence=75% / Effort=0.8人週）
- 根拠: 会社系・海外住所など項目追加が継続中（PBI-118/119/160実績）。足し忘れ防止の波及は全フォーム利用者。純粋関数の置換で確信度高（T2 との差 0.1 に意思決定力はない。Confidence 75% は残置2件を除く範囲）

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ1
- `src/core/planner.ts:118-200`（valueForBase の約30分岐 switch）
- `src/core/planner.ts:210-219`（ABBREVIATABLE / ASSISTABLE の2集合）
- `src/core/planner.ts:225-255`（assistFor の第二 switch）
- `src/core/planner.ts:315-321`（applyAbbrevApprovals の候補選択。abbrev 優先の順序がここだけにいる）
- `src/core/planner.ts:354-376`（select/radio 分岐。isAllowedRadioCategory との二重所有）

## BDD受け入れシナリオ
Scenario: 行追加だけで項目が解決される
  Given カテゴリ行テーブルに新規行を追加する
  When 分類・整形・注入を実行する
  Then 値解決・assist・abbrev・select/radio 可否がテーブルどおりに動く

Scenario: 外部挙動が変わらない
  Given 表化の前後
  When make test と make eval を実行する
  Then 既存の期待値・pin がすべて緑のまま変わらない

## 受け入れ基準
- [x] valueForBase・assistFor・ABBREVIATABLE・ASSISTABLE が行テーブルの読み出しになる（旧シンボルは削除か残置基準を明記し、等価確認は旧新対応表＋make test/eval で行う）
- [x] select/radio 可否は行に畳むか、現状の2箇所所有をコメントで明示して残す（判断基準は「変わる理由が同じ」場合だけ一本化。残置時は理由・日時・再訪条件をコメントに刻む）
- [x] 外部挙動不変（make test・make eval の既存 pin 無変更で緑）
- [x] make check が exit 0

## テスト戦略
- 既存テストが回帰網になる。新規テストは行テーブルの読み出し経路の固定に加え、全行の解決値を列挙する黄金テスト1件。行追加時は1件追加し、pin 変更時は理由記録を必須とする
- 検証: make check（typecheck + 全テスト + 両ブラウザ build + manifest 検査 + lint）

## 見積もり
0.8人週（要チームでの見積もり）

## 技術的考慮事項
- 行の形は既存の `field-catalog.ts`（PBI-158）の流儀に合わせる（category・read・assist・abbreviatable）
- 2箇所所有の解消は YAGNI で判断する。「変わる理由が同じ」場合だけ一本化する

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了（親レビュー待ち）
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-11-10、work/pbi-218）
- `src/core/planner.ts` に `VALUE_ROWS` 表（41行、unknown 除外）を追加。列は
  `category`・`read`・`assist`・`abbreviatable`（`field-catalog.ts` の流儀）。
  `valueForBase` の switch 本体は各行の `read` に移動し、`valueForBase` 自体は
  表の読み出しになった（他 importer なしのため同名で残置、重複なし）。
- 旧新対応表: 旧 valueForBase の各 case→同名行の `read`（本体は verbatim 移動）。
  旧 `ABBREVIATABLE`（building/street/addressNoPref/addressFull）は
  `abbreviatable:true` の4行に置換し集合は削除。旧 `ASSISTABLE`
  （prefecture/city/lastNameKana/firstNameKana/fullNameKana）は `assist` 非 null
  の5行に置換し集合は削除。旧 `assistFor` の case→assist 鍵
  （prefecture→zipPrefecture、city→zipCity、lastNameKana→surname、
  firstNameKana→given、fullNameKana→fullName）。`assistFor` 自体は表読み出し
  として残置。`buildPlan` の `ASSISTABLE.has` 事前判定は `assistFor` 直呼びに
  一本化（assist:null 行は null 返しで同値）。`abbreviationFor` の
  `ABBREVIATABLE.has` は行の `abbreviatable` 列読みに置換。
- select/radio 分岐は行に畳まず2箇所所有を残置（YAGNI）。radio 許可は
  `radio-policy.ts` が分類パイプラインと共有する方針で、select 追加分とは
  変わる理由が異なる。理由・日時・再訪条件を `buildPlan` のコメントに刻んだ。
- 新規テスト（`tests/core/planner.test.ts` の `value row table`）：全行の解決値
  を列挙する黄金テスト1件（国内 fixture、41項目）＋表の固定1件
  （全 concrete 分類の過不足なし、abbrev/assist 列の旧集合との一致）。
  fixture 先行で Red（2件失敗）を確認してから実装し Green にした。
  pin 変更なし。行追加時は黄金表に1件追加すること。
- 等価確認: `make test` 174件・2273テスト緑（期待失敗1件は従来どおり）、
  `make eval` の pin 無変更で緑、`make check` exit 0。
