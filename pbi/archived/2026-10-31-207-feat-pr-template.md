# PBI: PR テンプレートの新設（.github/PULL_REQUEST_TEMPLATE.md）

## ユーザーストーリー
JushoAI に PR を出すコントリビュータとして、新規 PR の説明欄に4節構成（概要/内容/検証/注意）が初期値で入ってほしい、なぜなら PR #18/#19 で守ってきた構成の再現が人依存で、書き手が替わると節の抜けや崩れが起きるから

## 優先度
- 順位: 4 / 6
- RICEスコア: 16（Reach=2 / Impact=0.5 / Confidence=80% / Effort=0.05人週）
- 根拠: PR #18/#19 で既に守っている4節構成（概要/内容/検証/注意）を1枚のテンプレに固定し、再現を人依存から仕組みに変える

## 出どころ
- PR #18（archラウンド3）と #19（archラウンド4）の本文: ともに「## 概要 / ## 内容（時系列 or RICE順、PBI番号列挙）/ ## 検証 / ## 注意」の同一4節構成。検証は make check の exit 0・make site・レビュー判定の引用で、注意は手動確認項目と他 PR との関係を運ぶ
- .github/ の棚卸し: ISSUE_TEMPLATE（bug-report / form-support / config / feature-request の日英併記 YAML フォーム4種）と workflows（check.yml / pages.yml / release.yml）はあるが、PR テンプレートは root・.github/・docs/ のどこにも無く、CONTRIBUTING.md も無い
- check.yml は全 PR で make check を回すため、テンプレは今後の外部コントリビュータにも効く
- docs/release.md はリリース手順のみで、PR 説明文の規約は無い
- 解決済みの疑問: 配置は .github/PULL_REQUEST_TEMPLATE.md（ISSUE_TEMPLATE と同居で自然）。日英併記ではなく日本語のみ（実 PR は日本語で書かれており、Issue フォームと異なり PR 本文の併記は運用に無い）。検証節には make check 実行結果の明記を含める（既存文化どおり）
- 制約: テンプレは1枚、SHIFT-JIS（CP932）で表現できる文字のみ（docs-charset）、検証節は plain markdown のチェックリスト

## BDD受け入れシナリオ
Scenario: 新規 PR の説明欄に4節が初期値で入る
  Given .github/PULL_REQUEST_TEMPLATE.md に概要/内容/検証/注意の4節が置かれている
  When GitHub の「New pull request」画面を開く
  Then 説明欄に4節が初期値で入り、検証節には make check 実行結果を書くチェックリストがある

Scenario: テンプレが実 PR の運用と一致する
  Given PR #18 と #19 の本文
  When テンプレの節構成を実 PR と突き合わせる
  Then 4節の見出しと役割が一致し、テンプレは日本語のみ・CP932 で表現できる文字だけで書かれている

## 受け入れ基準
- [x] .github/PULL_REQUEST_TEMPLATE.md が新設され、概要/内容/検証/注意の4節を含む
- [x] 内容節には「時系列 or RICE順、PBI番号列挙」の指針がある
- [x] 検証節は plain markdown のチェックリストで、make check の実行結果（exit code）の明記を促す
- [x] 注意節には手動確認項目と他 PR との関係を書く枠がある
- [x] テンプレは日本語のみで、CP932 で表現できない文字（EM DASH など）を含まない
- [x] 既存の ISSUE_TEMPLATE と workflows に変更がない
- [ ] docs-charset チェックをパスし、新規 PR 作成画面でテンプレが効くことを目視確認した（docs-charset は pass。テンプレが効くことの目視確認は push 後に新規 PR 作成画面で行う残タスク）

## 実装手順
- .github/PULL_REQUEST_TEMPLATE.md を新設する。骨格は実 PR 運用どおり概要/内容/検証/注意の4節で、各節に1行の書き方指針を添える
- 内容節には時系列 or RICE順・PBI番号列挙の指針、検証節には make check（exit code）・make site・レビュー判定の記入を促す plain markdown のチェックリスト、注意節には手動確認項目と他 PR との関係の枠を置く
- 文字種は CP932 の範囲に保ち、docs-charset のチェックスクリプトで検証する
- 既存の ISSUE_TEMPLATE・workflows には触れず、テンプレ1枚だけを追加する

