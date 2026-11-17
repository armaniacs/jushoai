# PBI: チャンク実行の run 合計タイムアウト予算の復元

## ユーザーストーリー
クラウド LLM プロバイダで 20 欄を超えるフォームを分類する利用者として、分類の待ち時間が run 全体で上限（60 秒）に収まり、認証失敗のような取り返しのつかない失敗の後は残りのチャンクを送らないようにしてほしい、なぜなら PBI-175/193 のリファクタで send が送信ごとに startedAt を取り直すようになり、run レベルの壁時計上限が実質消滅（最悪 135 秒）で、1 チャンク目が auth/rejected で失敗しても飽和プロバイダに最大 3 リクエスト送り続けるから

## 優先度
- 順位: 10 / 14
- RICEスコア: 36（Reach=2 / Impact=2 / Confidence=90% / Effort=0.1人週）
- 根拠: PBI-33 で確立した不変条件の復元型。transfer-contract.ts の契約コメントと実装・テストコメントの矛盾も同時に解消する

## 出どころ
- checking-team 2026-11-18 ラウンド・Blue Team Leader + Tuning Expert（重複統合）。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/classify-pipeline/pipeline.ts:146-165、src/llm/classify-transport.ts:63-88、src/llm/transfer-contract.ts:10-12（契約コメント）、src/llm/background-gateway.ts:16-19（135s コメント）、tests/llm/background-gateway.test.ts:214-225

## BDD受け入れシナリオ
Scenario: run 全体が total timeout に収まる
  Given 60 欄（3 チャンク）の分類でプロバイダが stalled している
  When  runClassifyPipeline を実行する
  Then  各送信は run 開始時刻基準の残余予算で clamp され、予算切れで後続チャンクを打ち切る（run 全体が 60 秒に収まる）

Scenario: 非リトライ失敗で打ち切る
  Given 1 チャンク目が auth（401/403）または rejected で失敗した
  When  チャンクループが次に進むとき
  Then  後続チャンクを送らず run を締める（監査ログの失敗記録は 1 件になる）

## 受け入れ基準
- [x] runClassifyPipeline（または send の呼び出し側）が run 開始時刻を保持し、send に渡して remaining を run 基準で計算する。または pipeline ループ内で経過時間を追って予算切れで break する
- [x] auth・rejected など非リトライ可能な理由でループを打ち切る
- [x] transfer-contract.ts の契約コメントと background-gateway.ts の 135s コメントが実装と一致する
- [x] テストコメント（残余予算の表現）を実挙動に合わせて修正する
- [x] `make check` が緑

## 実装手順
- まず 3 チャンク × stalled の境界テストを RED で足す（tests/classify-pipeline/ または tests/llm/）
- deadline の渡し方を決めて実装する（send の引数拡張は後方互換に注意: Legacy Bridge が `opts?: {signal}` の省略可能引数が既存アダプタに影響なしと確認済みの前例あり）
- 非リトライ理由の打ち切り条件を failureReason の語彙で判定する

## テスト戦略
- 単体: stalled プロバイダの fake で 3 チャンク境界・auth 打ち切り・remaining clamp の 3 面を fixture で固定
- 既存の background-gateway.test.ts 214-225 のコメント・期待値を合わせて更新

## 見積もり
0.1人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録

実装 (2026-11-18, work/checking-round-2026-11-18):

- **run 開始時刻の seam 経由の受け渡し**（受け入れ基準 1、両方式を実装）:
  - `src/core/classifier.ts` — `FieldClassifier.attempt` / `CappedClassifier.attempt` の `opts` に省略可能な `startedAt?: number` を追加（PBI-174 の `signal` と同じ省略可能引数の前例。既存 adapter は無変更のまま影響なし）。
  - `src/llm/classify-transport.ts` — `ClassifySendOptions.startedAt` を追加し、`remaining = totalTimeoutMs - (Date.now() - startedAt)` を run 開始時刻基準で計算。`startedAt` なしの単発送信は従来どおり全 budget を持つ。
  - `src/llm/background-gateway.ts` — `BackgroundClassifier.attempt` が `opts.startedAt` を `send` へ流す。
  - `src/classify-pipeline/pipeline.ts` — run 先頭の `startedAt`（既存）を `seam.attempt` の第 3 引数で渡し、さらにループ冒頭で `Date.now() - startedAt >= TRANSFER_TOTAL_TIMEOUT_MS` なら `failureReason = 'network'` で break（`startedAt` を無視する adapter、例: http-classifiers の経路でも予算切れ後のチャンク起動を止める）。
