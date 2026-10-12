# PBI 台帳インデックス

## 進行中

- `2026-10-11-38-fix-button-anchor-placement.md`（フォームボタンの左下配置の是正。対象 URL 2 件の fixture 化を含む）
- `2026-10-11-21-backlog-release-assertion-parser.md`（将来候補。着手条件を記録済み、現行のテキスト断言を維持）
- `2026-10-11-31-backlog-edge-e2e.md`（将来候補。Chrome とエンジン同一のため Edge 固有事由まで待機）

## 台帳

- `archived/2026-10-11-06-backlog-run2-remediation-round.md`（アーカイブ済み）
- `archived/2026-10-11-03-backlog-egress-gate-round.md`（アーカイブ済み）
- `archived/2026-10-11-00-backlog-pages-update.md`（アーカイブ済み）
- `archived/2026-10-06-00-backlog-action-popup.md`（アーカイブ済み）
- `archived/2026-10-06-00-backlog-ai-analyze.md`（アーカイブ済み）
- `archived/2026-10-06-00-backlog-ai-audit-log.md`（アーカイブ済み）
- `archived/2026-10-06-00-backlog-holistic-improvement.md`（アーカイブ済み）
- `archived/2026-10-06-00-backlog-japanese-polish.md`（アーカイブ済み）
- `archived/2026-10-06-00-backlog-settings-navigation.md`（アーカイブ済み）

## アーカイブ一覧

