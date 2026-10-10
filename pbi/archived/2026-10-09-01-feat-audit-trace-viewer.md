# PBI: 外部 AI への送信内容と応答を監査ログに残し、設定ページで確認できるようにする

状態: 実装済み（`make check` green。コードレビューと実機確認はユーザー作業として残す）

## ユーザーストーリー
AI 判定を使う利用者として、外部 AI に送った内容とモデルの応答を後から確かめたい、なぜなら自分の情報がどう扱われたかをすべて追跡できる透明性がほしいから

## 優先度
- 順位: 1 / 1（ユーザー指定の要求）

## 背景
- 既存の監査ログ（`2026-10-06-01-feat-ai-audit-log.md`、アーカイブ済み）は呼び出しメタデータ（日時・プロバイダ・宛先・モデル・ページ URL・欄数・結果・HTTP ステータス・再試行）のみを記録し、欄メタデータの内容と応答の内容は意図的に残さない設計だった
- 本 PBI では利用者の要求（「モデルが認識する全情報、プロンプトから推論、ツールの呼び出しと結果、スケジューリング、すべてのコンテキスト追加まで追記専用セッションログに記録される」）により、記録対象を広げる。この拡張は旧 PBI の「内容を残さない」決定を意図的に置き換える
- プロファイルの値・欄の現在値・API キー・リクエストヘッダは引き続き記録しない。送信プロンプトは MetaWire の許可リスト（`src/messages.ts` の `toWireMeta`）だけで構成されるため、これらが記録に入る経路は構造上ない
- 設定ページは現在「件数・TSV ダウンロード・削除」のみで、エントリの中身をブラウザ内で確認できない。本 PBI で一覧と展開詳細を追加する

## 記録する項目（既存 11 項目に追加）
- `request`: モデルに送ったユーザープロンプトの全文（`buildPrompt` の出力。欄メタデータの許可リストのみで構成される）。システムプロンプトは全呼び出しで共通のコード定義のため、記録せず設定ページのビューアで表示する
- `response`: モデルの生応答。`AUDIT_RESPONSE_CLIP_LENGTH`（2,000 文字）で切り詰め、末尾に省略の印を付ける。失敗時は空、応答 JSON の形が不正なときは生 JSON
- `chunkIndex` / `chunkCount`: 分割送信（20 欄チャンク）の位置。1 始まり。分割なしは null
- `durationMs`: 呼び出しの所要時間（ミリ秒）。失敗時も記録

## BDD受け入れシナリオ
Scenario: 送信内容と応答が記録される
  Given プロバイダに OpenAI 互換 API を設定している
  When 「JushoAI で入力」で判定できない欄を AI に分類させる
  Then 記録にモデルに送ったプロンプトの全文とモデルの応答が含まれる
  And プロンプトに欄の値や API キーは含まれない

Scenario: 分割送信の位置が記録される
  Given 60 欄を超えるフォームで AI 判定を使う
  When 20 欄ずつ分割して送る
  Then 各記録に chunkIndex と chunkCount が残る

Scenario: 失敗した呼び出しも追跡できる
  Given API キーが誤っている
  When AI 判定が認証エラーになる
  Then 結果と所要時間が記録され、応答は空のまま残る

Scenario: 設定ページで確認できる
  Given 監査ログが 2 件ある
  When 設定ページの「通信の監査ログ」を開く
  Then 新しい順の一覧が表示され、各記録を開くと送信プロンプトと応答を確認できる

Scenario: 旧形式のログも読める
  Given トレース項目を持たない旧形式の記録がある
  When 一覧を読み込む
  Then 旧形式の記録は落ちず、トレース項目は空値で埋まる

Scenario: 保持期間と上限は従来どおり
  Given 8 日前のログと 1,005 件のログがある
  When 新しいログを追記する
  Then 期限切れと 1,000 件を超えた古い記録は削除される

