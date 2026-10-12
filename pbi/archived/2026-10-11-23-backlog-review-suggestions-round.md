# Backlog: コードレビュー指摘（2026-10-11）の対応ラウンド

起票日: 2026-10-11。コードレビューの Suggestions #1〜#8 を RICE で採点し、実装順を確定する台帳。

## 順位表

| 順位 | PBI | RICE | 根拠・依存 |
|---|---|---|---|
| 1 | `2026-10-11-15-fix-apply-point-reason.md` | 50 | 文言精度・1 行級。#1 の後に実施（同一ファイル・直列） |
| 2 | `2026-10-11-16-fix-opacity-compare.md` | 40 | 同上、発現稀で Conf80%。#1 の後に実施 |
| 3 | `2026-10-11-17-fix-consent-button-point.md` | 35 | 形状を決めるため #1 を先に実施 |
| 4 | `2026-10-11-18-fix-audit-budget-overhead.md` | 10 | quota 実測なしで Conf50%。独立 |
| 5 | `2026-10-11-19-chore-audit-remeasure-bound.md` | 8 | 記録系。独立 |
| 6 | `2026-10-11-20-chore-doh-budget-accepted.md` | 4 | 記録のみ。独立 |
| 7 | `2026-10-11-21-backlog-release-assertion-parser.md` | 0.5 | 将来候補。着手条件を記録し今回は実装しない |
| 8 | `2026-10-11-22-chore-test-reason-assertion.md` | 0.5 | 可読性のみ。独立 |

## Definition of Done

- [x] 順位 1〜6・8 が完了し、アーカイブされる
- [x] 順位 7 は将来候補として残る
- [x] `make check` が緑