| PBI | 完了コミット |
|---|---|
| 2026-10-11-37-backlog-review3-suggestions-round.md | ラウンド完結（順位 1〜4 をアーカイブ済み。未コミット、`make check` green） |
| 2026-10-11-33-fix-pageurl-cap-wiring-test.md | 未コミット fix: 入口制限の統合テスト。`make check` green |
| 2026-10-11-34-chore-pageurl-truncation-note.md | 未コミット chore: 切詰受容の記録。`make check` green |
| 2026-10-11-35-chore-test-describe-layout.md | 未コミット chore: describe 分離。`make check` green |
| 2026-10-11-36-chore-import-merge.md | 未コミット chore: import 結合。`make check` green |
| 2026-10-11-32-fix-audit-pageurl-cap.md | 未コミット fix: 監査入口で pageUrl を UTF-8 1024 バイトに制限（文字境界・共有 sanitizer 不変）。`make check` green |
| 2026-10-11-30-feat-chrome-e2e.md | 未コミット feat: Chrome 実ブラウザ E2E（BiDi 導入・ID 解決・3 ケース）。Chrome 実機 3/3 green、`make check` green |
| 2026-10-11-29-fix-hit-test-own-shadow-node.md | 未コミット fix: ゲートがパネル host を掴むよう修正＋ヒット判定の内側ノード受容。単体・E2E・`make check` green |
| 2026-10-11-23-backlog-review-suggestions-round.md | ラウンド完結（順位 1〜6・8 をアーカイブ済み、順位 7 は将来候補。未コミット、`make check` / `make site` green） |
| 2026-10-11-28-backlog-review2-suggestions-round.md | ラウンド完結（順位 1〜4 をアーカイブ済み。未コミット、`make check` green） |
| 2026-10-11-24-fix-consent-point-throw-guard.md | 未コミット（レビュー第2ラウンド順位 1）fix: ボタン点取得の例外安全化。`make check` green |
| 2026-10-11-25-chore-test-spy-restore.md | 未コミット（同順位 2）chore: スパイ復元の try/finally 化。`make check` green |
| 2026-10-11-26-chore-apply-point-null-removal.md | 未コミット（同順位 3）chore: ApplyPoint の null 除去。`make check` green |
| 2026-10-11-27-fix-consent-real-dom-coverage.md | 未コミット（同順位 4）fix: 同意検証の DOM 問合せ注入化。`make check` green |
| 2026-10-11-15-fix-apply-point-reason.md | 未コミット（レビュー対応ラウンド順位 1）fix: ゼロ矩形と画面外の理由分離。`make check` green |
| 2026-10-11-16-fix-opacity-compare.md | 未コミット（同順位 2）fix: opacity フォールバックの数値化。`make check` green |
| 2026-10-11-17-fix-consent-button-point.md | 未コミット（同順位 3）fix: 検証点を承認ボタン矩形に厳密化。`make check` green |
| 2026-10-11-18-fix-audit-budget-overhead.md | 未コミット（同順位 4）fix: 配列構造分を予算計上に加算。`make check` green |
| 2026-10-11-19-chore-audit-remeasure-bound.md | 未コミット（同順位 5）chore: 再計測上限の記録と回数テスト。`make check` green |
| 2026-10-11-20-chore-doh-budget-accepted.md | 未コミット（同順位 6）chore: 解決回数上限の記録。`make check` green |
| 2026-10-11-22-chore-test-reason-assertion.md | 未コミット（同順位 8）chore: テスト断言の整理。`make check` green |
| 2026-10-11-03-backlog-egress-gate-round.md | ラウンド完結（子 PBI 04・05 をアーカイブ済み。未コミット、`make check` green。再監査での確認はユーザー作業） |
| 2026-10-11-04-fix-egress-resolver-origin-and-fail-closed.md | b709b35 fix: リゾルバ origin を許可要求に含め、解決不能時は fail-closed に倒す（コードレビューはユーザー作業） |
| 2026-10-11-05-feat-declaration-request-use-check.md | e8754c5 feat: 宣言・要求・使用の一致検査を make check に入れ、egress の方針を定数の単一ソースにする（コードレビューはユーザー作業） |
| 2026-10-11-06-backlog-run2-remediation-round.md | ラウンド完結（子 PBI 07〜14 をアーカイブ済み。未コミット、`make check` / `make site` green。実機確認・再監査はユーザー作業） |
| 2026-10-11-07-fix-consent-ui-isolation.md | 未コミット（タスククローザの並列実装）fix: 同意 UI の important 化と適用直前検証。`make check` green。実機確認・レビューはユーザー作業 |
| 2026-10-11-08-fix-audit-entry-bytes.md | 未コミット（同上）fix: 監査ログの計上を記録全体に拡大。(b) 不採。`make check` green。レビュー・(b) の起票判断はユーザー作業 |
| 2026-10-11-09-fix-egress-verdict-cache-ttl.md | 未コミット（同上）fix: egress 検証を per-call 化しキャッシュを廃止。`make check` green。レビューはユーザー作業 |
| 2026-10-11-10-backlog-resolve-and-pin.md | 未コミット（同上）判断 (c) 受容を記録（API リファレンス根拠つき）。実装なし。レビューはユーザー作業 |
| 2026-10-11-11-docs-host-permission-port-granularity.md | 未コミット（同上）docs: 許可のホスト単位と送信先限定の記録。`make site` / `make check` green。レビューはユーザー作業 |
| 2026-10-11-12-fix-gemini-egress-consistency.md | 未コミット（同上）docs: Gemini の egress 不通過を受容として 1 か所に記録。`make check` green。レビューはユーザー作業 |
| 2026-10-11-13-feat-release-pipeline-hardening.md | 未コミット（同上）feat: リリース workflow の最小権限化と承認経路。`v*` ruleset と environment `release` の承認ゲートは作成・実証済み。タグ署名は 2026-10-12 の方針変更で必須を外した。残りはレビュー |
| 2026-10-11-14-chore-stale-source-comments.md | 未コミット（同上）chore: コメント 2 か所の是正（host.ts は 07 に吸収、audit-log.ts のみ）。`make check` green。レビューはユーザー作業 |
| 2026-10-11-00-backlog-pages-update.md | ラウンド完結（子 PBI 11-01・11-02 をアーカイブ済み。未コミット、`make check` / `make site` green） |
| 2026-10-11-01-feat-store-announcement.md | 未コミット（11a）feat: Pages と README に Chrome ウェブストアの導線を足す |
| 2026-10-11-02-feat-landing-video-embed.md | 未コミット（11a）feat: ランディングに紹介動画の埋め込みセクションを足す |
| 2026-10-10-00-backlog-vulnhunt-remediation.md | ラウンド完結（子 PBI 10-10-01〜07 全件アーカイブ済み） |
| 2026-10-10-07-backlog-dev-toolchain-cves.md | 未コミット（1009a）shell-quote を overrides 1.12.0 で解消、node-forge は修正版リリースなしで追跡継続。make check green |
| 2026-10-10-06-fix-audit-cross-context-race.md | 未コミット（1009a）fix: 監査ログの削除を単一コンテキストに集約する |
| 2026-10-10-05-fix-provider-response-bound.md | 未コミット（1009a）fix: プロバイダ応答の読み取りを有界化する |
| 2026-10-10-04-fix-egress-dns-validation.md | 未コミット（1009a）fix: Base URL の解決済みアドレスを保存時とダイヤル直前に検証する |
| 2026-10-10-03-fix-audit-byte-budget.md | 未コミット（1009a）fix: 監査ログのサイズ予算をバイト長で計上する |
| 2026-10-10-02-fix-autocomplete-proto-lookup.md | 未コミット（1009a）fix: autocomplete のルックアップをプロトタイプ継承の影響を受けない形にする |
| 2026-10-10-01-fix-scan-text-cap.md | 未コミット（1009a）fix: スキャン時の label・placeholder に長さ上限を付ける |
| 2026-10-09-01-feat-audit-trace-viewer.md | 095f51c feat: 監査ログの記録拡充と設定ページの独立化（0.1.12）。コードレビューのみユーザー作業として残存 |
| 2026-10-07-00-backlog-holistic-improvement-b.md | ラウンド完結（子 PBI 07-01〜07-04 全件アーカイブ済み） |
| 2026-10-07-00-backlog-arch-deepening-b.md | ラウンド完結（子 PBI 07-05〜07-07 全件アーカイブ済み） |
| 2026-10-04-00-backlog-architecture-deepening.md | ラウンド完結（子 PBI 04-01〜04-06 全件アーカイブ済み） |
| 2026-10-04-01-fix-overlay-mutual-exclusion.md | fbc767d fix: プレビューと AI ガイドのオーバーレイを相互排他にする |
| 2026-10-04-02-refactor-classify-confidence.md | 42920aa refactor: 分類信頼度判定を isConfident に集約する |
| 2026-10-04-03-refactor-ai-message-types.md | d6e8f3b refactor: AI 状態とメッセージ語彙を const 源に一元化する |
| 2026-10-04-04-refactor-overlay-panel.md | 2c201d6 refactor: オーバーレイパネルの共通部分を ui/overlay に抽出する |
| 2026-10-04-05-refactor-meta-wire-shape.md | 3fffb4b refactor: 欄メタデータの wire 形状を messages.ts に一元化する |
| 2026-10-04-06-refactor-classifier-seam.md | d689854 refactor: FieldClassifier seam を core に移動する |
| 2026-10-05-01-feat-split-groups-distinct-labels.md | 4acc05d feat: ラベル別文言の電話・郵便番号分割欄に対応する |
| 2026-10-05-03-feat-url-fixture-workflow.md | 5bc3851 feat: URL付きPBIのfixture雛形生成スクリプトと運用ルールを追加する |
| 2026-10-05-02-backlog-gender-radio.md | 29823f6 feat: 性別・年代のradio群の走査・分類・注入に対応する |
| 2026-10-05-04-backlog-age-decade-radio.md | 29823f6 feat: 性別・年代のradio群の走査・分類・注入に対応する |
| 2026-10-05-form-report.md | f26025b feat: フィードバックに注意文を付け報告PBIと優先度メモを確定する |
| 2026-10-05-00-backlog-priorities.md | f26025b feat: フィードバックに注意文を付け報告PBIと優先度メモを確定する |
| 2026-10-06-01-feat-toolbar-icon.md | a371d5d feat: ツールバーに拡張機能アイコンを導入する |
| 2026-10-06-00-backlog-settings-navigation.md | 未コミット（1006a）設定ページの左メニュー化の台帳 |
| 2026-10-06-02-feat-options-sidebar.md | 未コミット（1006a）feat: 設定ページに左メニューを導入する |
| 2026-10-06-03-feat-options-report-link.md | 未コミット（1006a）feat: 左メニューの最下部に不具合報告を置く |
| 2026-10-06-00-backlog-action-popup.md | 未コミット（1006a）ロゴ・確認ポップアップ・ギアの台帳 |
| 2026-10-06-04-feat-options-logo.md | 未コミット（1006a）feat: 設定画面の左上にロゴを置き Pages へリンクする |
| 2026-10-06-05-feat-action-popup.md | 未コミット（1006a）feat: ツールバークリックで確認ポップアップを開く |
| 2026-10-06-06-feat-popup-gear.md | 未コミット（1006a）feat: 確認ポップアップの右上にギアを置く |
| 2026-10-06-00-backlog-ai-audit-log.md | 未コミット（1006a）AI 通信の監査ログの台帳 |
| 2026-10-06-01-feat-ai-audit-log.md | 未コミット（1006a）feat: AI 呼び出しの監査ログを記録する |
| 2026-10-06-02-feat-audit-log-download.md | 未コミット（1006a）feat: 監査ログを TSV でダウンロードできるようにする |
| 2026-10-06-00-backlog-ai-analyze.md | 未コミット（タスククローザで実装、レビュー・実機確認はユーザー作業）AI で分析ボタン・改名・ドキュメントの台帳 |
| 2026-10-06-07-feat-rename-to-ai-analyze.md | 未コミット（同上）feat: プレビューの再分析ボタンを AI で分析に改名する |
| 2026-10-06-08-feat-popup-ai-analyze.md | 未コミット（同上）feat: 確認ポップアップに AI で分析ボタンを置く |
| 2026-10-06-09-feat-ai-analyze-docs.md | 未コミット（同上）feat: 改名とボタンに合わせてドキュメントを直す |
| 2026-10-06-10-fix-profile-label-example.md | c45417d fix: プロファイル名の例示からテスト用を削る |
| 2026-10-06-11-fix-ai-notice-metadata.md | fca4316 fix: AI設定のメタデータ説明文を内訳分離で読みやすくする |
| 2026-10-06-12-fix-auth-error-split.md | 6d15a2a fix: 認証エラー文を確認手順の順に割る（保存注意文と同梱） |
| 2026-10-06-13-fix-save-notice-split.md | 6d15a2a fix: 保存注意文を成否と次の一手に割る（認証エラー文と同梱） |
| 2026-10-06-14-feat-readme-reading-guide.md | ff3ff28 docs: README冒頭に利用者向けと開発者向けの読み分けを足す |
| 2026-10-06-15-feat-rename-feedback.md | 05a483c feat: 報告欄のFB表記を開発に報告するに改める |
| 2026-10-06-16-feat-glossary.md | 020d902 feat: ガイド群の前提語彙を集めた用語集を新設する |
| 2026-10-06-17-fix-content-error-visibility.md | 8606512 fix: 分類失敗の理由を運び表示を分類する |
| 2026-10-06-18-fix-storage-uuid-fallback.md | 39bd2f8 fix: ID生成にrandomUUID不可時のフォールバックを足す |
| 2026-10-06-19-refactor-options-select-builders.md | 2276546 refactor: select生成3兄弟を単一helperに集約する |
| 2026-10-06-21-refactor-classify-dispatch-table.md | bd3ea50 refactor: classifyFieldを優先順序付きdispatch表にする |
| 2026-10-06-20-refactor-content-run-extraction.md | f418ed0 refactor: run()の純粋部品をcontent-runに抽出する |
| 2026-10-06-22-refactor-options-card-builders.md | 8e0afaf refactor: カード生成の外枠を共通helperに抽出する |
| 2026-10-07-01-fix-http-rejection-mapping.md | 01d051a fix: 拒否ステータス判定をisRejectedStatusに集約する |
| 2026-10-07-02-fix-feedback-fb-wording.md | 13520f5 fix: 報告Issue雛形のFB残存を開発に報告するに揃える |
| 2026-10-07-03-refactor-meta-clip-policy.md | 6882e63 refactor: 切り詰め幅80をMETA_CLIP_LENGTHに集約する |
| 2026-10-07-04-refactor-options-ai-section.md | 78423d7 refactor: mountAiSectionを状態明示の責務関数群に分ける |
| 2026-10-07-05-fix-analyze-reason-union.md | 85e2fdc fix: 分析失敗理由をseam共有のunion語彙にする |
| 2026-10-07-06-docs-classify-caps-contract.md | 871efb2 docs: 送信上限30・20・60の契約をコメントに残す |
| 2026-10-07-07-refactor-nav-hash-helper.md | 0b8d1fc refactor: hash読みをreadPageFromHashに集約する |
| 2026-10-06-00-backlog-holistic-improvement.md | ab3f856 fix: content-runをentrypoints走査外のsrc直下に移す（子PBI 17-22 全件完了でラウンド完結） |
| 2026-10-06-00-backlog-japanese-polish.md | d29c9f9 chore(pbi): 完了PBI 16をアーカイブし台帳を更新する（子PBI 10-16 全件完了でラウンド完結） |
