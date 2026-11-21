# Checking Team レビュー: work/classify-vocab-extraction

- 日時: 2026-11-21 05:28 (run-id: work-classify-vocab-extraction-20261121-052850)
- 対象: work/classify-vocab-extraction (HEAD 896dd7c) vs main (e1c43f3)
- 変更: 分類 module 語彙テーブル抽出リファクタ (+638/-438, 12 ファイル)
- 実行方式: 並列 (Wave 1: 5 観点, Wave 2: 4 クラスタ, Wave 3: Test Experts)

## 総合評価: 95/100 (ランク: S)

実行 13 観点の単純平均: red-team 95, blue-team 95, system-architect 100, maintainability 90, legacy-bridge 100, Documentation Architect 95, Tuning Expert 100, Compliance & Privacy 100, Ethics & Bias 100, API & Contract 100, Domain Logic 95, Refactoring Evangelist 95, Test Experts 69 (testing 基準)。

## 重要指摘事項（優先度順）

### [Medium] 🎯 refine 非公開化で残った到達不能な zip leftover 分岐に in-code 注記がなく、drop 理由ラベルの pin が消えた
- 指摘者: Red Team Leader, Blue Team Leader（関連 Low: Maintainability, System Architect, API & Contract Negotiator）
- 場所: src/core/classify-rules.ts:320（dropLeftovers の zip 分岐）、tests/core/classify-rules.test.ts:810-818
- 影響: 同一ラベル zip ペアの leftover unknown-化は zip split policy の exactSize-2 retag が先行するため refineClassifications 経由で到達不能。本体は残るが in-code 注記がなく、将来 policy を緩めると未検証のまま再活性化する。tel/zip leftover unknown-化は「誤った値の注入を防ぐ」最終安全網であり、fixture-first の運用に対しこの層だけ検証が迂回可能。SplitDrop の per-field from/reason pin の count 置換は診断ラベルのみの後退で許容範囲
- 対処: dropLeftovers 側に「現行 policy では合成順序で先に消費されるため到達不能。policy 変更時の保険」旨の WHY コメントを 1 行追加する（分岐の削除は行わない — 挙動不変の原則）。到達不能性の pin テストは Wave 3 の Test Experts が追加済み

### [Medium] 🎯 refineDropped のドキュメント契約と実装の計測対象が一致していない
- 指摘者: Domain Logic Expert
- 場所: src/core/classify-rules.ts:485（コメント）/ :517（実装 `refineDropped: resolved.filter((i) => !afterIds.has(i.meta.id)).length`）
- 影響: 実装は「refine 前後で id が消えた欄数」を数えており「oversized-group で落とされた欄数」を直接数えていない。今日は消失経路が drop のみで一致するが、将来 refine に別の消失経路が加わると eval 指標 (src/eval/metrics.ts) の誤読に直結する。非公開化で SplitDrop.reason が観測不能になったぶん、この集約値の重みが増している
- 対処: コメントを実測定義に一致させる（「refine で消失した欄数。現在の消失経路は oversized-group drop のみ」）。実装側の計測源変更 (dropped.length) は follow-up 候補

### [Medium] 🎯 語彙モジュールの内部専用シンボルが過剰に export され、公開面積が膨張している
- 指摘者: Maintainability Guardian, Refactoring Evangelist（関連 Low: Red Team, System Architect, Legacy Bridge）
- 場所: classify-vocab-office.ts（19 export 中 12 個が内部専用）、classify-vocab-name.ts / -birth.ts / -address.ts / -misc.ts にも同型の内部専用 export 計約 20 個
- 影響: リファクタの主眼 (classify-rules 12→8 export) に対し、新規 7 module 合計では約 20 記号が外部消費者なしで export されている。緩和境界 (officeEligible / officeKanaEligible) を構成する下位ガードが直叩き可能で、過去に繰り返し潰してきた誤注入バグの再導入経路になる
- 対処: モジュール外消費者のないシンボルから export を外す（entry 配列群、classify-rules が import する定数群、語彙横断 3 記号 BIRTH_CTX / KANA_NOTE / hasOwnDeptName は維持）。消費者は grep で実確認して判断する

### [Medium] 🎯 KANA_NOTE が所有者モジュール (name) 内で未使用になり、唯一の消費者は office 側
- 指摘者: Maintainability Guardian
- 場所: src/core/classify-vocab-name.ts:16（定義）、src/core/classify-vocab-office.ts:4,42-43（唯一の消費）
- 影響: 「語彙と matcher は同居」の原則に対し、KANA_NOTE は定義元 name モジュールで 1 箇所も使われず、office → name の依存がこの 1 定数のためだけに発生する。name 側の語彙整理が office の除外ゲートを壊しうる
- 対処: KANA_NOTE を消費者側の classify-vocab-office.ts に移す（定義を office に、name から削除、office の import を解消）

