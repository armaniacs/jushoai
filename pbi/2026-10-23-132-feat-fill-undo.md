# PBI: 注入履歴と直後のundo

## ユーザーストーリー
入力する利用者として、誤注入したら直後に元に戻したい、なぜならプレビュー承認があっても欄と値の対応を誤認することがあり、戻せない恐怖が繰り返し利用の妨げになるから

## 優先度
- 順位: 2 / 6
- RICEスコア: 280（Reach=700 / Impact=1 / Confidence=80% / Effort=2人週）
- 根拠: 全注入利用者に効き、承認短縮（PBI-128）の安全前提になる。依存なし

## BDD受け入れシナリオ
Scenario: 直後の注入を取り消せる
  Given JushoAIで注入した直後のフォーム
  When undoを選ぶ
  Then JushoAIが入れた欄だけ注入前の値に戻り、元々入力済みだった欄は触らない

Scenario: 履歴は外部に出ない
  Given 履歴がある状態
  When AI分類・監査ログ出力が動く
  Then before値は送信内容・ログに含まれず端末内のみに残る

## 受け入れ基準
- [x] ページ読み込み時の自動入力はしない（方針維持）。undoも承認後の注入に対する明示操作のみ → undoはresult表示の「元に戻す」ボタンからのみ。履歴はapplyの直後に生成され、次のapplyで上書きされる
- [x] `readonly/disabled`・入力済みskipの欄はundo対象にしない → 履歴は`filled`行だけに付く（`fillPlan`の構造で保証）。テストで入力済みskip欄が履歴に入らないことを固定
- [x] React/Vueのstate更新のためsetter＋イベント発火の逆操作でも追従すること → `uncheckRadio`（新規）と`fillField(el, '')`がprototype setter＋input/change/blurで逆操作する。テストでイベント発火を固定

## 実装記録（2026-10-23）

- `src/dom/fill.ts`: `uncheckRadio`を追加（fillRadioと同じprototype setter＋イベント発火の逆操作）。
- `src/dom/fill-plan.ts`: `FillTarget`に`snapshot`/`restoreEmpty`を追加（snapshotはradio groupではチェック済みoptionの値）。`UndoEntry` + `undoFill`（snapshotが一致する欄だけ空状態に戻し、ユーザー追記欄はskip）。`FillReport.undo`は`filled`行だけに付く。`targetsFromControls`がrestoreEmptyを実装（input→''、select→先頭option、radio→uncheck）。
- `src/content-session.ts`: `SessionEnv.injectPlan`が`FillReport`を返すように変更。sessionが最新の履歴をメモリに保持（送信・永続化なし）し、`undoCount` getter と `undoLast`（1回限り・履歴を消費）を公開。
- `src/ui/preview.ts`: result表示に「元に戻す」ボタン（履歴があるときのみ）と `showUndoResult`（戻した件数＋追記protectの件数）を追加。
- `src/content/preview-bind.ts`: apply後に履歴があればresult表示を開き、undoボタンから`session.undoLast()`へ配線。
- テスト: `tests/dom/fill-plan.test.ts`にundo 8件（BDDの注入→undo→再注入の通しもjsdomで固定）、`tests/content-session.test.ts`に`undoLast` 3件、`tests/ui/preview.test.ts`にundoボタン3件。fake分類器・fake sessionを新契約に対応。
- `make check` exit 0（126ファイル 1732テスト + 1 expected fail）。

## テスト戦略
- E2E: 注入→undo→再注入の通し確認 → BDDの通しシナリオはjsdomの統合テストで固定（`fillPlan`→`undoFill`→再`fillPlan`）。実ブラウザのE2Eは`tests/e2e/`の既存手順に従い後日追加
- 統合: 履歴の保存・破棄（保持期間・上限）テスト → sessionの`undoLast`テストで最新1回分のみ保持・消費を固定（永続化なしのため保持期間の概念なし）
- 単体: `fill-plan`の逆操作ロジックの単体テスト → `undoFill`のrestored/skipped分岐

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（14テスト追加。履歴はメモリのみで送信・ログに含まれないことをfake分類器経由の構造で固定）
- [x] コードレビュー完了
- [x] ドキュメント更新済み（CLAUDE.mdの注入アーキテクチャにundoを追記）
