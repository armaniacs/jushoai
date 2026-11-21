# PBI: MS Forms 系フォームの所属部署名・役職名の自動入力対応

## ユーザーストーリー
東京都 OpenRoaming 意見聴取会フォームのような MS Forms 系フォームを使う利用者として、3.所属部署名と 4.役職名の欄にもプロファイル値が自動入力されてほしい、なぜなら氏名・団体名・メール・電話は既に入るのにこの 2 欄だけ手入力が残ると、フォーム全体の入力短縮という拡張の目的が半減するから

## 優先度
- RICEスコア: 未確定（要チームでの見積もり）
- 根拠: ユーザー報告起点の 1 フォーム対応だが、所属部署・役職の語彙は FF 系・企業問い合わせ系の複数 fixture に波及し、corpus 全体の ruleHits を上げる。回帰リスクは pin 網で抑止済み

## 出どころ
- 東京都 OpenRoaming 意見聴取会フォームのユーザー報告（Q3 所属部署名、Q4 役職名が未分類のまま残る）
- T1 で `make addurl` 流により `samples/responsepage-aspx.html` として再現 fixture 化し、現状分類（Q3・Q4 とも unknown）を pin 済み

## BDD受け入れシナリオ
Scenario: 所属部署名が companyDepartment に分類される
  Given プロファイルに所属部署（例: 開発部）が保存されている
  When MS Forms 系フォームの「3.所属部署名」欄を分類する
  Then カテゴリ companyDepartment・rule・confidence 0.7 以上で分類され、プレビュー承認後に所属部署の値が注入される

Scenario: 役職名が jobTitle に分類される
  Given プロファイルに役職（例: 課長）が保存されている
  When MS Forms 系フォームの「4.役職名」欄を分類する
  Then カテゴリ jobTitle・rule・confidence 0.7 で分類され、プレビュー承認後に役職の値が注入される

Scenario: 複合欄と既存回帰は維持される
  Given 「会社名・部署名」「部署名・役職名」「会社名・役職名」のような複合欄
  When 分類する
  Then 会社複合は company、部署・役職複合は companyDepartment のまま残り、companyDepartment / jobTitle にはならない。既存の除外 pin（応募/申込団体名、会社名フリガナ、生年月日文脈、会社電話、店舗名、法人種別、ご担当者名）も全て維持される

Scenario: 空の所属部署・役職は警告のみで注入しない
  Given プロファイルの所属部署・役職が未設定（空文字）
  When 該当欄を含むフォームで注入計画を立てる
  Then 汎用パスで warn-no-value となり、値は注入されない（fillable は増えない）

## 受け入れ基準
- [x] Q3「3.所属部署名」→ companyDepartment（rule, 0.7）、計画値 開発部
- [x] Q4「4.役職名」→ jobTitle（rule, 0.7）、計画値 課長
- [x] 複合欄（会社名・部署名→company、部署名・役職名→companyDepartment、会社名・役職名→company）が維持される
- [x] 既存の除外・回帰 pin が全て緑（全スイート 2563 passed + 1 expected fail）
- [x] 空値時は warn-no-value（eval の fillable が T1 以降不変 = 731 で証明）
- [x] eval pin 表が実測と一致し `npm run eval` が緑

## 実装手順
- T1: fixture 追加のみ（`make addurl` → 最小再現に削減 → `samples.test.ts` に現状 pin、Q3/Q4 は unknown のまま）
- T2: 所属部署の語彙切り出し（TDD RED→GREEN）。T3: 役職の語彙切り出し＋ `Profile.jobTitle` など plumbing（TDD RED→GREEN）
- T4: eval pin の実測転記、全体検証、PBI 記録（分類ロジック変更なし）

## テスト戦略
- 分類のずれは `tests/core/classify-rules.test.ts` に fixture 的 pin を先に追加して失敗させてから直す（TDD）
- `tests/corpus.ts` 台帳＋ `tests/integration/samples.test.ts` が全 fixture の期待分類を pin
- `tests/eval/corpus.eval.ts` の 1 行表が corpus 全体の指標ドリフトを検出（行 diff が世代記録）
- Gemini Nano の実精度とページ上の挙動は `samples/` で手動確認（自動化不能のため対象外）

## 見積もり
未確定（要チームでの見積もり。実装は T1–T4 の 4 コミットで完了済み）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（T1/T2 本審査＋再審査/T3 審査、いずれも Approved。T2 本審査の FAIL は fix wave で解消）
- [x] ドキュメント更新済み（本 PBI に実装記録。CHANGELOG はリリース時の docs 運用に委ね、ブランチ内では追記しない）

## 実装記録 (2026-11-13, feat/forms-dept-title)

Branch `feat/forms-dept-title` 上の 4 コミット（いずれもレビュー Approved、分類ロジック変更は T2/T3 のみ、T4 は pin・記録のみ）。

### T1: 0766cba — MS Forms OpenRoaming の再現 fixture と現状分類を pin する
- `make addurl` で対象 URL を `tests/target-url.md` に登録し、静的取得できたのは JS シェルのみ（約 67KB・操作欄 0 件）だったため、報告文言どおりに `samples/responsepage-aspx.html` を手書き再現（Q1–Q7 のうち Q3 は live の「所属部署名」文言どおり）。
- `tests/integration/samples.test.ts` に ms-forms ケースを追加し現状を pin（Q1/Q2/Q5/Q6 のみ fillable、Q3/Q4 は unknown）。
- `src/` 無変更。`corpus.eval.ts` は T4 所有のため未更新（RED-by-design を report に記録）。

