# PBI: 永続登録の解除導線（undo ヒントまたは即時 undo）

## ユーザーストーリー
バナーの X から誤って「起動しないURLに登録する」を押した利用者として、登録の取り消しをその場で行える（または取り消し先がすぐ分かる）ようにしてほしい、なぜなら 登録は永続で当該ページでは拡張 UI が消えるのに「元に戻す」は dismiss の取り消しのみで、解除には設定ページを自力で探す必要があるから

## 優先度
- 順位: 14 / 14
- RICEスコア: 16（Reach=2 / Impact=1 / Confidence=80% / Effort=0.1人週）
- 根拠: 同意の範囲自体は意図通りに制御されている（prefix は origin+第 1 セグメントに制限、選択はラジオ+明示 submit）ため重篤ではないが、不可逆操作が可逆操作と視覚的に同列に置かれている是正

## 出どころ
- checking-team 2026-11-18 ラウンド・Ethics & Bias Auditor。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/ui/dismiss-dialog.ts:53-57・118-133、src/entrypoints/content.ts:509-513

## BDD受け入れシナリオ
Scenario: 登録成功時に解除先が分かる
  Given クイック登録が成功した
  When  結果表示を読む
  Then  「解除は設定ページの『起動しないURL』から」という文言（または同等の導線）が表示される

Scenario: 登録直後の即時 undo
  Given 登録成功の表示が出ている
  When  undo ボタンを押す
  Then  保存済みエントリの該当 1 件が削除され、そのページのバナーが復帰する

## 受け入れ基準
- [x] (a) 登録成功時の文言に解除先を明示する、または (b) 登録直後の即時 undo（保存済みエントリの 1 件削除）を提供する。実装判断は着手時に 1 つ選ぶ
- [x] (b) を選んだ場合、削除は exclusions-store 経由の既存 API（1 件削除）で行い、他のエントリを壊さないことをテストで固定する
- [x] `make check` が緑

## 実装手順
- (a)/(b) の判断: (b) は 241（複数ライター競合）の merge 規則と競合しうるため、241 の後に着手する場合は (b)、先に着手する場合は (a) を推奨
- (a) の場合: dismiss-dialog の成功文言 1 行と options 側節名の照合
- (b) の場合: 登録成功後の表示に undo ボタンを足し、1 件削除メッセージと配線する

## テスト戦略
- (b) の場合: 1 件削除の単体テスト（他エントリに触れない・上限との整合）
- (a) の場合: 文言照合（STATUS 集約の規律に合わせる）

## 見積もり
0.1人週（要チームでの見積もり）

## 実装記録
- 方式判断: (b)（登録直後の即時 undo）を採用。241 の merge 方式保存（commit 47cb8de）が先行完了しており競合の懸念は解消済みで、(a) に落とす不自然さはなかった。成功表示に解除先ヒントの文言も併記し、倫理指摘の要件（解除先が分かる）と undo（その場で可逆）を両方満たす。
- **close-on-success の挙動変更**（旧 PBI-227/228 実装からの変更。PBI-234 の pin は退行させていない）:
  - `src/content/exclusion-register.ts`: 成功時の `deps.close()` を `deps.showSuccess(registered)` に置き換え。`registered` は保存後のリストと保存前の差分から取った正規形 1 件（undo が削除すべき値そのもの）。`ExclusionRegisterDeps` から `close` を削除し `showSuccess` を追加。
  - 失敗時の role="alert" 生存・busy 中の自動クローズ停止・busy 解除後の再武装・aria-disabled + クリック無視の PBI-234 pin は無変更で、既存テストがそのまま緑。
