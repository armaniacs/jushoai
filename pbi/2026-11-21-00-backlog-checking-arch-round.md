# ラウンド台帳: checking-team + アーキテクチャ発見の PBI 化 (2026-11-21)

## 出どころ

1. **checking-team 2026-11-21 ラウンド** (13 観点実行・スコア 95/100・High 0 / Medium 5 / Low 約 13)。レポート: `plans/2026-11-21-0528-review-classify-vocab-extraction.md`。Medium 5 件は同ラウンド内の Phase 5 で修正済み (d4a8177)。本ラウンドは残った Low と SDD 最終レビューの deferred を起票。
2. **アーキテクチャレビュー 2026-11-20** (improve-codebase-architecture・6 候補)。候補 1 (語彙テーブル抽出) は同日 SDD で実装済み (work/classify-vocab-extraction ブランチ)。残り候補 2-6 を起票。
3. **SDD classify-vocab extraction ラウンド最終レビュー**の deferred 3 件 (タスク ID コメント一括除去・語彙横断借用の文書化・COMMENT 桁溢れ)。

## 起票インベントリ (RICE 順・連番は実施予定順)

| 順位 | PBI | タイトル | 出どころ | RICE |
|---|---|---|---|---|
| 1 | 246 | messages.ts を wire codec に戻す (失敗語彙・表示定数の移設) | アーキ候補 4 | 85 |
| 2 | 247 | content-session facade を剥がす | アーキ候補 5 | 80 |
| 3 | 248 | messaging 衛生 (open-options codec 経由化 + decode 1 回化 + alias 撤去) | アーキ候補 6 | 75 |
| 4 | 249 | レビュー発見の規約整合 (タスク ID・CONTEXT.md・コメント桁) | checking-team + SDD deferred | 70 |
| 5 | 250 | 語彙 module の import 方向を機械検査に載せる | checking-team System Architect | 55 |
| 6 | 251 | bare-name ゲート 3 件の共有述語統合 | checking-team Refactoring | 45 |
| 7 | 252 | run() の脊髄を startRun module として深化 | アーキ候補 2 (Strong) | 40 |
| 8 | 253 | 除外クイック登録の配線を dismiss-flow module に抽出 | アーキ候補 3 | 35 → 残置 (着手条件発火型に格下げ、下記深掘り参照) |
| 9 | 254 | 緩和境界の WHY コメントを office に単一所有させる | checking-team Refactoring | 25 |
| 10 | 255 | matcher 本体の inline 正規表現を module-level 定数に監査・寄せ | checking-team Tuning | 22 |
| 11 | 256 | address カテゴリ構築を型保護に載せる | checking-team Blue Team | 20 |
| 12 | 257 | ownLegend の legend 側ゲート既定値を明示化 | checking-team Blue Team | 18 |
| 13 | 258 | refineDropped の計測源を dropped 数に寄せる | checking-team Domain Logic (M2 の実装側) | 15 |

INVEST: 各 PBI は独立 (相互依存なし・着手順自由)、実装詳細は negotiable、単独で保守価値を提供、grep 可能な現状で estimable、1 スプリント以内、受け入れ基準で testable。Outside-In で pin 先行が可能 (eval corpus + 既存 pin 網が保護網)。

## 対応不要の判断記録 (個別 PBI 化しない)

1. **refine drop の per-field 理由 ({from, reason}) が公開観測から消えた件** — refine 3 つ組の非公開化 (候補 1 実装 Task 4) による意図的な交換。公開 interface から到達不能な分岐の pin (tests/core/classify-rules.test.ts に Wave 3 が追加) と trace の refineDropped count が実効性を担保する。per-field 診断が必要になったら再公開ではなく trace の拡張で対応する (既存テストの pin が維持条件)。
2. **語彙横断の lexeme 依存 (office→birth の BIRTH_CTX、school→office の hasOwnDeptName) が別ドメインの分類挙動を変えうる件** — 実装計画の制約 5 が公式に許可する seam であり、正規表現本体はバイト同一運用・変更時は eval corpus pin が回帰を検出する。機械検査の要否は 250 (import 方向の層検査) に部分吸収。語彙横断借用の文書化は 249 (CONTEXT.md 例修正) に含む。

## 同ラウンド内で解消済み (起票不要の確認記録)

- 過剰 export 30 シンボルの内部化・KANA_NOTE の office 移設・CONTEXT.md 参照経路 (AGENTS.md 1 行)・refineDropped コメント契約・zip 死枝の in-code 注記 — d4a8177
- zip oversized drop の trace pin・refineDropped retag 非算入 pin・eval 走査タイムアウト — 671c241

