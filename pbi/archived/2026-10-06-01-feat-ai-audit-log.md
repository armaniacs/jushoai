# PBI: ML API を呼ぶたびに監査ログを残す

状態: 実装済み（`make check` green。実機での確認とコードレビューはユーザー作業として残す）

## ユーザーストーリー
AI 判定を使う利用者として、いつ・どこへ・どのページの欄を何件送ったかを記録してほしい、なぜなら自分の情報がどう扱われたかを後から確かめられる透明性がほしいから

## 優先度
- 順位: 1 / 2
- RICEスコア: 32.0（Reach=10 / Impact=2 / Confidence=0.8 / Effort=0.5）
- 根拠: 透明性の本体で、順位 2 の前提になる

## 背景
- yasumaro（https://github.com/armaniacs/yasumaro）の監査ログと同じく、必要最小限のメタデータだけを記録する。踏襲点と差分は台帳（`2026-10-06-00-backlog-ai-audit-log.md`）にある
- 通信の入口は 2 つ。クラウド AI は `src/ai/http-classifiers.ts` の `HttpClassifier.send`、内蔵 AI は `src/llm/classifier.ts` の `PromptApiClassifier`。接続テストも同じ入口を通る
- 呼び出しは background（`src/llm/handle-message.ts`）だけが行うため、ログも background で書く
- 記録は `FieldClassifier` を包む装飾（デコレータ）にして、プロバイダを増やしても漏れない形にする

## 記録する項目
- ID（連番）、記録日時
- プロバイダ（openai / gemini / built-in）、宛先ホストとモデル名（内蔵 AI は宛先なし）
- 目的（classify / connection-test）
- ページ URL（origin と pathname のみ。`sanitizePageUrl` と同じ扱い）。接続テストは空
- 送った欄の数
- 結果（success / auth-error / http-error / network-error / invalid-response / error）。タイムアウトと接続失敗は network-error にまとめる。AI を呼ばなかった場合（未設定・権限なし）は呼び出しがないため記録しない、HTTP ステータス、互換リクエストへの再試行の有無
- 残さないもの: 欄メタデータの内容、プロファイルの値、欄の現在値、API キー、リクエストヘッダ、応答の本文と分類結果

## BDD受け入れシナリオ
Scenario: クラウド AI の呼び出しが記録される
  Given プロバイダに OpenAI 互換 API を設定している
  When 「JushoAI で入力」で判定できない欄を AI に分類させる
  Then 日時・宛先ホスト・モデル・ページ URL・欄の数・結果が 1 件のログに残る

Scenario: 失敗した呼び出しも記録される
  Given API キーが誤っている
  When AI 判定が認証エラーになる
  Then 結果が auth-error のログが残り、API キーはログに含まれない

Scenario: 内蔵 AI の呼び出しが記録される
  Given プロバイダにブラウザ内蔵 AI を設定している
  When 欄を分類させる
  Then 宛先なし（端末内）として 1 件のログが残る

Scenario: 7 日を過ぎたログの削除
  Given 8 日前のログがある
  When 新しいログを追記する、または一覧を読み込む
  Then 8 日前のログが削除され、新しいログは残る

Scenario: AI を使わない設定
  Given プロバイダが「使わない」
  When フォームで入力する
  Then ログは増えない

## 受け入れ基準
- [x] ML API を呼ぶ全ての経路（分類・接続テスト・互換リクエストの再試行・内蔵 AI）で 1 呼び出し 1 件が残る
- [x] ログに欄メタデータの内容・プロファイルの値・欄の現在値・API キー・ヘッダ・応答本文が含まれない（テストで固定）
- [x] 7 日を過ぎたエントリを、追記時と読み込み時に削除する（アラーム権限を増やさないため）。件数の安全上限は 1,000 件
- [x] ログの保存失敗が、入力や AI 判定の動作を止めない
- [x] 設定ページ（AI 判定）に、ログの件数と、ログを削除するボタンがある。保持期間が 7 日である旨も表示する
- [x] ドキュメントサイトのプライバシーのガイド（日英）に、監査ログの項目・保存先・保持期間・削除方法を載せる

## テスト戦略
- E2E: 実機で AI を呼び、設定ページの件数が増える（手動）
- 統合: `handleMessage` に fake の fetch を渡し、成功・401・タイムアウト・再試行の各経路でログが 1 件ずつ残る
- 単体: ログ整形（URL の絞り込み、項目の除外）、保持期間と安全上限の削除処理（閾値ちょうど / 直上 / 直下）

## 見積もり
3pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
