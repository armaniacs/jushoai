# バックログ台帳: 大局的改善ラウンド（2026-10-06）

診断出所: holistic-code-review 報告書（2026-10-06、本ラウンド内で生成。診断ドメインは DRY / SoC / 拡張性 / 堅牢性）
過去台帳との関係: `2026-10-04-00-backlog-architecture-deepening.md` で閉じた6テーマ（オーバーレイ相互排他・isConfident集約・AI語彙一元化・オーバーレイ抽出・wire形状一元化・classifier seam移動）は差分スコープにより再レビュー対象外。同台帳の台帳送り「content.ts run() の抽出」は、ポップアップ AI 分析・監査ログ追加で run() が肥大化したため再検討トリガーが発火し、本ラウンドの候補 C4 として再評価した。
継続 PBI（別枠・本ラウンドの採点対象外）: `2026-10-06-14`（README読み分け）・`2026-10-06-15`（FB改名）・`2026-10-06-16`（用語集）。いずれも未実装であることを実コード grep で確認済み（`src/ui/preview.ts:124` の `開発にFBする` が残存、用語集なし、README 冒頭宣言なし）。本ラウンドでは新規 6 件を先に閉じ、継続 3 件は直後に `autonomous-task-closer` の流儀で処理する。

## RICE スコアリング表

```
RICE = (Reach × Impact × Confidence) / Effort
Reach: 今後1年の保守作業での関与頻度（相対 1-10）。10=ほぼ毎週 / 5=月次 / 2=年数回
Impact: 3=実害解消 / 2=大きい / 1=中（重複削減・規範化）
Confidence: 1.0=コードで確定 / 0.8=設計判断が残る
Effort: ストーリーポイント
```

| 順位 | 候補 | NN | Reach | Impact | Conf. | Effort | RICE | ファイル |
|---|---|---|---|---|---|---|---|---|
| 1 | 失敗理由の可視化（guardedRun一括reloadの分類） | 2026-10-06-17-fix-content-error-visibility.md | 6 | 2 | 1.0 | 1 | 12.0 | `src/entrypoints/content.ts`、`src/llm/handle-message.ts` |
| 2 | storage UUID生成のフォールバック | 2026-10-06-18-fix-storage-uuid-fallback.md | 2 | 2 | 0.8 | 0.5 | 6.4 | `src/storage.ts` |
| 3 | 設定画面のselect生成3兄弟の集約 | 2026-10-06-19-refactor-options-select-builders.md | 5 | 1 | 1.0 | 1 | 5.0 | `src/entrypoints/options/main.ts` |
| 4 | content.ts run()の純粋部品抽出 | 2026-10-06-20-refactor-content-run-extraction.md | 7 | 2 | 0.8 | 3 | 3.7 | `src/entrypoints/content.ts` |
| 5 | classifyFieldのテーブル駆動化 | 2026-10-06-21-refactor-classify-dispatch-table.md | 8 | 1 | 0.8 | 3 | 2.1 | `src/core/classify-rules.ts` |
| 6 | 設定画面のカード生成の抽出 | 2026-10-06-22-refactor-options-card-builders.md | 5 | 1 | 0.8 | 2 | 2.0 | `src/entrypoints/options/main.ts` |

### 実行順の逸脱理由

- 純 RICE 順からの逸脱なし。NN 17→22 がそのまま実行順。
- 依存による制約（スコアより優先）: NN 19 と NN 22 はともに `src/entrypoints/options/main.ts` を触るため直列とし、19 を先行させる（19 の helper に 22 が乗る形になる）。NN 17 と NN 20 はともに `src/entrypoints/content.ts` を触るため直列とし、17 を先行させる（エラー分類の境界を先に固定してから run() 抽出を行う）。

## 依存マップ（バッチ並列化の安全性）

```
バッチA（並列4件・ファイル排他）:
  17 (content.ts guardedRun + handle-message.ts) ─┐
  18 (storage.ts)                                  ├─ 互いに重なりなし
  19 (options/main.ts select builders)             │
  21 (core/classify-rules.ts)                     ┘
バッチB（直列2件・バッチAの後）:
  20 (content.ts run抽出。17 と同ファイルのため 17 の後に直列)
  22 (options/main.ts card抽出。19 と同ファイルのため 19 の後に直列。20 とはファイル非重複だが統合検証の見通しのため同バッチ内で逐次)
```

## 台帳送り候補と再検討トリガー

| 候補 | 内容 | 再検討トリガー |
|---|---|---|
| site/ 自作ビルドの責務分割 | `site/lib/` のビルド・検査・i18n 対応検査が肥大化した場合の分割 | `site/lib/` に新規ステップが2件以上追加されたとき |
| feedback issue-url の拡張 | 報告 URL 組み立ての項目追加が続く場合の builder 化 | 報告項目の追加が3回目に達したとき |

該当なし（いずれも実害なし・再検討トリガーなしではなく、次ラウンド予約なしの通常送り）。
