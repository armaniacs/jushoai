# PBI 台帳インデックス

## 進行中からアーカイブ済み（archラウンド3・2026-10-30に12件実装・検証済み。コードレビューはユーザー作業）

- `archived/2026-10-29-00-backlog-arch-round3.md`（アーキテクチャレビュー12候補のPBI化・RICE順位確定。ラウンド完結）
- `archived/2026-10-29-169-refactor-e2e-scenario-unification.md`（順位 1。46496a5）
- `archived/2026-10-29-170-refactor-guide-controller.md`（順位 2。dabc591）
- `archived/2026-10-29-171-refactor-save-side-deepen.md`（順位 3。615943f）
- `archived/2026-10-29-172-refactor-guide-validator.md`（順位 4。d7c46c6）
- `archived/2026-10-29-173-refactor-import-target-select.md`（順位 5。5d61040）
- `archived/2026-10-29-174-refactor-classify-pipeline.md`（順位 6。34c8378）
- `archived/2026-10-29-175-refactor-classify-transport.md`（順位 7。deadb5d）
- `archived/2026-10-29-176-refactor-notice-center.md`（順位 8。2c6562b）
- `archived/2026-10-29-177-refactor-shared-fetch-seam.md`（順位 9。bd0b4b8）
- `archived/2026-10-29-178-refactor-fill-flow.md`（順位 10。4b2bc30）
- `archived/2026-10-29-179-refactor-classify-once.md`（順位 11。d53901e）
- `archived/2026-10-29-180-refactor-video-lib-unify.md`（順位 12。12ebbe3）

## 進行中からアーカイブ済み（2026-10-27・autonomous-task-closerで実装・検証済み・`make check` green）

- `archived/2026-10-27-161-fix-float-button-placement.md`（順位 1。重ねない配置。0ed109c）
- `archived/2026-10-27-162-fix-float-button-translucency.md`（順位 2。背景だけ半透明。256d455）
- `archived/2026-10-27-163-feat-float-button-drag.md`（順位 3。手動ドラッグ移動。ef14cdb）

最終検証: `make check` exit 0（155 files / 1979 passed + 1 expected fail）＋実ブラウザ E2E 13/13 green（tests/e2e/chrome.e2e.ts、配置・ドラッグ・タッチ経路・半透明を含む）。コードレビュー完了（checking-team 2026-10-27・9レビュアー、指摘 High 1/Medium 11 はすべて修正済み・Low は記録のみ）。実機タッチの手触り確認のみユーザー作業（タッチ経路自体は E2E で実測）。

## 進行中（1021-1022ラウンド・残2件）

（115〜117・119〜128・130 はレビュー確認を経てアーカイブ済み。118 は対象URL確定がユーザー作業、129 は着手条件未到来で backlog 残置）

- `2026-10-21-118-feat-birthday-single-input.md`（093eb73 feat(profile): 生年月日1欄型と会社項目。対象URLの確定はユーザー作業）
- `2026-10-22-129-feat-dynamic-form-support.md`（実装なし。後描画追従は既存実装で担保、残る差分は残置判断を記録）

## 進行中（対象 URL 対応・実装済み）

- `2026-10-26-160-feat-company-name-kana.md`（fair.j-lis.go.jp の会社名フリガナ欄に専用カテゴリ companyNameKana で対応、実装済み・PR #16 でmainにマージ）

## 進行中（archラウンド2・実装済み）

- `2026-10-24-00-backlog-arch-round2.md`（アーキテクチャレビュー10候補のPBI化・RICE順位確定、実装済み・コードレビューのみ残）
- `2026-10-24-150-refactor-pipeline-kana.md`（順位 1。実装済み（`d0d0c9d`）・fill-one/import-draft を classifyRulePipeline 入口に統一）
- `2026-10-24-151-refactor-options-notice.md`（順位 2。実装済み（`fa248d3`）・saved/errors通知をnotice moduleに統一）
- `2026-10-24-152-refactor-banner-kind.md`（順位 3。実装済み（`0cb8969`）・banner挙動区分を型で渡す）
- `2026-10-24-153-refactor-store-module.md`（順位 4。実装済み（`77c6006`）・store層をkv-store 1 moduleに寄せ型付きエラー導入）
- `2026-10-24-154-refactor-egress-pending-split.md`（順位 5。実装済み（`6cb8ce0`）・pending分割をsplitPending 1所有に寄せる）
- `2026-10-24-155-refactor-confirm-dialog.md`（順位 6。実装済み（`342e34b`）・モーダルPromise化をconfirmDialogに統一）
- `2026-10-24-156-refactor-tab-dispatch.md`（順位 7。実装済み（`9a451f2`）・tabメッセージのguarded dispatcher）
- `2026-10-24-157-refactor-preview-row-seam.md`（順位 8。実装済み（`d4bba0d`）・preview行描画に内部seam）
- `2026-10-24-158-backlog-field-catalog.md`（順位 9。実装済み（`3118e68`）・フィールド語彙をcatalogに集約）
- `2026-10-24-159-backlog-flow-state-batch.md`（順位 10。実装済み（`343f7f4`）・学習状態の読み出し束をflow-state loaderに寄せる）

