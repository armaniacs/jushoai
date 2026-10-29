# バックログ: アーキテクチャ改善ラウンド4（2026-10-30）

ラウンド3適用後の新規摩擦9件をRICE採点し、実装順を確定する。深掘り（5 Whys）は各候補に実施済み。

| 順位 | PBI | スコア | 根拠・依存 |
|---|---|---|---|
| 1 | [181](2026-10-30-181-refactor-shared-pass.md) | 120 | ゲート＝送信の型保証。依存なし。最初に着手 |
| 2 | [182](2026-10-30-182-refactor-trial-both-saveside.md) | 113 | 実在の規律逸脱。prefecture不一致は仕様確認が先。依存なし |
| 3 | [183](2026-10-30-183-refactor-layers-table.md) | 90 | 小工数の誤読防止。依存なし |
| 4 | [184](2026-10-30-184-refactor-save-handler-factory.md) | 53 | 縮小再発の打ち止め。依存なし |
| 5 | [185](2026-10-30-185-refactor-send-set-unify.md) | 45 | 指標と実態の乖離防止。依存なし |
| 6 | [186](2026-10-30-186-refactor-entry-points-list.md) | 43 | 誤解除去。fill-one Bundle化は別途判断。依存なし |
| 7 | [187](2026-10-30-187-refactor-validator-split.md) | 40 | エラー文単一出所化。依存なし |
| 8 | [188](2026-10-30-188-refactor-adapter-seam.md) | 37 | seam再発防止。seed統一は対象外。依存なし |
| 9 | [189](2026-10-30-189-refactor-float-shim.md) | 36 | 機械的で低リスク。依存なし |

RICE = (Reach × Impact × Confidence) / Effort。詳細の内訳は各PBIファイルの優先度節を参照。