## テスト戦略
- 検証: docs-charset チェック + 新規 PR 作成画面でテンプレが効くことの目視確認

## 見積もり
0.5（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（2026-11-10 静的レビュー Approved。4節・指針・CP932・無変更を確認。目視のみ残）
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-10-31）
- `.github/PULL_REQUEST_TEMPLATE.md` を新設した（1枚・19行）。骨格は PR #18/#19 の実運用どおり「## 概要 / ## 内容（時系列 or RICE順）/ ## 検証 / ## 注意」の4節で、各節に1行の HTML コメントで書き方指針を添えた
  - 概要: このPRが何で、どのラウンド・計画に基づくかを1、2文で書く指針
  - 内容: 時系列 or RICE順に並べ、該当する PBI 番号を添える指針（空の箇条書きを初期値に用意）
  - 検証: plain markdown のチェックリスト3項目（`make check` exit 0 とテスト数・`make site`・実行したレビューとその判定）。ガイドコメントに make check の exit code とテスト数を必ず残す旨を明記
  - 注意: 残った手動確認項目と、他のPRとの関係を書く指針
- 配置は `.github/PULL_REQUEST_TEMPLATE.md`（ISSUE_TEMPLATE・workflows と同居する GitHub 標準位置。root・docs/ には置かない）。日本語のみとし、日英併記は既存運用に無いため見送った（解決済みの疑問どおり）
- 文字種は CP932 の範囲内（docs-charset のチェックスクリプトで本テンプレと本 PBI の両方を検証し `OK: no out-of-range characters` を確認）。EM DASH（U+2014）は使わず、波ダッシュも避けた
- 既存の ISSUE_TEMPLATE・workflows には触れていない
- 残タスク: push 後に新規 PR 作成画面でテンプレが効くことの目視確認（自動テストでは担保できないため受入基準・DoD を未チェックのまま残す）

## 実装記録（2026-11-09 Task 1 静的検査と記録）
- 静的検査3点を 2026-11-09 に実施し全て pass した
  - (1) 存在: .github/PULL_REQUEST_TEMPLATE.md あり（19行、ls で確認）
  - (2) 4節の順序: ## 概要（1行目）/ ## 内容（時系列 or RICE順）（5行目）/ ## 検証（9行目）/ ## 注意（17行目）の順で存在し、grep で確認
  - (3) CP932: python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py .github/PULL_REQUEST_TEMPLATE.md pbi/2026-10-31-207-feat-pr-template.md の両方に OK: no out-of-range characters（exit 0）
- 目視確認は未実施。本セッションでは実行できないためユーザー作業として残す。理由は新規 PR 作成画面の確認が push 後に GitHub 上で開く操作を要するため。手順は push 後に GitHub で New pull request を開き、説明欄に4節が初期値で入ることと検証節のチェックリストを確認し、日時と確認者とブランチ対比とスクショを本 PBI に追記すること。
- BDD全自動化の断念理由: 新規 PR 作成画面は GitHub Web UI に依存し、自動テストから操作できない。無理に自動化すると保守コストが効果を上回るため、静的検査3点に置換し、初回目視を正式手順とした。このため DoD の自動テスト化とコードレビューは本 Task では未達のまま残す。
- ISSUE_TEMPLATE と workflows には触れていない。コミットはしていない。

## 実装記録（2026-11-10 静的レビュー）
- 4節順序（概要:1/内容:5/検証:9/注意:17、19行）・指針と実運用の一致・CP932・ISSUE_TEMPLATE/workflows 無変更を確認し Approved。レビュー箱を [x] にした
- 残す [ ]：目視確認（push 後の GitHub 画面操作が必要）、BDD 自動テスト化（断念記録どおり静的検査3点に置換）
- 指摘の反映：実装記録の「1枚・21行」を 19行に訂正（1641732 で削減済み）
