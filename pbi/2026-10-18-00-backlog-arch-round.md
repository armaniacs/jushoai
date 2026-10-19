# ラウンド: アーキテクチャレビュー指摘のPBI化（2026-10-18）

architecture-review（HTML報告・7候補）を全件PBI化し、RICEで優先度付けした。
報告ファイル: `/var/folders/b_/fzr253l50g58s5p7d94nxjmc0000gn/T/architecture-review-20261018-205500.html`（OS一時領域、リポジトリ外）

推定前提（全候補共通）: ユーザ向け＝月間影響100件基準、開発向け＝月間タッチ5〜30件基準、Effortは人月。
依存による入替あり（43・45は42の後、46は42→43の後、44はanalyze.tsに触れない制約付きで41と並列可）。

## 最終順位

| 順位 | PBI | RICE | 内訳 (R/I/C/E) | 根拠 |
|------|-----|------|------|------|
| 1 | 2026-10-18-41-refactor-radio-policy-owner.md | 267 | 10/2/80%/0.06 | 二重所有の矛盾を最小工数で断つ。依存なし |
| 2 | 2026-10-18-42-refactor-attempt-seam.md | 240 | 30/2/80%/0.20 | 直近変更がすべて迂回しているseam。43・45・46の前提 |
| 3 | 2026-10-18-43-refactor-transfer-contract.md | 100 | 10/1/80%/0.08 | 数値ずれを実行時から静時に。42の後・46の前 |
| 4 | 2026-10-18-44-refactor-pipeline-entry.md | 80 | 20/2/50%/0.25 | 7箇所巡回の理解コスト。analyze.ts不触で41と並列可 |
| 5 | 2026-10-18-45-refactor-session-apply.md | 25 | 10/1/50%/0.20 | 順序バグの居場所を一箇所に。42の後 |
| 6 | 2026-10-18-46-refactor-wire-codec.md | 21 | 5/1/50%/0.12 | 送信側の組み立て負担をcodecへ。42→43の後 |
| 7 | 2026-10-18-47-backlog-failure-table-keep.md | ― | 対応不要 | Two adapters実在のrealなseam。変更せず維持を宣言 |

## 実施順

41 → 42 → 43 → 46（42→43→46は同messages.tsのため直列。43と45は並列可。44は41と並列可だがanalyze.ts不触が条件）