## 受け入れ基準
- [x] 分類・接続テスト・互換再試行・内蔵 AI の全経路で、送信プロンプトと生応答が 1 呼び出し 1 件の記録に残る
- [x] 記録の `request` は `buildPrompt(fields)` と一致し、欄の値・プロファイルの値・API キーは含まれない（テストで固定）
- [x] `response` は 2,000 文字で切り詰められ、末尾に省略の印が付く
- [x] `chunkIndex`/`chunkCount` が wire（ai-classify メッセージ）から記録まで伝わり、分割なしは null になる
- [x] `durationMs` が成功・失敗のどちらでも記録される
- [x] 設定ページに新しい順の一覧があり、各記録を展開すると送信プロンプト・応答・メタデータを確認できる（ページ由来の文字列は textContent のみ）
- [x] 旧形式（トレース項目なし）の記録は normalize で空値補完されて読み続けられる
- [x] 保持期間 7 日・上限 1,000 件＋合計サイズ上限（バイトバジェットで古いものから削除）・保存失敗時も入力を止めない
- [x] docs（privacy・glossary・ai-providers・troubleshooting の日英）と CHANGELOG を新しい記録内容に合わせる

## テスト戦略（t_wadaスタイル）
- 単体: clip の境界（2,000 ちょうど/直上）、normalize の旧形式補完、TSV 新列、chunk 検証の境界
- 統合: `handleMessage` に fake fetch を渡し、`request === buildPrompt(fields)`、chunk の伝搬、秘密非含有を検証
- UI: 監査セクションの一覧の新しい順・展開内容・既存操作（ダウンロード・削除）の非破壊

## 実装者向け注記
### 現状コードの確認（着手前に実行済み）
- grep + graphify で確認済み: 監査ログは `src/ai/audit-log.ts`（11 項目）、書き込みは `src/ai/audited-classifier.ts` の `AuditedClassifier`、設定ページは `src/entrypoints/options/audit-section.ts` で件数・TSV・削除のみ。エントリの中身をブラウザ内で見る機能、`request`/`response`/chunk/所要時間の記録は未実装

### 実装手順
1. `src/ai/audit-log.ts`: `AuditEntry` に 5 項目追加、`isEntry` は旧形式を許して normalize で補完、TSV 列追加、`AUDIT_RESPONSE_CLIP_LENGTH` と clip 関数
2. `src/core/classifier.ts`: `ClassifySchedule`（index/count）を seam に追加、`FieldClassifier.classify` にオプション引数
3. `src/llm/classifier.ts` と `src/ai/http-classifiers.ts`: `lastExchange`（request/response）を最新呼び出しのトレースとして設定
4. `src/ai/audited-classifier.ts`: schedule 引数と所要時間を受け、lastExchange を記録に載せる
5. `src/messages.ts`: ai-classify にオプションの `chunk`、`parseRequest` は 3 キー許可と chunk 検証
6. `src/llm/background-gateway.ts`: チャンク位置を wire に載せる（分割時のみ）
7. `src/llm/handle-message.ts`: `req.chunk` を classify へ渡す
8. `src/entrypoints/options/audit-section.ts`: 新しい順の一覧と展開詳細（details/summary、textContent のみ）

### 落とし穴
- `parseRequest`（`src/messages.ts`）はキー数を数えて許可する。chunk を足すなら 3 キー許可と chunk の形検証が必要
- `Selection` の classifier は `FieldClassifier` 型。classify に schedule を渡すなら seam 側にオプション引数を足す
- `HttpClassifier` は build クロージャの中でプロンプトを組むため、request 記録には classify 内で `buildPrompt` をもう一度呼ぶ（決定的なので安全）
- `PromptApiClassifier` は `lm.create` が失敗したときも request を残すため、create の前に `lastExchange` を設定する
- 監査セクションのテストは buttons()[0]=ダウンロード / [1]=削除の順序に依存する。ビューアは button を増やさず details/summary で作る

## 見積もり
3pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
