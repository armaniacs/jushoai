# VulnHunter 監査結果の対応バックログ（2026-10-10）

出典: `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/`（VulnHunter セキュリティ監査。確定脆弱性 1 件 + 誤検出から Code Quality として記録された 5 件 + dev ツールチェーン CVE）

確定順位に基づき、個別 PBI は連番付きで作成済み。ファイル名の `NN` が着手順。

## 優先順位表（RICE）

| 順位 | 候補 | PBI ファイル | スコア | 種別 | 根拠 | 依存 |
|---|---|---|---|---|---|---|
| 1 | label/placeholder の cap 追加（二次正規表現の増幅除去） | `2026-10-10-01-fix-scan-text-cap.md` | 40.0 | fix | 全ユーザー・全走行に効く 1 行相当のハードニング | なし |
| 2 | `AUTOCOMPLETE` ルックアップの hasOwn 化（TypeError による分類ラン中止を解消） | `2026-10-10-02-fix-autocomplete-proto-lookup.md` | 20.0 | fix | 機構は実証済み・2 行相当の修正で効果確実 | なし |
| 3 | 監査バイト予算を TextEncoder バイト長で計上 | `2026-10-10-03-fix-audit-byte-budget.md` | 12.0 | fix | CJK 主体の本拡張でクォータ超過が現実的に到達しうる | なし |
| 4 | VULN-001 修正（Base URL の DNS 解決とダイヤル時の再チェック） | `2026-10-10-04-fix-egress-dns-validation.md` | 6.67 | fix | 唯一の確定脆弱性（Medium, CWE-918/367, エクスプロイト実証済み）。Effort 最大 | なし |
| 5 | プロバイダ応答の有界読み取り | `2026-10-10-05-fix-provider-response-bound.md` | 4.0 | fix | SW 一時 OOM の防止。BYO 契約上の影響は限定的だが防御は安価 | なし |
| 6 | 監査ログのクロスコンテキスト RMW 競合修正 | `2026-10-10-06-fix-audit-cross-context-race.md` | 1.0 | fix | 発生頻度低・攻撃能力なし。単一コンテキスト集約か version/CAS が必要 | なし |
| 7 | dev ツールチェーン CVE の追跡・評価 | `2026-10-10-07-backlog-dev-toolchain-cves.md` | 0.25 | backlog | node-forge/shell-quote は dev のみ・出荷外。上流更新待ち | なし |

## 採点の前提

- Reach: 期間（拡張機能のアクティブ利用 1 か月）あたりの相対到達率（1〜100）。全候補を同じ基準で推定
- Impact: 3=圧倒的 / 2=大きい / 1=中 / 0.5=小 / 0.25=極小
- Confidence: 推定への確信度。監査で機構が検証済みの項目は高め
- Effort: 人日換算のポイント。全候補を同じ規模感で見積もり
- 依存関係: 候補間の依存なし（順位 = スコア順そのまま）

## 監査結果との対応

| 監査の出典 | PBI |
|---|---|
| VULN-001（確定脆弱性, Medium, CWE-918/CWE-367） | 04 |
| Code Quality #1（監査 RMW 競合） | 06 |
| Code Quality #2（バイト予算の文字数計上） | 03 |
| Code Quality #3（応答の無制限バッファリング） | 05 |
| Code Quality #4（AUTOCOMPLETE プロトタイプルックアップ） | 02 |
| Code Quality #5（二次時間正規表現の増幅） | 01 |
| README の依存 CVE 推奨（npm audit 6 件） | 07 |

緩和済みで対応不要と判断した項目: TSV 数式インジェクション（CWE-1236 — `escapeTsvField` がシンクをカバー、監査で検証済み）
