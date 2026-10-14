# PBI: アーキテクチャレビュー指摘 5 件（2026-10-14 深化機会ラウンド）

状態: 未着手（2026-10-14 の improve-codebase-architecture 判定全件を PBI 化）
起票日: 2026-10-14

## 背景

アーキテクチャレビュー（codebase-design 語彙：module・interface・depth・seam・adapter・leverage・locality、deletion test＋「interface is the test surface」適用）で判定した深化機会 5 件を PBI 化した。ホットスポット誘導（`content.ts` 578行・7接触、`classify-rules.ts` 436行、`settings.ts` 287行、`http-classifiers.ts` 274行、`audit-log.ts` 263行）。候補リストと順位はユーザー確認済み。なお本リポジトリに `CONTEXT.md`・`docs/adr/` は存在しないため、既存 ADR との衝突はない。

## 優先度一覧（確定順位）

| 順位 | PBI | RICE | 内訳 (Reach/Impact/Conf/Effort人週) | 根拠・依存 |
|---|---|---|---|---|
| 1 | `2026-10-14-59-refactor-kana-module.md` | 240 | 30 / 2 / 80% / 0.2 | 最安で分類修正の高頻度領域に効く。依存なし（60 と並列可） |
| 2 | `2026-10-14-60-refactor-fill-session.md` | 160 | 50 / 2 / 80% / 0.5 | 最ホットファイルの不可視テスト領域を打開。依存なし（59 と並列可） |
| 3 | `2026-10-14-61-refactor-provider-registry.md` | 53 | 20 / 1 / 80% / 0.3 | grill 済み（5問全問で推奨案採択）。62 の前提 |
| 4 | `2026-10-14-62-refactor-classifier-trace.md` | 27 | 10 / 0.5 / 80% / 0.15 | 61 の作る seam に収まる整理。依存：61 の後 |
| 5 | `2026-10-14-63-refactor-settings-save.md` | 6 | 5 / 0.5 / 50% / 0.2 | 低頻度のため Speculative のまま最後。依存なし |

フレームワーク：RICE を主軸（`(Reach × Impact × Confidence) / Effort`）。依存はスコアより優先して順序に反映済み。同点なし。

## なぜなぜ分析の要点

- 疑問は1件のみ：「順位2の工数リスク」。なぜ重いか→`main()` 閉包が7ヘルパーを絡める。なぜ80%か→gate系は注入可能 seam として抽出済み・session 境界は特定済み。解：Effort 0.5 で session-first 分割。これで行動可能（PBI化）のためユーザー質問なしで解消。
- 「なぜ順位1が先か」→かな判定は純粋関数・表テスト化で最安、かつ日本式フォームの分類修正は高頻度。表面的な「大きい順」ではなく「安く効く順」が本当の基準のため 59→60 の順。
- 「なぜ61が62の前提か」→trace 返り値化は `AuditedClassifier` の読取り timing を変える。registry がラップ所有権を握ってからでないと両 PBI が同ファイルを競合するため。

## 着手順

59 → 60（59 と並列可、ファイル独立）→ 61 → 62（61 の後）→ 63。59 と 60 は core／entrypoints で独立しているため並列着手可。61 と 62 は `audited-classifier.ts` を共有するため直列。

## 受け入れ基準（ラウンド完結）

- [ ] 5 件の個別 PBI が `pbi/` に存在する（59〜63）
- [ ] 本ファイルが `pbi/` に存在する（64）
- [ ] `pbi/00-INDEX.md` の進行中に 6 件が登録される
- [ ] 5 件の実装が完了し、各 PBI の実施記録にコミットを記載する

## テスト戦略

- 本ラウンド自体のテストなし（文書作業）。各 PBI のテスト戦略に従う。

## Definition of Done

- [ ] 全 5 件＋本台帳がユーザーに提示され、順位の合意が取れている
- [ ] コードレビュー完了
