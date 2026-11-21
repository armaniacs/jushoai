# 実装計画: PBI-246 messages.ts を wire codec に戻す (2026-11-21)

## 背景と目的

PBI: `pbi/2026-11-21-246-refactor-messages-vocab-split.md`。messages.ts (358 行・export 36) に失敗語彙 (ClassifyFailure / TestFailure / fold 群) と表示定数 (META_CLIP_LENGTH) が混住し、8 module が wire 経由で失敗語彙を import している。なぜなぜ分析 30 本 (`plans/2026-11-21-whywhy-246-messages-vocab.md`) の導出により、失敗語彙の移設先は **src/core/classifier-failures.ts 新設** と確定済み。wire 形式は不変。

## 実測に基づく移設対象 (2026-11-21 時点)

**移設 (失敗語彙)**: `TEST_FAILURES` (内部 const・14 行) / `TestFailure` (16) / `CLASSIFY_FAILURES` (内部 const・25) / `ClassifyFailure` (27) / `asClassifyFailure` (311・依存は core/literals のみ) / `decodeErrorToClassifyFailure` (246・三項演算子本体で param を string に広げても挙動不変。本番未使用で mapping pin テスト tests/llm/classify-transport.test.ts:173-175 のみが消費)

**移設 (表示定数)**: `META_CLIP_LENGTH` (142・export const) — 移設先は src/llm/prompt.ts (第一消費者・clip の起源)。feedback/issue-url.ts は llm/prompt から import する (feedback → llm の新規 edge は受容リスクとして report に記録)

**残留 (wire codec)**: envelope / versioning / builders / encodeFieldMeta / decodeFieldMeta / decodeRequestResult / decodeRequest / RequestDecodeError / isLegacyClassifyFailure (wire 判定・classify-transport.ts:103 が消費) / 応答 parser 群 / ClassifyResponse / TestResponse (型の基底を core-failures の語彙に付け替え)

**bridge の在処**: `decodeErrorToClassifyFailure` は core-failures へ移設 (PBI 受け入れ基準どおり)。messages 側の wire parser が失敗語彙のメンバーシップ判定に使うため、core-failures には述語 `isClassifyFailure` / `isTestFailure` も新設する (配列自体は core-failures 内部に留め、生配列は export しない)

**消費者マップ (張り替え対象)**:
- 失敗語彙: src/ui/ai-guide.ts (型) / src/classify-pipeline/pipeline.ts (asClassifyFailure + 型) / src/llm/background-gateway.ts (型) / src/llm/provider-registry.ts (asClassifyFailure + 型) / src/content-session.ts (型) / src/content/tab-scope.ts (型) / src/content/fill-flow.ts (型) / src/content/preview-bind.ts (型) / src/ai/failure-text.ts (型) / tests/llm/failure-priority.test.ts (asClassifyFailure) / tests/ai/failure-text.test.ts (型) / tests/content-session.test.ts (型) / tests/llm/classify-transport.test.ts (decodeErrorToClassifyFailure)
- META_CLIP_LENGTH: src/feedback/issue-url.ts / tests/feedback/issue-url-exposure.test.ts

## PBI 数値目標の整合 (計画段の訂正)

PBI 受け入れ基準の「export が約 15 個以下」は、失敗語彙が 5 シンボル (型 2・関数 2・定数 1) である実測に対する見積り誤り。codec 自身の面 (envelope・builders・encode/decode・応答 parser・応答型) は PBI の解 (messages は envelope + codec に縮小) に照らして正当に残留し、実測は約 31 export になる。本計画では検証可能な基準を「messages.ts から失敗語彙 6 シンボル (内部 const 2 を含む) + META_CLIP_LENGTH が消え、re-export も撤去されている」とし、実測 export 数を report に記録する。PBI の該当行は完了時に訂正する (deviation 記録)。

## Global Constraints (全タスクに適用)