## 関連情報

- 関連性マップでスキップされた観点 (UI・Accessibility・i18n・SRE・FinOps・Edge&Mobile・Data Integrity・DX・Supply Chain) の判断根拠はレポート参照。
- 検証: 全 PBI 共通で `make check` 緑 + `make eval` 3 passed (pin 不変)。挙動変更を伴う PBI (252, 253, 258) は fixture 先行の TDD。
- 台帳運用: 各 PBI 完了後に `pbi/archived/` へ移動し 00-INDEX.md に記録 (従来慣行どおり)。

## 深掘りセッション — 2026-11-21 (deep-dig)

### 挑戦した仮定

| 仮定 | リスク | 検証結果 | 決定 |
|------|--------|----------|------|
| 247: facade は削除だけでよい (全メソッド委譲) | 高 | **誤り判明** — SessionPanel / SessionClassifyResult の型定義が content-session.ts:86 に住み、preview-bind・run-env・tests 4 ファイルが import。実行時 caller は content.ts:378 の 1 箇所のみ | 型だけを src/content/fill-types.ts に分離してから削除 (ユーザー確定) |
| 250: oxlint 設定で実現可能 | 高 | repo には oxlint 設定ファイルが不在 (`npx oxlint --deny-warnings` の defaults のみ) | .oxlintrc.json を導入し no-restricted-imports 1 ルールから始める (ユーザー確定) |
| 252: RunEnvDeps 25+→約10 が 0.4人週で可能 | 高 | 未検証の最大タスク | スパイク先行 (1 日で移動対象一覧・deps 分類・gate 不変条件の現状・deps 縮小不可時の割り切り案を出し、着手を判断) (ユーザー確定) |
| 246: 失敗語彙の移設先 | 高 | 消費者 8 module・META_CLIP_LENGTH 消費者・classifier コメントを確認済み | なぜなぜ分析 30 本 (10 項目 × 3 立場) で A (core/classifier-failures.ts 新設) を導出・確定 (ユーザー確定)。分析: `plans/2026-11-21-whywhy-246-messages-vocab.md` |
| 253: 除外 PBI のたびに 2 ファイルを触る頻度前提 | 中-高 | 頻度 12 変更/300 コミットは終息した除外波 (227-244) を反映。次の除外系 PBI は未定 | 着手条件発火型に格下げ (着手条件: 次の除外系 PBI が起票されたら。その際 RICE 再採点) (ユーザー確定) |
| 255: matcher 本体に inline 正規表現が残る | 高 | **真** — /部署名/ (office:38, 60)・/役職/・/部署/ (office:73) が eligibility ガード本体に存在。正規表現リテラルは評価のたびに新 RegExp を生成するため per-field 割当が実在 | PBI は監査先行のまま・現状確認に 3 箇所を記載して更新 |
| 258: dropped.length で refineDropped と同値 | 高 | **真** — dropped.push は group ループで 1 欄 1 push (fieldId 毎) なので dropped.length = 落とした欄数 | PBI の落とし穴 (1 欄が複数 SplitDrop に跨る曖昧性) は解消済みとして更新 |

### 新たに発見したリスク
- 247 の型移設で fill-types.ts が 1 個増える。252 で run-env を再編する際、SessionPanel 系の所属が再び動く可能性 (fill-types を中間着として 252 で最終判断)。
- 250 の .oxlintrc.json 導入は repo 初の lint 設定ファイルであり、oxlint の defaults との併用挙動 (設定ファイル有無で警告数が変わらないか) を最初に確認する必要がある。
- 252 のスパイクで deps 縮小 (25+→約10) が実現不能と判明した場合、gate 集約だけ (interface 広域は維持) に縮小する割り切り案をスパイクの成果物に含めること。

### 未解決の疑問
- なし (252 の割り切り判断はスパイク成果物として着手時に出すよう PBI に記載済み)

### 決定事項
1. PBI-246: 移設先は src/core/classifier-failures.ts 新設 (なぜなぜ分析 30 本の導出案をユーザー確定)
2. PBI-247: 型だけ src/content/fill-types.ts に分離してから facade 削除
3. PBI-250: .oxlintrc.json を導入 (no-restricted-imports 1 ルールから)
4. PBI-252: スパイク先行 (着手判断をスパイクに含める)
5. PBI-253: 着手条件発火型に格下げ (着手条件: 次の除外系 PBI 起票時)
6. PBI-255 / 258: 事実検証の結果を PBI に反映 (255 はリテラル 3 箇所確定、258 は落とし穴解消)

