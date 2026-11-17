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
- [ ] setRegisterBusy(true) の間は maybeAutoHide が自動クローズしない（busy 中のタイマー満了は teardown を起こさない）
- [ ] busy 中の submit は disabled 属性を使わず aria-disabled="true" + クリック無視にする（copy.js と同一方針）
- [ ] 登録フローの失敗時に role="alert" が表示され続けることを単体テストで固定する
- [ ] `make check` が緑

## 実装手順
- maybeAutoHide（dismiss-dialog.ts）に busy 条件を足す
- setRegisterBusy を aria-disabled 方式に置き換える
- タイマー満了と busy の競合を固定するテストを tests/ui/ に追加（vitest の fake timers）

## テスト戦略
- tests/ui/dismiss-dialog.test.ts に fake timers で「busy 中にタイマー満了しても teardown しない」「busy 解除後に通常の自動クローズが再開する」を追加
- フォーカス保持は activeElement の断言で固定

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
