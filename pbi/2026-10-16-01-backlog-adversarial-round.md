# ラウンド: adversarial-code-review結果のPBI化（2026-10-16）

`git diff HEAD`（34ファイル・560挿入）を対象に、ハッカー視点×保守担当者視点の8並列レビュー＋独立反証を経て残った指摘をPBI化し、RICEで優先度付けした。

推定前提（全候補共通）: ユーザ向け＝月間影響100件基準、開発向け＝月間タッチ5件基準、Effortは人月。依存による入替あり（97→94、95→98）。

## 最終順位

| 順位 | PBI | RICE | 内訳 (R/I/C/E) | 根拠 |
|------|-----|------|----------------|------|
| 1 | 2026-10-16-94-fix-fill-banner-false-positive.md | 1600 | 100/1/80%/0.05 | 全充填に影響する誤報で最高スコア。97の後に実施 |
| 2 | 2026-10-16-95-fix-panel-dialog-labelling.md | 320 | 10/2/80%/0.05 | a11y機能不全。反証SURVIVES |
| 3 | 2026-10-16-96-fix-kana-nearby-misattribution.md | 250 | 50/1/50%/0.1 | 誤データ提出に直結 |
| 4 | 2026-10-16-97-fix-fill-robustness.md | 188 | 30/1/50%/0.08 | 無音全損・誤適用防止。94の前提 |
| 5 | 2026-10-16-98-fix-panel-focus-lifecycle.md | 125 | 30/0.5/50%/0.06 | 誤操作・リーク予防。95の後に実施 |
| 6 | 2026-10-16-99-fix-apply-persist-skew.md | 63 | 20/0.5/50%/0.08 | 再試行可能性の土台 |
| 7 | 2026-10-16-100-fix-settings-save-robustness.md | 42 | 5/1/50%/0.06 | 稼働設定の巻き添え防止 |
| 8 | 2026-10-16-101-fix-provider-resilience.md | 40 | 5/1/80%/0.1 | auth自己ロック等の可用性 |
| 9 | 2026-10-16-102-sec-egress-toctou.md | 38 | 5/3/50%/0.2 | セキュリティ旗（引き上げ可）。反証SURVIVES Medium |

## 実施順

97 → 94 → 95 → 98 → 96 → 99 → 100 → 101 → 102（依存を考慮。97と95は無関係のため並列可だが同一セッションでは直列実施）

## 却下・見送り（反証により不採用）

- LLMへのプロファイル値送信（`toWireMeta`/`sanitizeField value:''`で射影あり・3経路確認）
- LLM出力の無検証採用（`parseLlmOutput`/`parseClassifyResult`にCATEGORIES allowlistあり）
- hidden欄へのautocomplete注入（scan除外・`isHidden`除外で到達不能。off-screen残差はPBI化せず注意のみ）
- 接続テスト連打の課金DoS（background到達経路なし・自己課金のみで却下）
- 監査ログ平文（メタデータのみの設計通り）
- kana二重API・メモ化・空配列クラッシュ3件（戻り値使用中・到達不能で却下）
- mountAiSection戻り値無視（本番単発＋自己消滅タイマーで実害なし）
- fill/DOMハッカー視点チャンク1件は長時間応答なしのため中断。保守担当者側の同範囲10件で代替し、欠測として記録する
- AI残余仮説（compat二重送・ポート過剰・origin粒度・DoH過剰）は未反証のため断定せず見送り
- 些末3件（`Math.max(1,…)`表示・aria-live 4秒復帰・FILL_RESULTS型注記）は個別検証を省き PBI-97/98 内で吸収または放置

## コードレビュー指摘の追完（2026-10-16）

`/code-review` で未コミット差分全体を再読し、以下を修正・`make check` green で確認した：

- PBI-96の残存誤爆: legend側の短い読み（セイ・メイ・せい・めい）も除外（`作成してください`・`制度のご案内` が反転しないことをテストで固定。欄所有側は維持）
- PBI-100の空origin誤警告: `origins.length === 0` のrollback早期return＋テスト追加
- PBI-97のradio同値衝突: 接続済み優先選択＋テスト追加、欄例外のdebug記録
- コメント類: panelのtry/catch・aria-label注意・compat usable定義・バナー分率・RegistryMemory外部seed注意
