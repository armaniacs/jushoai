# PBI: content.ts の Fill Session モジュール深化

## ユーザーストーリー

保守担当者として、content script の一連の入力フロー（分類→再計画→プレビュー→同意検証→注入）を Fill Session モジュールに集約してほしい。なぜなら現在の `main()` 閉包は290行近い順序ロジックが DOM 経由でしか検証できず、利用者に見える安全不変条件（除外ゲート・同意検証・プレビュー排他）のバグが単体テストで防げないから。

## 背景・問題

- 対象:
  - `src/entrypoints/content.ts:289-578`（`main()` 閉包全体）
  - `src/entrypoints/content.ts:335-444`（`run()` 約150行：分類→再計画→プレビュー→適用）
  - `src/entrypoints/content.ts:446-491`（`sync()`：走査・マウント）
  - `src/content-run.ts`（59行の純粋断片。ヘッダが「副作用は content.ts に残る」と認めている）
- 現状: `mounted / running / openPreview / openGuide / browser / gate / observer / timer` を閉じ込めた無 interface モジュール。`verifyApplyConsent`（58-80行）・`defaultConsentCheckDeps`（126-175行）・`attachRepositionTracking`（212-239行）・`createExclusionGate`（261-287行）は深いが、その間をつなぐ順序（分類中の除外到着→パネルを開かない、プレビュー/ガイド相互排他383-387行、適用直前の同意検証408-437行、履歴API移動時の再評価452-455行）は閉包内に散在し、DOMなしでは検証不能。`content-run.ts` の3関数は interface が本体と同程度に複雑な浅い pass-through（deletion test 不合格）。
- 提案: アーキテクチャレビュー候補 #1（Strong）。`openFillSession(container, deps): SessionHandle { replan / reanalyze / apply / cancel }` を深い module とし、`main()` は mount/sync/message/start/stop の薄い mounter に残す。consent・exclusion・reposition は session の seam に注入する adapter とする。
- 候補番号: 本ラウンド順位 2（全5件）

## 優先度・スコア

- 順位: 2 位 / 5 件
- RICE スコア: 160
  - Reach = 50（入力フロー全体の将来変更がすべて恩恵）
  - Impact = 2（安全不変条件のテスト可能性打開）
  - Confidence = 80%（gate系は注入可能 seam として抽出済み、session 境界は特定済み）
  - Effort = 0.5 人週（閉包手術＋session テスト＋mounter 化＋check 全通し）
- 根拠: 最ホットファイル（直近7接触）の不可視テスト領域を打開するため高順位。順位1とはファイル独立のため並列着手可。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー — ボタン押下から注入までが session 経由で完走する
  Given フォームコンテナと偽の分類器・プレビュー・注入器が session に注入されている
  When openFillSession → replan → apply の順に呼ぶ
  Then 分類→再計画→同意検証→注入の順序で実行される
  And 最終利用状態が保存される

Scenario: 境界 — 分類中 diff 中に除外が到着したらパネルを開かない
  Given 分類が進行中の session がある
  When 分類完了前に除外ゲートが有効になる
  Then パネルは開かれない
  And 注入は一切行われない

Scenario: 境界 — 覆われた適用ボタンでは注入せず理由を返す
  Given 適用ボタンのヒットテストが自 UI 以外を返す session がある
  When apply を呼ぶ
  Then 注入は行われない
  And 中止理由がフォームボタン側に通知される
  And パネルは開いたまま残る（再試行・取消が可能）
```

## 受け入れ基準

- [ ] `run/replan/reanalyze/onApply` の状態（profileId・addressId・plan・before/after スナップショット・classifier）が session 内に移っている
- [ ] `main()` が mount/sync/message-listener/start/stop のみを保持している
- [ ] フォームボタン経路とポップアップ経路（496-517行）が同一 session interface の2呼出しになっている
- [ ] 除外・同意・排他の順序不変条件が session の単体テストで検証されている
- [ ] `make check` がパスする（typecheck＋test＋両ブラウザ build＋manifest 検査＋lint）

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 既存の Chrome / Firefox 実ブラウザ E2E（`make e2e-chrome` / `make e2e-firefox`）で回帰確認。実行コンテキストの制約で未実行の場合はユーザー作業として残す。

### 統合テスト

- ポップアップ経路（`ANALYZE_MESSAGE_TYPE`）→ session → プレビュー表示の結合を既存テスト流儀で確認する

### 単体テスト

- session の順序テスト（上記 BDD 3 シナリオを偽 deps で駆動。DOM 不要）
- 除外・同意・排他の各不変条件テスト
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.5 人週（ストーリーポイント換算では大。要チームでの見積もり）
- 内訳想定: session 抽出＋単体テスト＋mounter 化＋`make check` 全通し＋レビュー対応

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] `make check` がパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新不要であることが確認済み（内部付け替えのため。README・設計書の記述と矛盾しないこと）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/entrypoints/content.ts` 全文（578行）と `src/content-run.ts`。

- `content-run.ts` は session 抽出後に吸収・削除される見込み。3関数を温存せず session の内部 seam に畳むこと
- `fillField` のネイティブ setter 経由の実装（`src/dom/fill.ts`）は置き換えないこと（`el.value = ...` にしない。React/Vue トラッカー迂回の約束）
- プレビューは承認経由のみで注入すること（ボタン押下→分類→`buildPlan`→プレビュー承認→`fillField` の順を崩さない）
- 入力済み欄の非上書き・`maxlength` 超過の警告のみ（切り詰め注入なし）の約束を session 側で維持すること

### 落とし穴

- 同意ゲートは「パネル host の検証」であって先頭 `[data-jushoai]` の検証ではないこと（131-136行の注意を session に継承）
- `getButtonPoint` の例外は fail-safe（empty 扱いで阻止。153-159行）
- 除外中の `start/stop` 所有権（527-558行：stop は observer・timer・button・panel を全 teardown）を session 境界と二重管理にしないこと
- `chrome.storage.onChanged` の除外リスナ（572-574行）は mounter 側に残し、session に持ち込まないこと
