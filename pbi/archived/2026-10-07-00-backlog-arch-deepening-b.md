# バックログ台帳: arch深掘りラウンド（2026-10-07）

診断出所: `/tmp/architecture-review-20261007.md`（arch-delivery-loop Phase 0。切り口はモジュールの深さ・seam・CLAUDE.md約束事との乖離で、`holistic-code-improvement` の DRY/SoC ドメインとは重ねない）
過去台帳との関係: 2026-10-04 / 2026-10-06 / 2026-10-07b の全テーマは閉じたため差分スコープで除外。約束事の乖離は検出なし（core純粋・LLM分類のみ・プレビュー経由・native setter・Shadow DOM・background経由・鍵復号範囲のいずれも維持）。
台帳送り継続: site分割・feedback builder化（いずれも再検討トリガー未発火）。

## RICE スコアリング表

```
RICE = (Reach × Impact × Confidence) / Effort
```

| 順位 | 候補 | NN | Reach | Impact | Conf. | Effort | RICE | ファイル |
|---|---|---|---|---|---|---|---|---|
| 1 | AnalyzeResponse reason の union 化 | 2026-10-07-05-fix-analyze-reason-union.md | 4 | 1 | 1.0 | 0.5 | 8.0 | `src/messages.ts`、`src/entrypoints/content.ts`、`src/entrypoints/popup/main.ts` |
| 2 | 送信上限 30/20/60 の契約コメント | 2026-10-07-06-docs-classify-caps-contract.md | 2 | 0.5 | 1.0 | 0.5 | 2.0 | `src/messages.ts`、`src/llm/background-gateway.ts` |
| 3 | nav hash 読みの helper 抽出 | 2026-10-07-07-refactor-nav-hash-helper.md | 2 | 0.5 | 1.0 | 0.5 | 2.0 | `src/entrypoints/options/nav.ts` |

### 実行順の逸脱理由
なし（RICE 降順どおり。2位と3位は同点だが別ファイルで依存なしのため順位どおり逐次実行する）。

## 依存マップ
3件とも触るファイルが重ならない。いずれも0.5ptの小粒のため、統合側が逐次実装する（サブエージェントの起動コストが割に合わないため。PBI 毎コミットは維持する）。