最終検証: `make check` exit 0（152 files / 1890 passed + 1 expected fail）

## 進行中（大局レビューラウンド・実装済み・コードレビューのみ残）

- `2026-10-19-00-backlog-holistic-round.md`（大局レビュー4テーマのPBI化・RICE順位確定、4件とも子PBI 61-64 として実装済み）
- `2026-10-19-61-chore-result-label-helper.md`（順位 1、実装済み・`make check` green、8ee8c19で統合済み。Quick Win）
- `2026-10-19-62-refactor-status-text-table.md`（順位 2、実装済み・`make check` green、8ee8c19で統合済み）
- `2026-10-19-63-refactor-public-url-brand.md`（順位 3、実装済み・`make check` green、8ee8c19で統合済み）
- `2026-10-19-64-refactor-preview-binding.md`（順位 4、実装済み・E2E Chrome 7/7 green、8ee8c19で統合済み）

## 進行中（PBI-55レビューラウンド・実装済み・コードレビューのみ残）

- `2026-10-19-00-backlog-pbi55-round.md`（PBI-55レビュー指摘5件のPBI化・RICE順位確定・5件実装、`make check` green・E2E Chrome 7/7 green、0c1d9c4で統合済み）
- `2026-10-19-56-fix-result-focus.md`（順位 1、実装済み・`make check` green、0c1d9c4で統合済み）
- `2026-10-19-57-chore-readonly-byresult.md`（順位 2、実装済み・`make check` green、0c1d9c4で統合済み。58と同ファイルで直列57→58）
- `2026-10-19-58-refactor-result-labels.md`（順位 3、実装済み・`make check` green、0c1d9c4で統合済み。preview系3件は直列56→58→59）
- `2026-10-19-59-chore-setrows-guard.md`（順位 4、実装済み・`make check` green、0c1d9c4で統合済み）
- `2026-10-19-60-test-report-clickthrough.md`（順位 5、実装済み・E2E Chrome 7/7 green、0c1d9c4で統合済み。スタブ不可のため実タブURLで結線確認）

## 進行中（PBI-55・部分適用レポート・実装済み・コードレビューのみ残）

- `2026-10-19-55-feat-partial-report.md`（順位 1、実装済み・`make check` green・E2E Chrome 7/7 green、0c1d9c4で統合済み。PBI-82の開発者ストーリーの直接の続き）

## 進行中（1018cレビューラウンド・実装済み・コードレビュー完了）

- `2026-10-19-00-backlog-review-round.md`（1018cコードレビュー指摘7件のPBI化・RICE順位確定・7件実装、`make check` green、b78a791で統合済み）
- `2026-10-19-48-refactor-seam-classify-contract.md`（順位 1、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み）
- `2026-10-19-49-refactor-capped-arity.md`（順位 2、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。48と同ファイルで直列48→49）
- `2026-10-19-50-refactor-pipeline-single-source.md`（順位 3、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み）
- `2026-10-19-51-chore-deprecate-wire-aliases.md`（順位 4、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。54と同ファイルで直列51→54）
- `2026-10-19-52-docs-excluded-reason-ac.md`（順位 5、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。PBI-45にAC追記）
- `2026-10-19-53-chore-transfer-contract-note.md`（順位 6、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み）
- `2026-10-19-54-refactor-ai-classify-builder.md`（順位 7、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。51の後に実施）

## 進行中（archラウンド・実装済み・コードレビュー完了）

- `2026-10-18-00-backlog-arch-round.md`（アーキテクチャレビュー7候補のPBI化・RICE順位確定・6件実装＋1件対応不要の判断記録、`make check` green、b78a791で統合済み）
- `2026-10-18-41-refactor-radio-policy-owner.md`（順位 1、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み）
- `2026-10-18-42-refactor-attempt-seam.md`（順位 2、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。run側移設は45に吸収済み）
- `2026-10-18-43-refactor-transfer-contract.md`（順位 3、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み）
- `2026-10-18-44-refactor-pipeline-entry.md`（順位 4、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み）
- `2026-10-18-45-refactor-session-apply.md`（順位 5、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。42の残件吸収済み）
- `2026-10-18-46-refactor-wire-codec.md`（順位 6、実装済み・コードレビュー完了・`make check` green、b78a791で統合済み。gatewayの3送信をbuilder化、ai-classifyは型契約整理が先のため注記残し）
- `2026-10-18-47-backlog-failure-table-keep.md`（順位 7、対応不要の判断記録・実装なし、コードレビュー完了）

## 進行中（1018bラウンド・実装済み・コードレビュー完了）

（2026-10-19にPR #8差分の再レビューでApprove、Criticalなし。レビュー箱チェック済み）

