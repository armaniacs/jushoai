# バックログ: アーキテクチャ改善ラウンド3（2026-10-29）

アーキテクチャレビュー（round 3）で発見した12件をRICE採点し、実装順を確定する。深掘り（5 Whys）は各候補に実施済み。

| 順位 | PBI | スコア | 根拠・依存 |
|---|---|---|---|
| 1 | [169](2026-10-29-169-refactor-e2e-scenario-unification.md) | 320 | 以降の全e2e作業を半減。依存なし。最初に着手 |
| 2 | [170](2026-10-29-170-refactor-guide-controller.md) | 160 | 実在の表示分岐を含む。171とは配置分離で並列可 |
| 3 | [171](2026-10-29-171-refactor-save-side-deepen.md) | 128 | ホットスポット直撃。新規save-side.tsに配置し170と並列可 |
| 4 | [172](2026-10-29-172-refactor-guide-validator.md) | 107 | ドキュメント改訂の誤検出防止。依存なし |
| 5 | [173](2026-10-29-173-refactor-import-target-select.md) | 93 | 同種バグの再発防止。依存なし |
| 6 | [174](2026-10-29-174-refactor-classify-pipeline.md) | 90 | 正確性leverage最大だが設計リスク高・工大。175は本PBIの後に実施 |
| 7 | [175](2026-10-29-175-refactor-classify-transport.md) | 38 | 174の後に実施（gateway重複のため）。単独着手不可 |
| 8 | [176](2026-10-29-176-refactor-notice-center.md) | 35 | 同点の177よりリスク軽減で先行。依存なし |
| 9 | [177](2026-10-29-177-refactor-shared-fetch-seam.md) | 35 | 176の後に順位付け。依存なし |
| 10 | [178](2026-10-29-178-refactor-fill-flow.md) | 33 | 方向性は正しいが工大。依存なし |
| 11 | [179](2026-10-29-179-refactor-classify-once.md) | 26 | parity維持中のため効果は将来分。174と競合しないよう後に実施 |
| 12 | [180](2026-10-29-180-refactor-video-lib-unify.md) | 16 | プロモ低頻度のため最下位。依存なし |

RICE = (Reach × Impact × Confidence) / Effort。詳細の内訳は各PBIファイルの優先度節を参照。
