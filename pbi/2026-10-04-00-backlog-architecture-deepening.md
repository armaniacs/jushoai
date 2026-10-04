# バックログ台帳: アーキテクチャ深掘りラウンド 1（2026-10-04）

診断レポート: `/tmp/architecture-review-2026-10-04-0650.md`
診断ドメイン: codebase-design 語彙（module / interface / depth / seam / adapter / leverage / locality / deletion test）+ CLAUDE.md の設計の約束事との乖離

## 設計の約束事との乖離チェック（結果）

すべての宣言済み設計の約束事は維持されていた。乖離 0 件（詳細は診断レポートの表を参照）。摩擦は seam の配置と定義の散在に集中しており、本ラウンドの PBI はすべてその範囲。

## RICE スコアリング表

```
RICE = (Reach × Impact × Confidence) / Effort
Reach: 今後 1 年の保守作業での関与頻度（相対 1-10）
Impact: 3=実害解消 / 2=大きい / 1=中（重複削減・規範化）/ 0.5=小
Confidence: 1.0=コードで確定 / 0.8=設計判断が残る / 0.5=効果が不確か
Effort: ストーリーポイント
```

| # | テーマ | type | Reach | Impact | Conf. | Effort | RICE | 実行順 |
|---|---|---|---|---|---|---|---|---|
| 1 | オーバーレイ相互排他 | fix | 6 | 2 | 1.0 | 1 | 12.0 | 1 |
| 2 | isConfident 述語の集約 | refactor | 6 | 1 | 1.0 | 1 | 6.0 | 2 |
| 3 | AI 状態・メッセージ語彙の一元化 | refactor | 7 | 1 | 1.0 | 2 | 3.5 | 3 |
| 4 | オーバーレイパネルの抽出 | refactor | 6 | 1 | 1.0 | 2 | 3.0 | 4 |
| 5 | メタデータ wire 形状の一元化 | refactor | 7 | 1 | 1.0 | 2 | 3.5 | 5 |
| 6 | FieldClassifier seam の core 移動 | refactor | 5 | 1 | 1.0 | 2 | 2.5 | 6 |

### 実行順の逸脱理由

- #5（RICE 3.5）が #4（RICE 3.0）より低い順位に配置されている: `src/messages.ts` の競合回避が目的。#3 と #5 は両方 messages.ts を触るため、#3 をバッチ 1・#5 をバッチ 2 に分離した結果、RICE 順を 1 つ譲った。
- 同点は「リスク軽減 → 緊急性」の順で解消（該当なし）。

## 依存マップ（バッチ並列化の安全性）

```
#1 (content.ts)              ┐
#2 (classify-rules/analyze/  ├─ バッチ 1: 並列 4 件（ファイル排他）
    detect-forms)            │
#3 (messages/ai-types/       │
    http-classifiers/        │
    background)              │
#4 (preview/ai-guide)        ┘
#5 (messages/background-gateway/classifier)  → バッチ 2（#3 の後）
#6 (core 移動・analyze/classifier/gateway/http-classifiers) → バッチ 3（#2・#5 の後）
```

- #3 と #5: `src/messages.ts` 重複 → 直列（#3 先行）
- #2 と #6: `src/analyze.ts` 重複（#2 が編集、#6 が移動）→ 直列（#2 先行）
- #5 と #6: `src/llm/classifier.ts` 重複 → 直列（#5 先行）
- #4 と #1: ファイル非重複だが #4 は挙動不変リファクタのため、#1（挙動変更）を先に置く

## 台帳送り候補と再検討トリガー

| 候補 | 内容 | 再検討トリガー |
|---|---|---|
| content.ts run() の抽出 | `src/entrypoints/content.ts:24-94` の実行オーケストレーション（状態取得 → 分類 → plan → preview 接続）を依存注入型モジュールへ抽出しテスト可能にする | run() 領域（プレビュー経由の注入フロー）でバグが多発したとき。現状は classifyAll / planner / applyPlan に面白いロジックが抽出済みで、残りは wiring のみ |
| overlay 単一スロットの構造化 | パネルの相互排他を content.ts の命令的 close から ui/ の coordinator に移す | PBI 01・04 完了後に overlay の種別が 3 つ以上に増えたとき |

## 乖離チェックの証拠（診断レポート要約）

| 約束事 | 判定 | 証拠 |
|---|---|---|
| LLM は分類だけ、値は作らない | 維持 | 値は `core/planner.ts` のみ。LLM 出力は `Map<string, Category>` |
| `core/` 純粋 | 維持 | core 配下の import は core 内のみ |
| degrade 経路 | 維持 | `src/analyze.ts:17-23`、`src/llm/background-gateway.ts:69-77`、`src/llm/handle-message.ts:114-122` |
| プレビュー経由・上書きなし・切り詰めなし | 維持 | `src/core/planner.ts:99-105`、`src/dom/apply-plan.ts:29-32` |
| ネイティブ setter | 維持 | `src/dom/fill.ts:5-10` |
| closed Shadow DOM + textContent | 維持 | `src/ui/host.ts:6`、src/ 全体に innerHTML なし |
| Prompt API は SW から | 維持 | Content Script は `BackgroundClassifier` のみ |
| API キー AES-GCM + background だけが復号 | 維持 | `decryptSecret` は `loadAiSecrets` のみ、呼び出し元は background deps |
