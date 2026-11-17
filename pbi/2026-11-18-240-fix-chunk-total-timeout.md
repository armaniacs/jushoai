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
- [ ] runClassifyPipeline（または send の呼び出し側）が run 開始時刻を保持し、send に渡して remaining を run 基準で計算する。または pipeline ループ内で経過時間を追って予算切れで break する
- [ ] auth・rejected など非リトライ可能な理由でループを打ち切る
- [ ] transfer-contract.ts の契約コメントと background-gateway.ts の 135s コメントが実装と一致する
- [ ] テストコメント（残余予算の表現）を実挙動に合わせて修正する
- [ ] `make check` が緑

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
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
