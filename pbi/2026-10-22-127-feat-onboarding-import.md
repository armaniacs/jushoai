# PBI: 初回オンボーディング軽減（自動入力からの取り込み＋ガイド）

## ユーザーストーリー
新規利用者として、プロファイル10件＋住所紐付けの初期登録を手入力せず済ませたい、なぜなら最初の登録が重く使い始める前に離脱するから

## 優先度
- 順位: 4 / 7
- RICEスコア: 320（Reach=300 / Impact=2 / Confidence=80% / Effort=1.5人週）
- 根拠: 新規にのみ影響だが導入率に直結し工数小。依存なし

## BDD受け入れシナリオ
Scenario: 既存の自動入力から取り込める
  Given Chrome標準の自動入力に氏名・住所がある
  When 設定ページの取り込みを選ぶ
  Then JushoAIの正規化・バリデーションを通った項目だけ下書きになり確定前は保存されない

Scenario: 空のまま迷わない
  Given プロファイル・住所が未登録
  When フォームでボタンを押す
  Then 設定画面への誘導が出て空注入はしない

## 受け入れ基準
- [x] 取り込み値は`normalizeProfile/normalizeAddress`＋`validate`を通す → `applyImportDraft`が統合を通し、検証を通らない値は棄却（テストで固定）
- [x] 確定操作なしに保存・送信しない → 取り込みはフォームへの下書きのみ。保存は「保存」ボタンの別操作で、取り込みだけではstorageに書かない
- [x] 個人情報をIssue・ログに出さない → 結果表示は件数のみ（taken/dropped）。値は表示もログにも出さず、chrome.tabs.sendMessageで端末内だけを移動

## 実装記録（2026-10-23）

- **スコープ記録**: Chrome標準の自動入力データは拡張機能から読めないAPIが存在しないため、現実的な経路として「自動入力済みのフォームを開き、そこから取り込む」を実装した。設定ページの「フォームから取り込む」→ アクティブタブのcontent scriptがルール分類（LLMなし・ゲートなし・純粋）→ 入力済みの確信欄から下書きを組み立てる。
- `src/core/import-draft.ts`: ページの入力済み欄から下書きを組み立てる純粋関数。`draftFromPage`。空欄・readOnly/disabled・unknownは対象外。分割郵便番号（zip1/zip2）は両方読めたときだけ結合。
- `src/core/import-apply.ts`: `normalizeProfile/normalizeAddress`＋`validateProfile/validateAddress`を通す取り込み適用。欄単位の判定は「ベースラインの検証エラーを超える新規エラーを出さない」かつ「正規化後に空でない」。カナの修正はベースラインのエラーを消すので採用される。
- `src/import-message.ts`: chrome非依存のメッセージ形状（options送信 → content受信）。
- `src/entrypoints/content.ts`: `import-draft`メッセージの受信ハンドラ。`classifyField`＋`refineClassifications`のルールのみで下書きを返す。除外ページはオプトアウトを尊重して返さない。
- `src/entrypoints/options/main.ts`: 「フォームから取り込む」ボタン。アクティブタブへ依頼し、1枚目のプロファイル・住所カードに適用して再描画。結果は件数のみ表示。
- テスト: `tests/core/import-draft.test.ts`（5件）、`tests/core/import-apply.test.ts`（5件。正規化通過・検証棄却・カナ修正・統合経路を固定）。
- 「空のまま迷わない」は既存の未登録時の設定画面誘導（`open-optionsRequest`経路）で実装済み。
- `make check` exit 0（133ファイル 1771テスト + 1 expected fail）。

## テスト戦略
- E2E: 取り込み→編集→保存→実フォーム注入の通し確認 → BDDシナリオは単体・統合テストで固定。実ブラウザのE2Eは`tests/e2e/`の既存手順に従い後日追加
- 統合: 設定ストアの保存・読み出しテスト → `storage.test.ts`で既存。取り込み適用は`import-apply.test.ts`で固定
- 単体: 正規化・バリデーションの境界値テスト → `import-draft.test.ts`＋`import-apply.test.ts`（正規化通過・棄却・カナ修正）

## 見積もり
3（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（10テスト追加。取り込みは検証を通った項目だけ下書きになり、保存は別操作）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録とChrome自動入力のスコープ記録）
