# Backlog: コードレビュー指摘（第2ラウンド・2026-10-11）の対応ラウンド

起票日: 2026-10-11。レビュー対応ラウンド実装後のレビュー Suggestions #1〜#4 を RICE で採点し、実装順を確定する台帳。今回は PBI 化のみ行い、実装は別途行う。

## 順位表

| 順位 | PBI | RICE | 根拠・依存 |
|---|---|---|---|
| 1 | `2026-10-11-24-fix-consent-point-throw-guard.md` | 40 | 全適用フロー。26 と同一ファイルのため直列に実施し、本 PBI を先にする |
| 2 | `2026-10-11-25-chore-test-spy-restore.md` | 0.5 | テスト堅牢性のみ。独立 |
| 3 | `2026-10-11-26-chore-apply-point-null-removal.md` | 0.5 | 整理。24 の後に実施（同一ファイル・直列） |
| 4 | `2026-10-11-27-fix-consent-real-dom-coverage.md` | 0.4 | dev 工程・jsdom 制約。独立 |

## Definition of Done

- [ ] 順位 1〜4 が完了し、アーカイブされる
- [ ] `make check` が緑