### [Medium] 🎯 新規 CONTEXT.md がどの文書からも参照されておらず、発見可能性がない
- 指摘者: Documentation Architect
- 場所: CONTEXT.md:1
- 影響: AGENTS.md も README も CONTEXT.md に言及せず、参照経路は本変更の plan ファイルのみ。語彙追加時に用語が二重定義される元の状態に戻るリスク
- 対処: AGENTS.md に 1 行追加する（ドメイン用語の定義はルートの CONTEXT.md、語彙・dispatch・refine の用語はここに従う）

### [Low]（要約）
- 🎯 リライトしたテストの describe 名にタスク ID (PBI-219) が残る — Documentation Architect（tests/core/classify-rules.test.ts:804, 875。src 側は除去済みで不揃い）
- CONTEXT.md の dispatch キット項が export 5 個のうち 4 個のみ列挙 (Matcher 欠落)、横断 import の代表例が実態とずれる — Documentation Architect
- dropLeftovers zip unknown 化デッドブランチのソース側記録なし — Maintainability（Medium 1 件目と同根）
- 🎯 refine drop の per-field 理由が公開観測から消え count のみ — API & Contract Negotiator（Medium 1 件目と同根）
- 🎯 語彙 module 間の相互 import 3 辺に循環の機械的防止がない — System Architect
- 🎯 ドメイン語彙を跨ぐ lexeme 依存が別ドメインの分類挙動を静かに変えうる — Legacy Bridge
- 🎯 vocab モジュールの全面的な export が single-owner ゲート規律を迂回可能 — Red Team（Medium 3 件目と同根）
- 🎯 新規語彙 module が plan 流儀の「full roster export」で外部消費者のない定数を多数公開 — System Architect（Medium 3 件目と同根）
- 🎯 refine 非公開化の副産物: 到達不能 zip 分岐が残存し drop の from/reason が観測不能 — System Architect（Medium 1 件目と同根）
- dispatch-kit ownLegend の gate 既定値 (`legendGate = legendExtra ?? extra`) が legend 側へ暗黙適用される — Blue Team
- matchAs(`address${addrLine[1]}` as Category) の文字列補間 cast が型保護の外 — Blue Team
- 緩和境界の WHY ナラティブが 2 ファイルに重複 — Refactoring Evangelist
- 同型の bare-name ゲート 3 件が 3 モジュールに散在し共通約束事が複製 — Refactoring Evangelist
- 🎯 抽出後も matcher 本体内に inline 正規表現リテラルが残り「module-level so no per-field allocation」契約が半端 — Tuning Expert

## コンフリクト調整結果
なし（全指摘が同一方向。相反する対処提案は見られなかった）

## コードベース構造の知見（graphify）
- classifyField() は classify-rules コミュニティのハブで、消費者は dom/detect-forms, classify-pipeline/pipeline, core/pending-split, core/planner, llm/messages 系に及ぶ。今回の変更は classifyField のシグネチャに触れておらず、外部消費者への波及は interface 縮小分 (4 記号) に限定される
- 分類語彙には密な pin テスト網 (classify-dispatch-parity, kana-blind-contract, gender-classify-contract, name-company, fax, search-box-exclusion, normalize-parity, nfkc-once, kana-memoize, kana-norm-drift) が存在し、語彙再配置の回帰網として機能した
- graph.json には過去レビューの指摘 (classify-rules degree 87 god node 指摘) がノードとして記録されており、今回の抽出はその指摘への対応と一致する
- Red Team の確認: 新規正規表現の ReDoS リスクなし (全てリテラル・線形走査)、core の DOM・LLM 非依存レイヤリング維持、LLM エグレス境界 (send-set パリティ) 不変

## 対象外としてスキップした観点
UI Expert, Accessibility Advocate, i18n Expert, SRE/Ops Specialist, FinOps Consultant, Edge & Mobile Strategist, Data Integrity Expert, DX Advocate, Supply Chain & Dependency Sentinel（関連性マップによる判断: UI・依存定義・インフラ・モバイル要素の変更なし）

## 未完了の観点
なし

## Wave 3 (Test Experts) の結果
スコア 69/100 (testing 基準)。テスト追加 2 件 (zip oversized drop の trace pin、refineDropped の retag 非算入 pin)、テスト修正 1 件 (make eval の corpus 走査テストに明示タイムアウト — 既定 5 秒で実際に赤を再現したため)。make test 3186 件緑、src/ 未変更。7 Medium 指摘のうちテスト観点からの検証は「1・2 は正しい (到達不能は pin で担保)」「3〜7 はテストでは解決せず Phase 5 の修正対象」との判定
