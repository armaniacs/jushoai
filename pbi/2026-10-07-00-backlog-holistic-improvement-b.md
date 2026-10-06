# バックログ台帳: 大局的改善ラウンド2（2026-10-07）

診断出所: holistic-code-review 報告書（2026-10-07、本ラウンド内で生成。診断ドメインは DRY / SoC / 拡張性 / 堅牢性）
過去台帳との関係: `2026-10-04-00-backlog-architecture-deepening.md` の6テーマ、`2026-10-06-00-backlog-japanese-polish.md` の3件、`2026-10-06-00-backlog-holistic-improvement.md` の6件はすべて閉じたため差分スコープにより再レビュー対象外。前回台帳送り2件（site分割・feedback builder化）の再検討トリガーはいずれも未発火（`site/lib/` への新規ステップ追加なし、報告項目の追加なし）のため今回も送り継続とする。

## RICE スコアリング表

```
RICE = (Reach × Impact × Confidence) / Effort
Reach: 今後1年の保守作業での関与頻度（相対 1-10）
Impact: 3=実害解消 / 2=大きい / 1=中 / 0.5=小（混乱削減・文書化）
Confidence: 1.0=コードで確定 / 0.8=設計判断が残る
Effort: ストーリーポイント
```

| 順位 | 候補 | NN | Reach | Impact | Conf. | Effort | RICE | ファイル |
|---|---|---|---|---|---|---|---|---|
| 1 | 400/422→rejected 判定の集約 | 2026-10-07-01-fix-http-rejection-mapping.md | 4 | 1 | 1.0 | 0.5 | 8.0 | `src/ai/http-classifiers.ts`、`src/llm/handle-message.ts` |
| 2 | 報告IssueのFB文言残存の除去 | 2026-10-07-02-fix-feedback-fb-wording.md | 3 | 0.5 | 1.0 | 0.5 | 3.0 | `src/feedback/issue-url.ts`、site 日英・tests |
| 3 | メタデータ切り詰め80文字の集約 | 2026-10-07-03-refactor-meta-clip-policy.md | 3 | 1 | 0.8 | 0.5 | 4.8 | `src/llm/classifier.ts`、`src/feedback/issue-url.ts` |
| 4 | mountAiSection の抽出 | 2026-10-07-04-refactor-options-ai-section.md | 5 | 1 | 0.8 | 2 | 2.0 | `src/entrypoints/options/ai-section.ts` |

### 実行順の逸脱理由

- 純 RICE 順では T2（4.8）が T1（3.0）より先だが、T1 と T2 はともに `src/feedback/issue-url.ts` を触るため依存優先で T1 を先行させる。最終順は T3 → T1 → T2 → T4。

## 依存マップ（バッチ並列化の安全性）

```
バッチA（単独）: 01（T3。handle-message に触るため単独で先行し、既存テストの期待値更新を含める）
バッチB（単独）: 02（T1。issue-url.ts の文言のみ）
バッチC（単独）: 03（T2。02 と同ファイルのため 02 の後に直列）
バッチD（単独）: 04（T4。他と重なりなしだが規模 M のため単独）
```

いずれも対象ファイルが異なるため並列化は可能だが、01・02・03 は小粒で査読コストが低いため統合側が逐次処理する（バッチ計画に明記。速度だけの差であり PBI 毎コミットは維持する）。04 のみ規模 M のためサブエージェントに委ねる。

## 台帳送り候補と再検討トリガー

| 候補 | 内容 | 再検討トリガー |
|---|---|---|
| site/ 自作ビルドの責務分割 | `site/lib/` のビルド・検査・i18n 対応検査が肥大化した場合の分割 | `site/lib/` に新規ステップが2件以上追加されたとき |
| feedback issue-url の拡張 | 報告 URL 組み立ての項目追加が続く場合の builder 化 | 報告項目の追加が3回目に達したとき |
