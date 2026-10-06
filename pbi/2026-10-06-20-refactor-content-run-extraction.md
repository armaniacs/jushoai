# content.ts run()の純粋部品抽出

- 種別: refactor
- 優先度: 順位 4/6、RICE 3.7（Reach=7 / Impact=2 / Confidence=0.8 / Effort=3）
- 見積もり: 3pt

## RICE 根拠

- 2026-10-04 台帳送り「content.ts run() の抽出」の再検討トリガー発火。ポップアップ AI 分析・監査ログ追加で `run` 肥大化が進行したため再評価した。
- Reach=7: 注入フロー全体の保守者に影響するが、利用者への直接価値はない。
- Impact=2: テスト不能な wiring の構造化にとどまり、挙動改善はない。
- Confidence=0.8: 現状コードは Read で確認済みだが、抽出範囲の境界は未確定。
- Effort=3: DOM 依存と純粋ロジックの分離に 3pt を見込む。
- 依存: NN 17 の後。17 が触る `guardedRun` / エラー境界と同ファイル（`src/entrypoints/content.ts`）のため 17 先行。

## ユーザーストーリー

注入フローの保守者として、プレビュー経由の注入判断を単体テストで検証したい、なぜなら `run()` 内の replan・snapshot・feedback 組み立てが DOM と絡み自動テストから事実上消えているから。

## 背景

`src/entrypoints/content.ts:42-138` の `run(container, button)` は 1 クロージャに以下が混在している（Read 確認済み）:

- `src/entrypoints/content.ts:43-47`: `loadData` / `loadLastUsed` / `isReady` による起動ガードと `open-options` 送信
- `src/entrypoints/content.ts:49-56`: `getAiStatusViaBackground` / `requestDownloadViaBackground` / `BackgroundClassifier` による AI 状態取得と `button.setStatus`
- `src/entrypoints/content.ts:58-61`: `scanContainer(container, document)` と `classifyAll(metas, classifier)`
- `src/entrypoints/content.ts:63-66`: `snapshot` と `beforeItems` / `afterItems` の組み立て
- `src/entrypoints/content.ts:71-84`: `replan` クロージャ（`buildPlan` + `PreviewRow[]` 変換）
- `src/entrypoints/content.ts:86-91`: `reanalyze`（`classifyAll` の force 再実行 + `preview.setRows`）
- `src/entrypoints/content.ts:98-136`: `showPreview` の配線（`onProfileChange` / `onAddressChange` / `onApply` / `onCancel`、`saveLastUsed`、`applyPlan(plan, byId, fillField)`）
- `src/entrypoints/content.ts:121-129`: `buildFeedbackIssueUrl(FEEDBACK_REPO, {...})` と `window.open` による feedback URL 組み立て

過去経緯: 2026-10-04 台帳送りで「content.ts run() の抽出」として起票・送り済み。その後ポップアップ AI 分析・監査ログ追加で `run` が肥大化し、replan・snapshot・feedback 組み立てが DOM 配線と結合したまま単体テスト対象外になっているため、本 PBI で再検討する。

## BDD シナリオ

### 1. replan のプレビュー行組み立て

```gherkin
Given 分類済み items と profile / address が与えられたとき
When 抽出後の buildPreviewRows 相当を呼ぶと
Then 抽出前 run() 内の replan と同じ PreviewRow[] が返る
```

### 2. 成功時の注入挙動 parity

```gherkin
Given 同一の fields・items・profile・address のとき
When 抽出後のフローで onApply 相当を実行すると
Then applyPlan に渡る plan と fillField の呼び出し順・回数が抽出前と変わらない
```

### 3. feedback URL 組み立ての分離

```gherkin
Given beforeItems・afterItems・metas と pageHref / provider / version があるとき
When 抽出後の buildFeedbackRequest 相当を呼ぶと
Then buildFeedbackIssueUrl に渡る引数が抽出前 run() 内の onApply と一致する
```

## 受け入れ基準

1. `replan` 相当・`snapshot` 相当・feedback URL 引数組み立て相当が DOM 非依存の純粋関数として抽出されること
2. 抽出後も成功時の注入挙動が変わらないこと（`applyPlan` への引数・`fillField` 経路の parity）
3. byte-identical の規律: 抽出による差分は移動・配線のみとし、プレビュー表示文言・注入値の整形ロジックを変更しないこと
4. プライバシー保証: プロファイル値を外部に送らないことの維持（LLM・feedback URL に渡すのは `FieldMeta` と分類結果のみで値を渡さない）
5. `guardedRun` のエラー境界（`running` ガード・`showError`）の挙動を変えないこと
6. `showPreview` / `button.setStatus` / `window.open` 等の DOM・Chrome API 副作用は `run` 配線側に残し、純粋部品に持ち込まないこと

## テスト戦略

- vitest: `tests/` 配下に抽出部品の単体テストを追加する（例: `tests/entrypoints/content-run.test.ts` で replan 行変換・snapshot・feedback 引数組み立ての parity を検証）。既存の `tests/core/` fixture 流儀に従い、DOM なしで実行できること。
- 手動確認: `samples/` のサンプルフォームで注入を目視し、プレビュー表示・適用結果・feedback 導線が抽出前と変わらないことを確認する。

## DoD

- [ ] 受け入れ基準 1-6 をすべて満たす
- [ ] `make check`（typecheck + test + build）が成功する
- [ ] 抽出前後で注入挙動の parity が vitest と samples/ 目視で確認される
