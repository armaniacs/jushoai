# PBI 台帳インデックス

## 進行中

- arch深掘りラウンド（2026-10-07）: 05 → 06 → 07（逐次・統合側）
- `2026-10-07-05-fix-analyze-reason-union.md` — AnalyzeResponse reason の union 化
- `2026-10-07-06-docs-classify-caps-contract.md` — 送信上限 30/20/60 の契約コメント
- `2026-10-07-07-refactor-nav-hash-helper.md` — nav hash 読みの helper 抽出

台帳: `2026-10-07-00-backlog-arch-deepening-b.md`

台帳: `2026-10-07-00-backlog-holistic-improvement-b.md`

台帳: `2026-10-06-00-backlog-holistic-improvement.md`

台帳: `archived/2026-10-06-00-backlog-ai-audit-log.md`
台帳: `2026-10-04-00-backlog-architecture-deepening.md`
台帳: `archived/2026-10-06-00-backlog-settings-navigation.md`
台帳: `archived/2026-10-06-00-backlog-action-popup.md`
台帳: `archived/2026-10-06-00-backlog-ai-analyze.md`
台帳: `2026-10-06-00-backlog-japanese-polish.md`

## アーカイブ一覧

| PBI | 完了コミット |
|---|---|
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
