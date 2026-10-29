# バックログ: アーキテクチャ改善ラウンド5（2026-10-30）

ラウンド4適用後の新規摩擦13件をRICE採点し、実装順を確定する。深掘り（5 Whys・隠れた前提・リスク・最大の落とし穴）は2体の探索者と2体の深掘り分析者が実読で実施済み。HTML報告書は OS テンポラリ（architecture-review-20261030-0425.html）。

| 順位 | PBI | スコア | 根拠・依存 |
|---|---|---|---|
| 1 | [190](2026-10-30-190-refactor-decode-table.md) | 112 | 表は既在・機械的。wire型追加のたびに効く。依存なし。最初に着手 |
| 2 | [191](2026-10-30-191-refactor-timed-call.md) | 80 | 16行逐語複製が実在。193の前提。依存なし |
| 3 | [192](2026-10-30-192-refactor-registry-outcome.md) | 64 | auth記帳3箇所→1折り畳み。test()非対称はテスト未固定。依存なし |
| 4 | [193](2026-10-30-193-refactor-chunk-run-owner.md) | 53 | テスト3重化が実在。191の後に着手（同ファイル）。帰属決定が最初の决策 |
| 5 | [194](2026-10-30-194-refactor-trial-apply.md) | 32 | 片側/両側の差は引数に落ちる。単体parityで固定。依存なし |
| 6 | [195](2026-10-30-195-fix-section-boot.md) | 27 | 実在のunhandled rejection＋空白UI。auditが正解前例。依存なし |
| 7 | [196](2026-10-30-196-refactor-guide-nav-sync.md) | 24 | 遷移所有者からガイドへ一方向。循環importはコールバック注入で回避。依存なし |
| 8 | [197](2026-10-30-197-refactor-kanakind-owner.md) | 20 | 冪等重複の除去＋staleコメント是正。193と同バッチ可。依存なし |
| 9 | [198](2026-10-30-198-refactor-legacy-wrap.md) | 15 | 2行削除・同値実証済み。193と同バッチ。依存なし |
| 10 | [199](2026-10-30-199-refactor-kana-evidence.md) | 15 | 否決条項の非対称を名前のある分岐に。挙動不変の合成。依存なし |
| 11 | [200](2026-10-30-200-refactor-e2e-read-seam.md) | 11 | 5 reader＋セレクタ辞書44出現。検証に実ブラウザe2eが要る。依存なし |
| 12 | [201](2026-10-30-201-refactor-tab-scope-memory.md) | 8 | 安全性規律のlocality。one-shot snapshot意味の保持が条件。依存なし |
| 13 | [202](2026-10-30-202-backlog-tab-send-seam.md) | 5 | Speculative。文言区分の崩れリスクが残るため残置。依存なし |

RICE = (Reach × Impact × Confidence) / Effort。Effortは人月。詳細の内訳は各PBIファイルの優先度節を参照。

実装バッチ（ファイル重複に基づく）:
- バッチ1: 190（messages.ts 単独）
- バッチ2: 191 → 193 → 198 → 197（classify-transport / background-gateway / pipeline / kana / analyze の連鎖、直列）
- バッチ3: 192（provider-registry 単独、バッチ2と並列可）
- バッチ4: 195 → 196（options sections、PBI-168と直列）
- バッチ5: 194（options main.ts）
- バッチ6: 201（content.ts + src/content/）
- バッチ7: 199（kana.ts、バッチ2の後）
- バッチ8: 200（tests/e2e、実ブラウザe2eが実行できる場合のみ）
- 残置: 202（着手条件: 次のタブ宛てアクション追加時）