- `2026-10-18-21-refactor-scan-prefilter.md`（順位 21、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-22-chore-make-check-once.md`（順位 22、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-23-fix-storage-save-guard.md`（順位 23、実装済み・`make check` green、855040dで統合済み。35・29と同storage.tsのため直列23→35→29。onSave失敗表示の1行配線も本体で補完済み）
- `2026-10-18-24-fix-addurl-timeout.md`（順位 24、実装済み・`make check` green、855040dで統合済み。36と同スクリプトのため直列24→36）
- `2026-10-18-25-feat-truncation-signal.md`（順位 25、実装済み・`make check` green、855040dで統合済み。33と同ファイルのため直列25→33）
- `2026-10-18-26-feat-busy-announce.md`（順位 26、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-27-chore-rule-audit-trace.md`（順位 27、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-28-refactor-ownlegend-helper.md`（順位 28、実装済み・`make check` green、855040dで統合済み。40と同ファイルのため直列28→40）
- `2026-10-18-29-chore-coerce-warn.md`（順位 29、実装済み・`make check` green、855040dで統合済み。直列23→35→29の末尾）
- `2026-10-18-30-chore-bind-direct.md`（順位 30、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-31-refactor-content-split.md`（順位 31、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-32-feat-firefox-builtin-notice.md`（順位 32、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-33-feat-chunk-abort.md`（順位 33、実装済み・`make check` green、855040dで統合済み。25の後）
- `2026-10-18-34-docs-message-versioning.md`（順位 34、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-35-fix-migrate-id.md`（順位 35、実装済み・`make check` green、855040dで統合済み。直列23→35→29の中間）
- `2026-10-18-36-chore-addurl-check.md`（順位 36、実装済み・`make check` green、855040dで統合済み。24の後）
- `2026-10-18-37-chore-base64-chunk.md`（順位 37、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-38-docs-i18n-policy.md`（順位 38、実装済み・site check green、855040dで統合済み。方針決定済み：日本語専用と明記。README.en.mdにも1行補完）
- `2026-10-18-39-refactor-options-dom-unify.md`（順位 39、実装済み・`make check` green、855040dで統合済み）
- `2026-10-18-40-chore-nonnull-assertions.md`（順位 40、実装済み・`make check` green、855040dで統合済み。28の後。範囲外の残存2件も本体で除去済み）

## 進行中（1018aラウンド・実装済み・コードレビュー完了）

（1018aはPR #7でmainにマージ・v0.1.19リリース済み。本セッションの/code-reviewでApprove、Suggestions対応済み。2026-10-19にPR #7差分の再レビューでApprove、Criticalなし。レビュー箱チェック済み）

- `2026-10-18-00-backlog-1018a-round.md`（checking-team全21観点の指摘をPBI化・RICE順位確定・20件を個別PBI化・20件とも実装済み、`make check` green、7eeb481で統合済み）
- `2026-10-18-01-fix-preview-select-label.md`（順位 1、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-02-fix-button-istrusted.md`（順位 2、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-03-fix-analyze-lowconf-keep.md`（順位 3、実装済み・`make check` green、7eeb481で統合済み。05の前提）
- `2026-10-18-04-fix-audit-pageurl-min.md`（順位 4、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-05-fix-radio-llm-filter.md`（順位 5、実装済み・`make check` green、7eeb481で統合済み。03の後）
- `2026-10-18-06-docs-consent-gate.md`（順位 6、実装済み・site check green、7eeb481で統合済み）
- `2026-10-18-07-refactor-nfkc-once.md`（順位 7、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-08-fix-banner-persist.md`（順位 8、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-09-fix-split-dup-inject.md`（順位 9、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-10-feat-plan-no-value-warn.md`（順位 10、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-11-refactor-fieldmeta-novalue.md`（順位 11、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-12-fix-address-block-scope.md`（順位 12、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-13-fix-offline-early-return.md`（順位 13、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-14-fix-keystore-transient.md`（順位 14、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-15-fix-dialog-focus-trap.md`（順位 15、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-16-fix-popup-heading.md`（順位 16、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-17-fix-feedback-host-exposure.md`（順位 17、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-18-fix-permission-origin-rollback.md`（順位 18、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-19-refactor-failure-text-single.md`（順位 19、実装済み・`make check` green、7eeb481で統合済み）
- `2026-10-18-20-fix-gender-regex-boundary.md`（順位 20、実装済み・`make check` green、7eeb481で統合済み）

## 進行中（実装済み・コードレビュー完了／E2E確認・レビュアー確認・意図的backlogを除く）

（2026-10-19に10-16期差分の再レビューでApprove、Criticalなし。82のE2E箱・85/88のレビュアー確認箱・92の意図的backlog箱は人間の作業のため残す）