- `src/ui/dismiss-dialog.ts`: `showRegisterSuccess(onUndoRegistration)` を追加。登録 UI（候補・submit）と dismiss 操作（「今回だけ閉じる」「元に戻す」）を DOM から外し、本文を「起動しないURLに登録しました。解除は設定ページの『起動しないURL』から。15秒後に自動で閉じます。」に差し替え、「登録を取り消す」ボタンだけを残す。dismiss 操作を外すのは、登録後の「元に戻す」は exclusion が効いたページのバナーを戻すだけで機能せず、意味の違う undo が 2 つ並ぶ誤誘導を防ぐため。role="status" の live region にも成功と解除先を告知。フォーカスは undo ボタンでなくダイアログ箱（tabindex=-1）へ置く（undo にフォーカスを置くと登録直後の連打 Enter が取消を起こすため。Tab で 1 ステップで届く）。以降の `submitRegister` は stale ハンドルでも再登録しないようガード。エラー表示（role="alert"）は undo 失敗時の理由表示に再利用するため残す。自動クローズは従来機構のまま（busy 解除後の再武装が成功表示の読める時間を担保）。
- `src/content/exclusion-register.ts` に `undoRegisteredExclusion(entry, deps)` を追加: load → `removeExclusionEntry`（core の既存 1 件削除。大文字小文字を含め完全一致。登録値は add 時に正規化済みなので正確に 1 件だけ消える）→ save の逆連鎖。該当 1 件が既に無い場合（他ライターが削除済み）は書き戻さず取り消し済みとして扱う。読み込み失敗は投げられた文言、保存失敗は固定文言「取り消しに失敗しました」。setBusy でダイアログの busy 表示と自動クローズ抑制を登録チェーンと共通化。
- `src/entrypoints/content.ts`: undo の配線。`onRemoved` で `dismissed.remove(form.container)` + `schedule()`（バナー復帰。exclusion が消えた直後に storage.onChanged 経由の gate refresh でも再開するが、即時性のために既存 onUndo と同じ経路を通す）→ ダイアログ close。削除失敗時はダイアログを開いたまま alert に理由を出し、バナーは戻さない（exclusion が残っているため不整合を避ける）。
- 241 との相互作用（開示）: undo は「load → 1 件削除 → save」のため、undo の load と save の間にオプション側の merge 保存が割り込むと、その保存結果を undo の書き込みが上書きし得る（登録→undo と並行してオプション保存が走る競合）。また、利用者がオプションの draft に同一 URL を手動追加していた場合、undo 後のオプション保存が merge の draft-addition として当該 entry を復活させ得る。どちらも 241 の merge 規則の定義内の挙動で、本 PBI ではテスト対象外とする。
- TDD: tests/content/exclusion-register.test.ts（成功時 showSuccess・undo チェーン 7 件）、tests/ui/dismiss-dialog.test.ts（成功表示 BDD シナリオ 1・切り替え構造・undo ボタン・自動クローズ 11 件）、tests/core/exclusions.test.ts（上限いっぱいからの 1 件削除 1 件）、tests/integration/exclusion-undo.test.ts（新設。実ダイアログ+実チェーン+実ストアで BDD シナリオ 2 と失敗時 1 件）を先に追加し RED 26 件を確認してから実装し GREEN。
- 検証: `npx vitest run` 189 ファイル 3162 passed + 1 expected fail。`npm run eval` パス（ルール分類 pin 影響なし）。`make check` 緑。
- レビュー修正（2026-11-18）: 成功表示の箱（tabindex=-1）フォーカスを自動クローズの保持と数えないよう、保持をホバー/フォーカスの 2 フラグに分割（本文の「15秒後に自動で閉じます」を既定状態で真に。PBI-237 の pin は無変更で維持）。成功表示への切替時に残ったエラー表示をクリア。undo ボタンに busy 中の再クリック無視を追加。登録差分の特定漏れを `?? ''` の黙示的劣化から固定文言の失敗表示へ変更。テストは dismiss-dialog +4（内 1 件は既定状態で15秒で閉じるよう pin を差し替え）、exclusion-register +1（計 14）。

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする（fixture 先行。deps 単体 7 件 + core 2 件 + 統合 2 シナリオ + undo 失敗系。RED 26 → GREEN）
- [x] コードレビュー完了（初回レビュー Approved・Important 1 件 → 修正（a968c97・77e29e7）→ 再レビュー Approved・Critical/Important/Minor すべて解消）
- [x] ドキュメント更新済み（本 PBI に実装記録。テスト数の訂正も反映済み）

### レビュー記録（初回 Approved・Important 1 件→修正後 再レビュー Approved・残 Minor なし）

- 初回 Important: 成功表示の「15秒後に自動で閉じます」が自身の既定状態（box.focus() で保持が入る）で不実。修正: engaged を hover/focus の 2 フラグに分割し、非インタラクティブな箱（tabindex=-1）フォーカスを保持対象から除外。実コントロールのフォーカス保持・Esc・leave クローズの PBI-237 意味論は無変更 pin で保存、既定状態 pin 1 件は既定状態被覆の強化として差し替え（台帳に記録済み）
- 併せて解消: 成功表示時の errorBox クリア（failure→retry→success の残存文言）、undo 二重クリックの busy ガード + pin、登録差分特定漏れの showError 化（throw ではなく void 呼び出し規約に整合。失敗表示でフェイルセーフ方向が正しい）
- 241 との境界（undo とオプション merge 保存の競合順序で entry が復活し得る）は実装記録に開示済み・テスト対象外