1. **wire 形式不変**: AI_REQUEST_VERSION・REQUEST_WIRE_KEYS 表・encode/decode の挙動は 1 文字も変えない。tests/messages.test.ts は無変更で緑。
2. **挙動不変**: 失敗語彙の定数値・順序・asClassifyFailure の fold 意味論 (unknown → 'bad-response') は不変。tests/llm/failure-priority.test.ts が pin。`make eval` 3 passed。
3. **依存方向**: src/core/classifier-failures.ts は messages / llm / ai を import しない (core → core のみ)。messages → core/classifier-failures は許可。core 純粋性 (DOM・LLM 非依存) 維持。
4. **コメント・識別子は英語**・非自明な WHY のみ・タスク ID を書かない。移設する日本語コメント (233-236・242-245・19-24 等) は英語に訳して運び、意味を変えない。
5. **コミット規約**: Conventional Commits 日本語・ファイル個別 add・push しない。
6. **完了条件**: `make check` 緑 + `make eval` 3 passed。反復中は focused vitest、コミット前に make check を 1 回。

## Task 1: classifier-failures.ts 新設 + 失敗語彙移設 (re-export 経由)

1. src/core/classifier-failures.ts を新設し、`TEST_FAILURES` / `TestFailure` / `CLASSIFY_FAILURES` / `ClassifyFailure` / `asClassifyFailure` を verbatim 移設 (WHY コメント 19-24・305-310 を英語化して運ぶ)。配列 2 個は core-failures 内部に留め、代わりに述語 `isClassifyFailure(v: string): v is ClassifyFailure` / `isTestFailure(v: string): v is TestFailure` (includesLiteral 経由) を export する
2. `decodeErrorToClassifyFailure` を param `string` で移設 (三項演算子本体は不変・WHY コメント 242-245 を英語化)。RequestDecodeError は messages に残留
3. messages.ts から該当定義を削除し、移行用 re-export `export { ClassifyFailure, TestFailure, asClassifyFailure, decodeErrorToClassifyFailure } from './core/classifier-failures';` を 1 commit 分だけ残す。messages 内の parseClassifyResult / parseTestResponse を predicates 経由に張り替え (includesLiteral の直接利用をやめる)
4. 既存テストは re-export により無変更で緑であること (focused: tests/messages.test.ts, tests/llm/failure-priority.test.ts, tests/llm/classify-transport.test.ts, tests/ai/failure-text.test.ts)

## Task 2: importer 張り替え + re-export 撤去

1. 消費者マップの src 9 箇所 + tests 4 箇所の失敗語彙 import を './core/classifier-failures' (相対は各位置に応じる) に張り替える。wire codec も使う caller (background-gateway / provider-registry / classify-transport / handle-message) は messages と core-failures の両方から import する (正しい二本立て)
2. messages.ts から re-export を撤去し、export 数を実測して report に記録する (約 31 見込み — PBI の「約 15」は計画段で訂正済み)
3. `grep -rn "ClassifyFailure\|TestFailure" src/` で失敗語彙の参照が core-failures か「型を core-failures から受ける wire parser」に集約されていることを確認

## Task 3: META_CLIP_LENGTH を llm/prompt.ts に移設

1. META_CLIP_LENGTH を src/llm/prompt.ts に移設 (export const・値 80 は不変)。prompt.ts は META_CLIP_LENGTH + encodeFieldMeta を併用するので file 内の使用箇所を確認
2. src/feedback/issue-url.ts の import を張り替え (META_CLIP_LENGTH は '../llm/prompt' から、encodeFieldMeta / MetaWire は messages 継続)
3. tests/feedback/issue-url-exposure.test.ts の import を張り替え
4. messages.ts から META_CLIP_LENGTH を削除 (使用箇所: encodeFieldMeta が clip する? — 実装時に確認し、encodeFieldMeta が clip 幅を参照している場合はその参照をどうするか判断して report に記録。encodeFieldMeta が clip しないなら削除のみ)

## 完了後 (controller 実施)

- make check + make eval (pin 不変)
- graphify update
- PBI-246 の受け入れ基準更新 (export 数の訂正を含む) + 実装記録 + アーカイブ + INDEX 更新
- 全ブランチ最終レビュー → 修正波