- `2026-10-16-01-backlog-adversarial-round.md`（adversarialレビュー第7ラウンド残件9件のPBI化・RICE順位確定・9件とも実装済み、`make check` green）
- `2026-10-16-94-fix-fill-banner-false-positive.md`（順位 1、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-95-fix-panel-dialog-labelling.md`（順位 2、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-96-fix-kana-nearby-misattribution.md`（順位 3、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-97-fix-fill-robustness.md`（順位 4、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-98-fix-panel-focus-lifecycle.md`（順位 5、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-99-fix-apply-persist-skew.md`（順位 6、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-100-fix-settings-save-robustness.md`（順位 7、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-101-fix-provider-resilience.md`（順位 8、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-102-sec-egress-toctou.md`（順位 9・セキュリティ旗、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-02-backlog-architecture-round.md`（アーキテクチャレビュー8候補のPBI化・RICE順位確定・8件とも実装済み、`make check` green）
- `2026-10-16-103-refactor-outcome-module.md`（順位 1、実装済み・`make check` green、679de0fで統合済み。107の前提）
- `2026-10-16-104-refactor-kana-vocabulary.md`（順位 2、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-105-fix-pattern-clip.md`（順位 3、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-106-refactor-panel-args.md`（順位 4、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-107-refactor-display-decision.md`（順位 5、実装済み・`make check` green、679de0fで統合済み。103の後）
- `2026-10-16-108-refactor-auth-block.md`（順位 6、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-109-refactor-splitby-table.md`（順位 7、実装済み・`make check` green、679de0fで統合済み）
- `2026-10-16-110-refactor-save-pipeline.md`（順位 8、実装済み・`make check` green、679de0fで統合済み）

- `2026-10-16-00-backlog-review6-round.md`（レビューレポート第6ラウンド残件12件のPBI化・RICE順位確定）
- `2026-10-16-82-feat-fill-outcome-visibility.md`（順位 1、E2E実ブラウザ7/7 green・統合/単体greenを2026-10-19に実行記録。BDD箱はPBI-55の結果ビューとして実ブラウザ確認済み・チェック済み、0e88a0aで統合済み）
- `2026-10-16-83-feat-badge-aria-live.md`（順位 2、679de0fで統合済み）
- `2026-10-16-84-refactor-kana-memoize.md`（順位 3、679de0fで統合済み）
- `2026-10-16-85-chore-literals-ownership-note.md`（順位 4、レビュアー確認済み・679de0fで統合済み。所有コメント現存＋parity 6件緑を2026-10-19に実測）
- `2026-10-16-88-refactor-fill-last-categories.md`（順位 7、レビュー指摘の解消確認済み・679de0fで統合済み。FILL_LAST_CATEGORIES一本化・LAST_CATEGORIES残存ゼロを2026-10-19に実測）
- `2026-10-16-89-feat-test-cooldown.md`（順位 8、679de0fで統合済み）
- `2026-10-16-90-refactor-session-storage-decouple.md`（順位 9、679de0fで統合済み）
- `2026-10-16-91-refactor-resolve-kana-return.md`（順位 10、679de0fで統合済み）
- `2026-10-16-92-backlog-storage-pick-hardening.md`（順位 11、記録内容8箱を2026-10-19に検証済み・チェック済み。着手条件（非string型追加）未到来のためbacklogとして残置）

## 進行中からアーカイブ済み（2026-10-16・autonomous-task-closerで実装・検証済み・`make check` green）

- `2026-10-16-86-refactor-item-type-move.md`（順位 5）
- `2026-10-16-87-fix-prompt-trace-clip.md`（順位 6）
- `2026-10-16-93-refactor-splitby-wrappers.md`（順位 12）

## 台帳

- `archived/2026-10-27-00-backlog-float-button-round.md`（アーカイブ済み）
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
| 2026-10-13-56-backlog-review5-suggestions-round.md | ラウンド完結（順位 1〜9 をアーカイブ済み。`make check` 相当 green：typecheck・単体 1168 件・両ブラウザ build・manifest 検査・lint。実ブラウザ E2E は実行コンテキストの制約で未実行、通常ターミナルでの確認はユーザー作業） |
| 2026-10-14-70-backlog-holistic-round.md | ラウンド完結（順位 1〜5 をアーカイブ済み。`make check` green：typecheck・単体 1194 件・両ブラウザ build・manifest 検査・lint。実ブラウザ E2E（Chrome・Firefox）はユーザー実行で緑を確認（2026-10-15）） |
| 2026-10-14-75-backlog-type-round.md | ラウンド完結（順位 1〜4 をアーカイブ済み。`make check` green：typecheck・単体 1199 件・両ブラウザ build・manifest 検査・lint。実ブラウザ E2E（Chrome・Firefox）はユーザー実行で緑を確認（2026-10-15）） |
| 2026-10-15-81-backlog-arch-round2.md | ラウンド完結（順位 1〜5 をアーカイブ済み。`make check` green：typecheck・単体 1227 件・両ブラウザ build・manifest 検査・lint。実ブラウザ E2E（Chrome・Firefox）はユーザー実行で緑を確認（2026-10-15）） |
| 2026-10-13-57-feat-chrome-store-auto-submit.md | 実装コミット 3fdd6c9・64daa20・9a701e0、文書 docs/store-submit.md・docs/release.md。dry-run疎通・コードレビューはユーザー実施済み扱いで完結（2026-10-16確認） |
| 2026-10-13-58-feat-edge-firefox-store-auto-submit.md | 実装コミット 3fdd6c9（57と同梱）。同上条件で完結（2026-10-16確認） |
| 2026-10-15-76-refactor-geometry-visibility.md | 6b58900 refactor: 可視性・計測可能性の判定を geometry に集約（コードレビューはユーザー作業） |
| 2026-10-15-77-refactor-option-matcher.md | 118fa5f refactor: 選択肢解決を matchOption 単一入口に集約（コードレビューはユーザー作業） |
| 2026-10-15-78-refactor-fill-module.md | aa9e5b0 refactor: 注入の順序・guard・振分けを fillPlan に集約（コードレビューはユーザー作業） |
| 2026-10-15-79-refactor-panel-lifecycle.md | 7286da5 refactor: パネル lifecycle を mountPanel に集約（コードレビューはユーザー作業） |
| 2026-10-15-80-refactor-ai-readiness.md | 677d98f refactor: buildGuide に網羅性ガード（スコープ縮小。コードレビューはユーザー作業） |
| 2026-10-14-71-refactor-includes-literal.md | 9e52ede refactor: 定数配列の includes 判定を includesLiteral に集約（コードレビューはユーザー作業） |
| 2026-10-14-72-fix-storage-load-guard.md | 3bf2735 fix: storage 読込境界で誤型欄を既定値に落とす（コードレビューはユーザー作業） |
| 2026-10-14-73-refactor-request-exhaustiveness.md | f501f12 refactor: AiRequest switch に網羅性ガード（コードレビューはユーザー作業） |
| 2026-10-14-74-chore-type-premise-comments.md | 816d52c chore: 型前提の根拠コメント2件（コードレビューはユーザー作業） |
| 2026-10-14-65-refactor-failure-mapping.md | 5864f29 refactor: 失敗対応マッピングを mapFailure に一本化（コードレビューはユーザー作業） |
| 2026-10-14-66-refactor-split-groups.md | c40080a refactor: 分割グルーピングを単一骨格に統合（コードレビューはユーザー作業） |
| 2026-10-14-67-refactor-gateway-attempt.md | 8b61670 refactor: gateway 失敗理由を attempt 返り値に載せ替え（コードレビューはユーザー作業） |
| 2026-10-14-68-refactor-gateway-call.md | 9d49761 refactor: gateway 呼び出し定型を callBackground に一本化（コードレビューはユーザー作業） |
| 2026-10-14-69-refactor-options-render.md | 8d916b9 refactor: 設定画面の描画分割と上限集約（コードレビューはユーザー作業） |
| 2026-10-14-64-backlog-arch-review-round.md | ラウンド完結（順位 1〜5 をアーカイブ済み。`make check` green：typecheck・単体 1191 件・両ブラウザ build・manifest 検査・lint。実ブラウザ E2E（Chrome・Firefox）はユーザー実行で緑を確認（2026-10-15）） |
| 2026-10-14-59-refactor-kana-module.md | bfda8b9 refactor: かな判定を core/kana に集約（コードレビューはユーザー作業） |
| 2026-10-14-60-refactor-fill-session.md | e9ffbf5 refactor: Fill Session 集約＋content mounter 化（コードレビュー・実機 E2E はユーザー作業） |
| 2026-10-14-61-refactor-provider-registry.md | 5601552 refactor: Provider Registry 集約（コードレビューはユーザー作業） |
| 2026-10-14-62-refactor-classifier-trace.md | 28402ba refactor: trace 返り値化（コードレビューはユーザー作業） |
| 2026-10-14-63-refactor-settings-save.md | 8d19475 refactor: settings-save 集約（コードレビューはユーザー作業） |
| 2026-10-13-47-fix-anchor-rect-sharing.md | c124902 fix: アンカー選択の矩形読みを isHidden と共有（rect 注入＋共有。コードレビューはユーザー作業） |
| 2026-10-13-48-fix-chrome-flags-empty-env.md | 0b33737 fix: chrome-flags の空文字判定を厳格化（truthy／厳密比較。コードレビューはユーザー作業） |
| 2026-10-13-49-chore-chrome-flags-env-explicit.md | 0b33737 chore: 既定 process.env を廃止して呼び出し側で明示（同上コミット。コードレビューはユーザー作業） |
| 2026-10-13-50-chore-anchor-real-browser-test.md | c124902 chore: 実ブラウザ相当テスト追加＋under jsdom 改名（同上コミット。コードレビューはユーザー作業） |
| 2026-10-13-51-chore-chrome-flags-order-assertion.md | 0b33737 chore: 複合 env の断言を順序非依存の集合検査に緩和（同上コミット。コードレビューはユーザー作業） |
| 2026-10-13-52-fix-audit-empty-accounting.md | 4e18cd3 fix: 空配列会計の誤差を方向Bで明示（コメントのみ。コードレビューはユーザー作業） |
| 2026-10-13-53-chore-audit-sizecache-premise.md | 4e18cd3 chore: sizeCache 変異前提を 1 行で文書化（同上コミット。コードレビューはユーザー作業） |
| 2026-10-13-54-chore-host-position-guard.md | 02564fb chore: host 配置を必須引数化（型で検出。コードレビューはユーザー作業） |
| 2026-10-13-55-chore-overlay-comment-dedup.md | 02564fb chore: overlay 重複コメントを 1 行参照化（同上コミット。コードレビューはユーザー作業） |
|---|---|
| 2026-10-12-45-backlog-review4-suggestions-round.md | ラウンド完結（順位 1〜5 をアーカイブ済み。`make check` green、Chrome E2E 5/5。Firefox E2E は実行コンテキストの制約で未実行、通常ターミナルでの確認はユーザー作業） |
| 2026-10-12-40-fix-e2e-chrome-sandbox-flag.md | 2a35d9a fix: E2E の Chrome 起動フラグを CI に限定する（chrome-flags 純粋関数化＋単体 6 件。Chrome E2E 5/5 は `E2E_NO_SANDBOX=1`。既定の sandbox 有効起動は実行コンテキストの制約で未実証。コードレビューと通常ターミナルでの既定実行確認はユーザー作業） |
| 2026-10-12-41-chore-host-position-default.md | bc2a1d6 chore: host のデッドな position 既定を削除する（host.test を実態に合わせ更新。コードレビューはユーザー作業） |
| 2026-10-12-42-chore-overlay-left-auto-note.md | 63be9b9 chore: overlay の left auto 依存をコメントに残す（コメントのみ。コードレビューはユーザー作業） |
| 2026-10-12-43-fix-audit-separator-accounting.md | 54af782 fix: 監査ログの予算計上から区切り文字の分を引く（batchBytes 一元化＋境界テスト 3 件。コードレビューはユーザー作業） |
| 2026-10-12-44-chore-anchor-rect-single-read.md | 049968d chore: アンカー選択の矩形読み取りを1回にまとめる（rect メモ化＋カウントテスト。コードレビューはユーザー作業） |
| 2026-10-11-21-backlog-release-assertion-parser.md | 将来候補としての記録で完結（受け入れ基準・DoD 全項目済み。着手条件はアーカイブ済みファイルに記録のまま。実装なし。`make check` green） |
| 2026-10-11-31-backlog-edge-e2e.md | 将来候補としての記録で完結（同上。着手までは Chrome・Firefox の E2E で代用） |
| 2026-10-12-46-feat-exclude-urls-from-startup.md | 6e0c689 feat: 起動しないURLを設定画面から登録できるようにする（PR #5 → ac9485b、`make check` green、Chrome E2E 5/5、Firefox E2E 5/5。0.1.16 としてリリース済み） |
| 2026-10-12-39-fix-reposition-inner-scroll-and-gate-host.md | 7f49af3 fix: ボタンの追従を内部スクロールにも広げ、同意ゲートのhost解決を厳格にする（PR #4 → 1341725、0.1.15 としてリリース済み） |
| 2026-10-11-38-fix-button-anchor-placement.md | 0889bce fix: 入力ボタンの配置をビューポート基準にし、左下に張り付く問題を直す（Chrome / Firefox の E2E と実ブラウザでの座標実測で確認。0.1.14 としてリリース済み。コードレビューはユーザー作業） |
| 2026-10-11-37-backlog-review3-suggestions-round.md | ラウンド完結（順位 1〜4 をアーカイブ済み。db260fdで統合済み、`make check` green） |
| 2026-10-11-33-fix-pageurl-cap-wiring-test.md | db260fdで統合済み fix: 入口制限の統合テスト。`make check` green |
| 2026-10-11-34-chore-pageurl-truncation-note.md | db260fdで統合済み chore: 切詰受容の記録。`make check` green |
| 2026-10-11-35-chore-test-describe-layout.md | db260fdで統合済み chore: describe 分離。`make check` green |
| 2026-10-11-36-chore-import-merge.md | db260fdで統合済み chore: import 結合。`make check` green |
| 2026-10-11-32-fix-audit-pageurl-cap.md | db260fdで統合済み fix: 監査入口で pageUrl を UTF-8 1024 バイトに制限（文字境界・共有 sanitizer 不変）。`make check` green |
| 2026-10-11-30-feat-chrome-e2e.md | 0bb6767で統合済み feat: Chrome 実ブラウザ E2E（BiDi 導入・ID 解決・3 ケース）。Chrome 実機 3/3 green、`make check` green |
| 2026-10-11-29-fix-hit-test-own-shadow-node.md | 0bb6767で統合済み fix: ゲートがパネル host を掴むよう修正＋ヒット判定の内側ノード受容。単体・E2E・`make check` green |
| 2026-10-11-23-backlog-review-suggestions-round.md | ラウンド完結（順位 1〜6・8 をアーカイブ済み、順位 7 は将来候補。3ed2c3bで統合済み、`make check` / `make site` green） |
| 2026-10-11-28-backlog-review2-suggestions-round.md | ラウンド完結（順位 1〜4 をアーカイブ済み。0bb6767で統合済み、`make check` green） |
| 2026-10-11-24-fix-consent-point-throw-guard.md | 3ed2c3bで統合済み（レビュー第2ラウンド順位 1）fix: ボタン点取得の例外安全化。`make check` green |
| 2026-10-11-25-chore-test-spy-restore.md | 3ed2c3bで統合済み（同順位 2）chore: スパイ復元の try/finally 化。`make check` green |
| 2026-10-11-26-chore-apply-point-null-removal.md | 3ed2c3bで統合済み（同順位 3）chore: ApplyPoint の null 除去。`make check` green |
| 2026-10-11-27-fix-consent-real-dom-coverage.md | 3ed2c3bで統合済み（同順位 4）fix: 同意検証の DOM 問合せ注入化。`make check` green |
| 2026-10-11-15-fix-apply-point-reason.md | 3ed2c3bで統合済み（レビュー対応ラウンド順位 1）fix: ゼロ矩形と画面外の理由分離。`make check` green |
| 2026-10-11-16-fix-opacity-compare.md | 3ed2c3bで統合済み（同順位 2）fix: opacity フォールバックの数値化。`make check` green |
| 2026-10-11-17-fix-consent-button-point.md | 3ed2c3bで統合済み（同順位 3）fix: 検証点を承認ボタン矩形に厳密化。`make check` green |
| 2026-10-11-18-fix-audit-budget-overhead.md | 3ed2c3bで統合済み（同順位 4）fix: 配列構造分を予算計上に加算。`make check` green |
| 2026-10-11-19-chore-audit-remeasure-bound.md | 3ed2c3bで統合済み（同順位 5）chore: 再計測上限の記録と回数テスト。`make check` green |
| 2026-10-11-20-chore-doh-budget-accepted.md | 3ed2c3bで統合済み（同順位 6）chore: 解決回数上限の記録。`make check` green |
| 2026-10-11-22-chore-test-reason-assertion.md | 3ed2c3bで統合済み（同順位 8）chore: テスト断言の整理。`make check` green |
| 2026-10-11-03-backlog-egress-gate-round.md | ラウンド完結（子 PBI 04・05 をアーカイブ済み。3ed2c3bで統合済み、`make check` green。再監査での確認はユーザー作業） |
| 2026-10-11-04-fix-egress-resolver-origin-and-fail-closed.md | b709b35 fix: リゾルバ origin を許可要求に含め、解決不能時は fail-closed に倒す（コードレビューはユーザー作業） |
| 2026-10-11-05-feat-declaration-request-use-check.md | e8754c5 feat: 宣言・要求・使用の一致検査を make check に入れ、egress の方針を定数の単一ソースにする（コードレビューはユーザー作業） |
| 2026-10-11-06-backlog-run2-remediation-round.md | ラウンド完結（子 PBI 07〜14 をアーカイブ済み。3ed2c3bで統合済み、`make check` / `make site` green。実機確認・再監査はユーザー作業） |
| 2026-10-11-07-fix-consent-ui-isolation.md | 3ed2c3bで統合済み（タスククローザの並列実装）fix: 同意 UI の important 化と適用直前検証。`make check` green。実機確認・レビューはユーザー作業 |
| 2026-10-11-08-fix-audit-entry-bytes.md | 3ed2c3bで統合済み（同上）fix: 監査ログの計上を記録全体に拡大。(b) 不採。`make check` green。レビュー・(b) の起票判断はユーザー作業 |
| 2026-10-11-09-fix-egress-verdict-cache-ttl.md | 3ed2c3bで統合済み（同上）fix: egress 検証を per-call 化しキャッシュを廃止。`make check` green。レビューはユーザー作業 |
| 2026-10-11-10-backlog-resolve-and-pin.md | 判断 (c) 受容を記録（API リファレンス根拠つき）。実装なし。レビューはユーザー作業 |
| 2026-10-11-11-docs-host-permission-port-granularity.md | 3ed2c3bで統合済み（同上）docs: 許可のホスト単位と送信先限定の記録。`make site` / `make check` green。レビューはユーザー作業 |
| 2026-10-11-12-fix-gemini-egress-consistency.md | 3ed2c3bで統合済み（同上）docs: Gemini の egress 不通過を受容として 1 か所に記録。`make check` green。レビューはユーザー作業 |
| 2026-10-11-13-feat-release-pipeline-hardening.md | 3ed2c3bで統合済み（同上）feat: リリース workflow の最小権限化と承認経路。`v*` ruleset と environment `release` の承認ゲートは作成・実証済み。タグ署名は 2026-10-12 の方針変更で必須を外した。残りはレビュー |
| 2026-10-11-14-chore-stale-source-comments.md | 3ed2c3bで統合済み（同上）chore: コメント 2 か所の是正（host.ts は 07 に吸収、audit-log.ts のみ）。`make check` green。レビューはユーザー作業 |
| 2026-10-11-00-backlog-pages-update.md | ラウンド完結（子 PBI 11-01・11-02 をアーカイブ済み。9038bedで統合済み、`make check` / `make site` green） |
| 2026-10-11-01-feat-store-announcement.md | 9038bedで統合済み（11a）feat: Pages と README に Chrome ウェブストアの導線を足す |
| 2026-10-11-02-feat-landing-video-embed.md | 9038bedで統合済み（11a）feat: ランディングに紹介動画の埋め込みセクションを足す |
| 2026-10-10-00-backlog-vulnhunt-remediation.md | ラウンド完結（子 PBI 10-10-01〜07 全件アーカイブ済み） |
| 2026-10-10-07-backlog-dev-toolchain-cves.md | 394fb25で統合済み（1009a）shell-quote を overrides 1.12.0 で解消、node-forge は修正版リリースなしで追跡継続。make check green |
| 2026-10-10-06-fix-audit-cross-context-race.md | 8d2d414で統合済み（1009a）fix: 監査ログの削除を単一コンテキストに集約する |
| 2026-10-10-05-fix-provider-response-bound.md | 0a5372bで統合済み（1009a）fix: プロバイダ応答の読み取りを有界化する |
| 2026-10-10-04-fix-egress-dns-validation.md | 0a5372bで統合済み（1009a）fix: Base URL の解決済みアドレスを保存時とダイヤル直前に検証する |
| 2026-10-10-03-fix-audit-byte-budget.md | 8d2d414で統合済み（1009a）fix: 監査ログのサイズ予算をバイト長で計上する |
| 2026-10-10-02-fix-autocomplete-proto-lookup.md | 7f8b973で統合済み（1009a）fix: autocomplete のルックアップをプロトタイプ継承の影響を受けない形にする |
| 2026-10-10-01-fix-scan-text-cap.md | 7f8b973で統合済み（1009a）fix: スキャン時の label・placeholder に長さ上限を付ける |
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
| 2026-10-06-00-backlog-settings-navigation.md | cb79d12で統合済み（1006a）設定ページの左メニュー化の台帳 |
| 2026-10-06-02-feat-options-sidebar.md | bd37063で統合済み（1006a）feat: 設定ページに左メニューを導入する |
| 2026-10-06-03-feat-options-report-link.md | bd37063で統合済み（1006a）feat: 左メニューの最下部に不具合報告を置く |
| 2026-10-06-00-backlog-action-popup.md | cb79d12で統合済み（1006a）ロゴ・確認ポップアップ・ギアの台帳 |
| 2026-10-06-04-feat-options-logo.md | bd37063で統合済み（1006a）feat: 設定画面の左上にロゴを置き Pages へリンクする |
| 2026-10-06-05-feat-action-popup.md | bd37063で統合済み（1006a）feat: ツールバークリックで確認ポップアップを開く |
| 2026-10-06-06-feat-popup-gear.md | bd37063で統合済み（1006a）feat: 確認ポップアップの右上にギアを置く |
| 2026-10-06-00-backlog-ai-audit-log.md | 844494fで統合済み（1006a）AI 通信の監査ログの台帳 |
| 2026-10-06-01-feat-ai-audit-log.md | 844494fで統合済み（1006a）feat: AI 呼び出しの監査ログを記録する |
| 2026-10-06-02-feat-audit-log-download.md | 844494fで統合済み（1006a）feat: 監査ログを TSV でダウンロードできるようにする |
| 2026-10-06-00-backlog-ai-analyze.md | 48f44b0で統合済み（タスククローザで実装、レビュー・実機確認はユーザー作業）AI で分析ボタン・改名・ドキュメントの台帳 |
| 2026-10-06-07-feat-rename-to-ai-analyze.md | 48f44b0で統合済み（同上）feat: プレビューの再分析ボタンを AI で分析に改名する |
| 2026-10-06-08-feat-popup-ai-analyze.md | 48f44b0で統合済み（同上）feat: 確認ポップアップに AI で分析ボタンを置く |
| 2026-10-06-09-feat-ai-analyze-docs.md | 48f44b0で統合済み（同上）feat: 改名とボタンに合わせてドキュメントを直す |
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
| 2026-10-27-00-backlog-float-button-round.md | 0ed109c feat: 入力ボタンの重なり報告3件（161〜163）をPBI化しRICE順位・深掘り判断を確定する（ラウンド完結） |
| 2026-10-27-161-fix-float-button-placement.md | 0ed109c feat: 入力ボタンの配置を入力欄と重ならない候補に変える（コードレビューはユーザー作業） |
| 2026-10-27-162-fix-float-button-translucency.md | 256d455 fix: 入力ボタンの背景を半透明にして下の入力を見えるようにする（コードレビューはユーザー作業） |
| 2026-10-27-163-feat-float-button-drag.md | ef14cdb feat: 入力ボタンをマウス・タッチ・キーボードで移動できるようにする（コードレビューはユーザー作業） |
| 2026-10-21-115-chore-ci-make-check.md | f54ed09 chore(ci): make checkのCIガードを追加 |
| 2026-10-21-116-refactor-nfkc-norm-clean.md | 3fc1067 refactor: norm/clean分離とダッシュ統一 |
| 2026-10-21-117-feat-profile-export-import.md | b441268 feat(transfer): プロファイルのexport/import |
| 2026-10-21-119-feat-company-department.md | 093eb73 feat(profile): 会社項目 |
| 2026-10-21-120-feat-width-enforcement.md | 208c1ac feat(fill): 幅強制と建物名略記 |
| 2026-10-21-121-feat-dash-unification.md | 3fc1067 refactor: norm/clean分離とダッシュ統一 |
| 2026-10-21-122-feat-building-abbreviate.md | 208c1ac feat(fill): 幅強制と建物名略記 |
| 2026-10-21-123-backlog-iframe-investigation.md | 5db41e0 docs: backlogとiframe調査 |
| 2026-10-22-124-feat-egress-preview-masking.md | 1b7fe95 feat(egress): 送信前メタデータのゲートとPII疑い警告 |
| 2026-10-22-125-feat-zip-address-assist.md | 9b79158 feat(zip): 郵便番号辞書による住所補助 |
| 2026-10-22-126-feat-field-coverage-expand.md | 7340bd1 カバレッジは先行PBIで実装済みの実装記録 |
| 2026-10-22-127-feat-onboarding-import.md | 857cd8f feat(onboarding): フォームからの下書き取り込み |
| 2026-10-22-128-feat-repeat-fill-memory.md | 4cf4a59 feat(fill): サイト別承認記憶による短縮プレビュー |
| 2026-10-22-130-backlog-local-learning-loop.md | 420ebff 学習ループはPBI-138で実装済みの実装記録 |
