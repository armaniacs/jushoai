# バックログ（PBI-55レビューラウンド・2026-10-19）

`/code-review`（PBI-55差分）の指摘5件を全件PBI化した。全候補を同一基準（RICE）で採点し、同ファイルは直列で実装する。未実装・未コミット。

## RICE採点表

| 順位 | NN | 候補 | Reach | Impact | Confidence | Effort(人月) | RICE | 根拠 |
|---|---|---|---|---|---|---|---|---|
| 1 | 56 | 結果ビューのフォーカス移動 | 6 | 1 | 80% | 0.05 | 96 | 部分適用のたびに起きるa11y欠落。1行＋単体テストで閉じる |
| 2 | 57 | byResultのReadonly化 | 2 | 0.25 | 100% | 0.02 | 25 | 1行変更。58と同ファイルで直列57→58 |
| 3 | 58 | 結果ラベルの一本化 | 4 | 0.5 | 80% | 0.08 | 20 | drift防止。preview系3件は直列56→58→59 |
| 4 | 59 | 結果モード中のsetRows無効化 | 2 | 0.5 | 80% | 0.05 | 16 | 将来の呼び出し順変更への備え。末尾に実施 |
| 5 | 60 | 報告クリック結線テスト | 3 | 1 | 50% | 0.2 | 7.5 | スタブ可否が不確か。不可なら理由記録で見送り |

## 依存関係

- 56→58→59：同ファイル（`src/ui/preview.ts`）のため直列
- 57→58：同ファイル（`src/feedback/issue-url.ts`）のため直列
- 60は独立（E2Eのみ）だが最後に実施

## ファイル一覧

- `2026-10-19-56-fix-result-focus.md`（1位）
- `2026-10-19-57-chore-readonly-byresult.md`（2位）
- `2026-10-19-58-refactor-result-labels.md`（3位）
- `2026-10-19-59-chore-setrows-guard.md`（4位）
- `2026-10-19-60-test-report-clickthrough.md`（5位）

## レビュー記録（2026-11-24・PBI-282 Task 14）

- 対象は子 PBI 56-60 の実装済み差分（統合 0c1d9c4。17 ファイル・640 行追加）である。
- 56（結果ビューのフォーカス移動）の a11y 保証を確認した。`src/ui/preview.ts` の `showResult` は報告ボタンへ `report.focus()` し、テスト `tests/ui/preview.test.ts` が shadow root の activeElement で固定している。現行コードにも残存する。
- Task 9（PBI-285 監査）の F2 は `showUndoResult` に `done.focus()` を足した対称の対応であり、56 と矛盾しない。発話の不足は PBI-291 に分離済みで、このラウンドの範囲外である。
- 57（byResult の Readonly 化）、58（FILL_RESULT_LABELS の一本化）、59（resultMode の setRows ガード）、60（E2E の reportButton と resultPanelText）は現行コードに残存し、利用者向け挙動の変更は無い。
- 判定は問題なし。このラウンドを閉じる。
