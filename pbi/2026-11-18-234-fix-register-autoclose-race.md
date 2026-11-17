# PBI: 登録処理中の自動クローズ競合の解消

## ユーザーストーリー
バナー X から「起動しないURLに登録する」を押した利用者として、登録の成否が必ず目で分かってほしい、なぜなら load/save の await 中に 15 秒タイマーが満了するとダイアログが teardown されて errorBox が detach され、保存に失敗していても「閉じただけ」に見えて登録できたと誤認するから

## 優先度
- 順位: 4 / 14
- RICEスコア: 54（Reach=3 / Impact=1 / Confidence=90% / Effort=0.05人週）
- 根拠: 同意操作の結果表示の喪失。site/assets/copy.js が明記して避けている「disabled によるフォーカス消失」パターンを拡張側が踏んでいる問題も同時に直る

## 出どころ
- checking-team 2026-11-18 ラウンド・Red Team Leader（Low）+ UI Expert（Low）の統合。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/ui/dismiss-dialog.ts:139-160（AUTO_HIDE_MS タイマーが busy 中も走る・setRegisterBusy で submit を disabled）、src/content/exclusion-register.ts:21-45

## BDD受け入れシナリオ
Scenario: busy 中は自動クローズしない
  Given クイック登録の submit を押して load/save が進行中である
  When  15 秒が経過し、かつホバー・フォーカスが外れている
  Then  ダイアログは閉じず、登録結果の表示（成功の閉じ or 失敗の role="alert"）が必ず起こる

Scenario: busy 中にフォーカスが落ちない
  Given submit が busy 状態である
  When  ユーザーが submit にフォーカスしたまま押す
  Then  submit は disabled 属性ではなく aria-disabled + クリック無視であり、フォーカスが body に落ちない

## 受け入れ基準
- [x] setRegisterBusy(true) の間は maybeAutoHide が自動クローズしない（busy 中のタイマー満了は teardown を起こさない）
- [x] busy 中の submit は disabled 属性を使わず aria-disabled="true" + クリック無視にする（copy.js と同一方針）
- [x] 登録フローの失敗時に role="alert" が表示され続けることを単体テストで固定する
- [x] `make check` が緑

## 実装手順
- maybeAutoHide（dismiss-dialog.ts）に busy 条件を足す
- setRegisterBusy を aria-disabled 方式に置き換える
- タイマー満了と busy の競合を固定するテストを tests/ui/ に追加（vitest の fake timers）

## テスト戦略
- tests/ui/dismiss-dialog.test.ts に fake timers で「busy 中にタイマー満了しても teardown しない」「busy 解除後に通常の自動クローズが再開する」を追加
- フォーカス保持は activeElement の断言で固定

## 見積もり
0.05人週（要チームでの見積もり）

## 実装記録
- 修正はすべて src/ui/dismiss-dialog.ts に集約した。src/content/exclusion-register.ts の登録フロー（setBusy(true) → load/add/save → 成功時 close → finally setBusy(false)）は変更不要で、busy の伝搬先のダイアログ側だけ直せば競合は解消される。
- busy 中の自動クローズ停止: `registerBusy` フラグを `engaged` と並んで追加し、タイマー満了時は `engaged || registerBusy` なら `autoHideExpired = true` にして teardown しない。`maybeAutoHide`（pointerleave/focusout 経由）にも `!registerBusy` 条件を足し、busy 中のホバー解除でも閉じないようにした。
- busy 解除後の再開: `setRegisterBusy(false)` で満了を吸収していた場合（タイマーが busy 中に発火していた場合）は `autoHideExpired` をリセットして full AUTO_HIDE_MS のタイマーを再武装する。即時 teardown にしないのは、失敗直後の role="alert" を読める時間を残すため。busy が元のタイマー満了前に終わった場合は元のタイマーがそのまま使われ、通常パスの寿命は変わらない。
- disabled 廃止: `setRegisterBusy` は `submitBtn.setAttribute('aria-disabled', ...)` に置き換え（disabled 属性は一切使わない）。クリック無視は 2 か所の submit click リスナーの先頭に `if (registerBusy) return;` を追加（src/ui/button.ts の isTrusted ゲートと同じ位置の方針）。aria-disabled は活性化を妨げないためのガード。
- TDD: tests/ui/dismiss-dialog.test.ts に fake timers で「busy 中に15秒経過しても閉じずエラー表示が消えない」「busy 解除後に通常の自動クローズが再開する」「busy が短く終わったときは元のタイマーどおり閉じる」を追加し、aria-disabled 化・クリック無視・フォーカス保持・フロー失敗後の alert 存続と再試行のテストも追加。RED を確認（aria-disabled・フォーカス・タイマー2本の4件が失敗）してから実装し GREEN。クリック無視とフロー alert の2本は jsdom が disabled クリックを既にブロックするため移行前から緑の固定テスト（移行しても挙動が保たれることの pin）。
- `make check` 緑（typecheck + 187 ファイル 3088 テスト + 両ブラウザ build + manifest 検査 + web-ext lint。lint warning 2 件は manifest min-version 由来の既存分）。
- PBI-237（ダイアログ a11y）が同じファイルを後で触るため、フォーカス管理・live region・Esc の追加は本 PBI では行っていない。

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする（busy 中の自動クローズ停止・busy 解除後の再開・フォーカス保持を tests/ui/dismiss-dialog.test.ts で固定）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）