- **非リトライ理由の打ち切り**（受け入れ基準 2）: `NON_RETRYABLE_FAILURES = {auth, rejected}` でチャンク結果の理由が一致したら break。保守的な語彙集合の選択（network・bad-response・legacy null・unavailable は継続=リトライ可能とみなす）は `pipeline.ts` の定数コメントに記載。`rejected` は http-classifiers の 400/422 拒否、`auth` は 401/403 に対応。
- **契約・コメントの整合**（受け入れ基準 3・4）:
  - `src/llm/transfer-contract.ts` — 不変条件コメントに「remaining は run 開始時刻基準（PBI-240）」を明記。
  - `src/llm/background-gateway.ts` — `CLASSIFY_TOTAL_TIMEOUT_MS` の「135s worst case」コメントを「60s run budget・run 開始基準の clamp」に修正。
  - `tests/llm/background-gateway.test.ts` — PBI-33 の「残余予算」テストのコメントと期待値を 3 wire → 2 wire に修正（予算消費後の第 3 チャンクは wire に載らない）。
  - `tests/llm/failure-priority.test.ts` — 「最初の失敗が勝つ」テストの理由を auth+network から network+bad-response に変更（auth 先頭チャンクは打ち切りが正しい挙動になったため。打ち切り自体は background-gateway.test.ts で pin）。
- **付帯（SRE）**: `catch { continue; }` の契約外 throw に件数・経過のみの `console.debug` 1 行を追加（PBI-27 の logRuleOnlyRun と同じ規律、meta 内容は載せない）。

テスト (TDD):

- 先に追加した境界テスト 10 件が RED であることを確認（`npx vitest run tests/llm/background-gateway.test.ts tests/llm/classify-pipeline.test.ts tests/llm/classify-transport.test.ts` → 10 failed）:
  - stalled 3 チャンクが run 合計 60 秒に収まる（wire 呼び出し 2 回・全呼び出しが run 開始 +60s 以内・第 3 チャンク不送信）— `background-gateway.test.ts` 「spends the run total budget once for a stalled 3-chunk run」
  - auth / rejected で残りチャンクを送らない（wire 1 回）— 同ファイル it.each + `classify-pipeline.test.ts` it.each（seam レベル）
  - remaining clamp の run 基準化 — 同ファイル「clamps a hung chunk to the remaining run budget and stops within it（期待値 3→2）」+ `classify-transport.test.ts`「measures the remaining budget from the run start when one is given」
  - pipeline → seam への startedAt 引き渡し・予算切れでのチャンク起動停止・契約外 throw の debug ログ — `classify-pipeline.test.ts`
- 実装後に上記 3 ファイル + failure-priority + attempt-seam + gateway-legacy-reason が GREEN（165 tests passed）。全テスト 3119 passed（1 expected fail は既存）。
- `make check` EXIT:0（typecheck + test + 両ブラウザ build + manifest 検査 + web-ext lint。lint の warning 2 件は既存の gecko min_version 通知で本 PBI と無関係）。

BDD シナリオ対応:

- Scenario 1（run 全体が total timeout に収まる）→「spends the run total budget once for a stalled 3-chunk run」+「clamps a hung chunk to the remaining run budget and stops within it」
- Scenario 2（非リトライ失敗で打ち切る・監査ログの失敗記録 1 件）→「stops after a non-retryable %s reply without sending the remaining chunks」（gateway・seam の両面。打ち切りにより後続 attempt が発生しない = 監査への失敗記録も 1 件）