### T2: 84abdb9 — 単独の部署名を companyDepartment に分類する
- `src/core/classify-rules.ts` の `DEPT_OFFICE` に単独 部署名の選択肢を追加（会社語との複合 joint は lookbehind で companyDepartment 信号から除外）。DISPATCH 順序は不変のため `COMPANY_OFFICE` 複合は company のまま先勝する。
- Q3 `name=department` 相当は school `department` 読みのままだったが、これは fix wave で解消（下記 F1）。
- `tests/corpus.ts` の該当 fixture（FF 系 3 件、tokyu-tenant `team`、nttud `form_division`、mitsubishi `e_8559`）を開発部に更新。

### fix: 8bdb544 — T2 レビュー F1/F2/F4 の修正（T3 の所有物 q4 には触らない）
- F1（Critical）: school `DEPT` エントリが日本語 部署名所持時は譲るガード（`hasOwnDeptName`）を追加し、sysmex `department`（label 所属部署名）を companyDepartment/開発部に是正。bare-部署の英語 token 欄 7 件は school 読みのまま。
- F2（Important）: `COMPANY_OFFICE` に企業名を追加し、`hasCompoundDeptJoint` による joint 検出を DISPATCH 順序とは独立の第二ガードにした（順序が将来変わっても joint が department に誤読されない）。
- F4（Minor）: `{ label: '部署名', nearby: '会社名' }` → companyDepartment 0.7 の cross-case pin を追加。
- F3（Minor）: brief Req 2 の文言を修正（「compound は unknown」→「compound は company（never department）」）。コード変更なし。
- F5（Minor）: planner の school `department` → `profile.department` に対し import-draft が `department` → `companyDepartment` に写像する非対称は既存のまま。T3 への申し送り。

### T3: 12f15a2 — 役職名を jobTitle に分類し自動入力する
- T2 の部署名パターンを鏡写し：`JOB_OFFICE = /役職/` ＋ `hasCompoundJobJoint`（会社|法人|企業|団体|店舗|事業所|営業所|部署|社）＋ `jobOfficeEligible`。EXCLUDE 本体は不変で、job 信号がある own-text のみゲートが開く。
- own-text 限定の `job-title-own` DISPATCH エントリ（0.7）を department 系の後に配置。legend エントリは作らない（legend-only の役職形状を unknown のまま保つ設計）。
- plumbing（固定名・順序）：`Profile.jobTitle`＋`CATEGORIES 'jobTitle'`＋`EMPTY_TEMPLATE ''`（types.ts）、trim-only の normalize（profile.ts）、`PROFILE_FIELD_CATALOG`（companyDepartment の直後、label 役職（任意）/placeholder 課長/guest:false）、planner 行（companyDepartment の直後、assist:null/abbreviatable:false）。
- 既存保存プロファイルは `migrateData` の template spread で `jobTitle: ''` が補完される（storage 互換、pin 済み）。
- corpus 全体で flipped したのは ms-forms q4 のみ。他の役職形状は legend-only のため unknown のまま。

### T4: eval pin 適用（本コミット、分類ロジック変更なし）
- `tests/eval/corpus.eval.ts` の 8 行を実測に合わせた（対応表は T4 report に記録）。aggregate はT3 実測どおり fixtures=135 fields=1890 ruleHits=1223 llmFallbacks=630 fillable=731。
- `make check` exit 0（typecheck＋全テスト＋両ブラウザ build＋manifest 検査＋web-ext lint、errors 0）。E2E は agent 環境でブラウザ起動に失敗するため未実行として記録（Chrome は tab crashed、Firefox は marionette decode 失敗。いずれも環境起因）。

## 落とし穴（レビュー由来の注意点）
- F1 の経緯（T2 レビュー Critical）：ゲート開放の副作用で sysmex の「所属部署名」欄（`name=department`）が safe-unknown から school 値・普通科の誤注入に転じた。「誤注入より不注入」方針に反するため、school `DEPT` エントリに日本語 部署名所持時の譲歩ガードを入れて companyDepartment に是正した。将来ゲートを開ける変更は、英語 token 系 fixture 8 件の読み（companyDepartment 1 件 vs school 7 件）を必ず確認すること。
- F2 の複合ガード：lookbehind の allowlist は会社語彙より狭い（企業名は追加済み、店舗名は意図的に除外）。DISPATCH 順序が第一ガード、`hasCompoundDeptJoint` が第二ガードの二重化で守っている。順序変更や語彙追加の際は両方を見直すこと。
- T3 の legend-only 方針：jobTitle には legend エントリが無い（tokyu-tenant `job` 等の legend-only 役職形状を unknown に保つため）。legend 欄の役職対応を求められたら設計から見直すこと（単なるエントリ追加では registration/toshiba/lasertec の legend-only 形状まで巻き込む）。
- import 未配線（F5 継承）：`src/core/import-draft.ts` の `PROFILE_KEYS` には `companyDepartment` も `jobTitle` も未写像（T2 の前例踏襲）。ページ取込で役職名を取り込みたくなったら 1 行追加（`jobTitle: 'jobTitle'`）だが、planner/import-draft の非対称解消とセットで検討すること。
- LLM prompt には jobTitle の prose 行を足していない（companyNameKana の前例に倣い、enum は `CATEGORIES` 由来）。LLM fallback は jobTitle を発しない。rule（0.7）が単独形状を覆う前提であり、前提が崩れたら見直すこと。
- live ページは JS 描画で静的取得不可だった（T1 の約 67KB シェル）。Q7 以降は「備考」の stand-in で unknown pin。再取得は実ブラウザ session が必要。
