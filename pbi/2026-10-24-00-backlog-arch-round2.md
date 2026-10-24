# ラウンド: アーキテクチャレビュー指摘のPBI化（2026-10-24）

/improve-codebase-architecture（HTML報告・10候補）を全件PBI化し、RICEで優先度付けした。
報告ファイル: `/var/folders/b_/fzr253l50g58s5p7d94nxjmc0000gn/T/architecture-review-20261024-0932.html`（OS一時領域、リポジトリ外）

探索方法: git log（PBI-124〜149 hot spots）+ 2体のサブエージェント（src/core+messaging 半分 / src/ui+entrypoints 半分）。過去ラウンド（2026-10-16 arch、2026-10-18 arch、holistic、weakness、deep-dive、newfeat、review2）の記録済みテーマとの重複は各候補で確認済み ― いずれも別層・別方向の摩擦。

推定前提（全候補共通）: ユーザ向け＝月間影響100件基準、開発向け＝月間タッチ5〜30件基準、Effortは人月。
依存による入替あり（156は150の後、158は151の後、153は156の後、159は153の後）。

## 最終順位

| 順位 | PBI | RICE | 内訳 (R/I/C/E) | 根拠 |
|------|-----|------|------|------|
| 1 | 2026-10-24-150-refactor-pipeline-kana.md | 400 | 30/2/80%/0.12 | 唯一挙動の分岐が実在（fill-one がフリガナ欄に漢字氏名）。バッチ1 |
| 2 | 2026-10-24-151-refactor-options-notice.md | 240 | 18/1/80%/0.06 | 帰属先 dom.ts が既に存在する quick win。バッチ1 |
| 3 | 2026-10-24-152-refactor-banner-kind.md | 160 | 6/1/80%/0.03 | 文字列嗅ぎの coupling を型で断つ quick win。バッチ1 |
| 4 | 2026-10-24-153-refactor-store-module.md | 32 | 8/2/50%/0.25 | エラー握りつぶしの解消。159の前提 |
| 5 | 2026-10-24-154-refactor-egress-pending-split.md | 27 | 2/1/80%/0.06 | プライバシー不変条件の自動検証。バッチ1 |
| 6 | 2026-10-24-155-refactor-confirm-dialog.md | 21 | 5/1/50%/0.12 | 5パネルの settle-once 手写しを1実装に。バッチ1 |
| 7 | 2026-10-24-156-refactor-tab-dispatch.md | 19 | 3/1/50%/0.08 | 除外ゲート不変条件の1箇所化。150の後 |
| 8 | 2026-10-24-157-refactor-preview-row-seam.md | 15 | 6/1/50%/0.20 | copy-grown twin block の内部 seam 化。バッチ1 |
| 9 | 2026-10-24-158-backlog-field-catalog.md | 5 | 2/0.5/50%/0.10 | フィールド語彙の1表集約。151の後・文言差の扱いを先に決定 |
| 10 | 2026-10-24-159-backlog-flow-state-batch.md | 3.3 | 2/0.5/50%/0.15 | 学習状態のバッチ読み。153の後 |

## 実施順

バッチ1（並列可・ファイル重なりなし）: 150（fill-one/import-draft/content.ts:532）→ 151（options 4+dom.ts）→ 152（button/content-session）→ 155（ui 4パネル）→ 157（preview.ts）→ 154（egress-plan/analyze.ts）
バッチ2（直列後続）: 156（content.ts:489-566・150の後）→ 158（options/main.ts・151の後）→ 153（store群+content.ts:404・156の後）
バッチ3: 159（153の後）
