# PBI: プロバイダ応答の読み取りを有界化する

状態: 実装済み（`make check` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
OpenAI 互換 / Gemini のクラウドプロバイダを設定して使う利用者として、設定済みエンドポイントが巨大な応答を返してもサービスワーカーが一時 OOM で落ちないことをほしい。なぜなら in-flight の分類操作が失われると、自分が押した「JushoAI で入力」が何の応答もなく中断されるから

## 優先度
- 順位: 5 / 7、RICEスコア: 4.0（Reach=10 / Impact=0.5 / Confidence=80% / Effort=1pt）
- 根拠: Reach=10 はクラウドプロバイダ設定者の全分類呼び出しが対象のため。Impact=0.5 は、VulnHunter 監査が Gate 3 でセキュリティ影響を排除しており（利用者設定エンドポイントは BYO baseline として既に API キーと欄メタデータを受領する設計）、落ちるのは MV3 の自動再起動で復旧する利用者自身の in-flight 操作のみのため。Confidence=80% は機構が監査で検証済みで、正規応答が 20 欄チャンクでも数百バイト級のため上限の余裕が大きいことによる。Effort=1pt は読み取り 1 箇所と lastExchange 1 箇所の変更で済む見込みによる

## 背景
- 出典: `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase2b_output.md` 候補 #4（VULN-004、Gate 3 で排除、Code Quality 推奨 #3「Cap the provider response (Content-Length check or bounded read) before `res.json()`」）。機構は検証済み
- 現状、応答転送を律速するのは 20 秒 abort（`src/ai/http-classifiers.ts:153`）のみ。`res.json()`（:182）は応答全体をバッファし、`lastExchange` にはフルサイズの `JSON.stringify(json)`（:187）、`parseJsonLoosely`（`src/llm/classifier.ts:55-70`）は raw / unfenced / slice の複数回コピーを作る
- 設定済みエンドポイントが巨大な応答を返すとサービスワーカーが一時 OOM しうる（MV3 は自動再起動し、落ちるのは利用者自身の in-flight 操作）
- 正常な分類応答は 20 欄チャンク（Phi-mini 分割）でも数百バイト〜数 KB 級。上限値は既存のワイヤ caps（`MAX_TEXT_LENGTH` 200 / `META_CLIP_LENGTH` 80（`src/messages.ts`）、`AUDIT_RESPONSE_CLIP_LENGTH` 2,000 / `AUDIT_MAX_BYTES` 4,000,000（`src/ai/audit-log.ts`））と整合させる。案は 1MB 程度（`AUDIT_MAX_BYTES` を下回り、正規応答の 3 桁以上の余裕）。最終値はチームで決める
- 制約: 正常な応答のパース契約（`json_object` 形式・enum 検証される出力）は一切変えない。監査ログの応答 clip（`AUDIT_RESPONSE_CLIP_LENGTH` 2,000 文字）はパース後の話であり、本 PBI はパース前の読み取りが対象

## BDD受け入れシナリオ
Scenario: Content-Length 超過の応答が本文読み取り前に拒否される
  Given プロバイダに OpenAI 互換 API を設定している
  When 設定済みエンドポイントが Content-Length が上限を超える 200 応答を返す
  Then 分類は HttpRequestError で失敗し、応答本文は読み取られない
  And 残りの欄はルール分類のみで動作を続ける

Scenario: Content-Length なしの巨大ストリームも有界読み取りで打ち切られる
  Given Content-Length ヘッダを持たず、読み取り中に上限を超える応答を返すエンドポイントを設定している
  When 有界読み取りが累積上限に達する
  Then 読み取りを打ち切り、同じく HttpRequestError で失敗する

Scenario: 上限以下の正常応答は従来どおり分類される
  Given 上限未満の正常な応答（choices に enum 内カテゴリの JSON）を返すエンドポイントを設定している
  When AI 分類を実行する
  Then 従来どおり enum 検証済みのカテゴリが返り、lastExchange に応答が残る

Scenario: 既存の再試行と認証の契約は変わらない
  Given 最初の応答が 400、再試行の応答が上限内の正常応答を返すエンドポイントを設定している
  When AI 分類を実行する
  Then 互換再試行・401/403 の認証エラー・lastTrace の記録は現行実装と同じ振る舞いをする

## 受け入れ基準
- [x] `res.json()` の前に応答サイズ上限が効き、上限超過は既存の `HttpRequestError` で失敗する
- [x] Content-Length ヘッダが上限超過のときはヘッダ段階で拒否し、本文を 1 バイトも読まない
- [x] Content-Length がない・不正なときは有界読み取り（`res.body` の reader）で累積上限超過を検出して打ち切る
- [x] 上限以下の正常応答は `json_object` 形式・enum 検証を含む既存のパース契約のまま分類される（正規表現や期待値を緩めない）
- [x] `lastExchange.response` への `JSON.stringify` 格納が上限付きになり、監査ログの clip（2,000 文字・パース後）は従来どおり
- [x] `parseJsonLoosely` の複数パスコピーが読み取り上限に包摂されることをテストで固定する（extract 済み text が上限内に収まること）
- [x] 20 秒 abort との相互作用（タイマーはヘッダ受信まで、巨大応答はサイズで先に拒否）をテストで固定する
- [x] 既存テスト（`tests/ai/http-classifiers.test.ts`）が非破壊で green
- [x] `make check` が green

## テスト戦略（t_wadaスタイル: 単体 / 統合）
- 単体（`tests/ai/http-classifiers.test.ts`）: 上限ちょうど（受理・既存 clip の「超過のみ切り詰め」慣習に合わせる）と直上（拒否）の境界、Content-Length あり/なし/不正の 3 経路、lastExchange.response の上限、`parseJsonLoosely` のコピーが上限に包摂されること
- 統合（`handleMessage` 経由）: fake fetch で巨大応答（Content-Length 超過・ストリーム超過の両方）を返し分類が `HttpRequestError` で失敗してルール分類のみで続行すること、通常応答の非破壊、compat 再試行・401/403 の既存契約、20 秒 abort との相互作用（タイマー解除後のボディ読み取りには abort が効かない現行仕様を固定）
- fake の注意: 既存の `jsonResponse` ヘルパーは `json()` のみを実装する。headers / body ストリームを持つ fake を新設するか、実装側で `res.body` 未定義のとき `res.json()` にフォールバックする

## 実装者向け注記
### 現状コードの確認（着手前に実行済み）
- `src/ai/http-classifiers.ts`: `res.json()` は :182、`exchange.response = text ?? JSON.stringify(json)` は :187、20 秒タイマーは :153（send の finally で fetch 解決後に解除）。`res.json()` は :178-179 の 401/403・非 ok 判定の後でのみ呼ばれるため、400/422 の応答本文は現状も読んでいない
- `src/llm/classifier.ts:55-70`: `parseJsonLoosely` が `attempts = [raw, unfenced, slice]` の 3 コピーを作る。classify（http-classifiers.ts:189）は extract 結果の text を `parseLlmOutput` に渡すため、読み取りを有界化すればコピーも包摂される
- 既存 caps: `MAX_TEXT_LENGTH` 200 / `META_CLIP_LENGTH` 80（`src/messages.ts`）、`AUDIT_RESPONSE_CLIP_LENGTH` 2,000 / `AUDIT_MAX_BYTES` 4,000,000（`src/ai/audit-log.ts`）。ワイヤは UUID・欄 id・文字列を既に clip しており、リクエスト側は巨大化しない

### 実装手順
1. `src/ai/http-classifiers.ts` に上限定数を追加（例: `MAX_RESPONSE_BYTES = 1_000_000`。正規応答は数百バイト級、`AUDIT_MAX_BYTES` 4MB を下回る）
2. classify() の `res.ok` 確認後に Content-Length ヘッダを検査し、上限超過なら `HttpRequestError(res.status, 'response too large')` を投げて本文を読まない
3. `res.body` が使えるときは reader で上限まで累積し、超過で打ち切ってから `JSON.parse`（既存の catch → `HttpRequestError('invalid response body')` 経路を流用）。`res.body` がないとき（既存 fake・古いランタイム互換）は `res.json()` にフォールバック
4. `exchange.response` への格納を上限付きにする（既存の clip 定数を再利用するか、上限定数から導出。新しい数値を発明しない）
5. テスト追加 → `make check`

### 落とし穴
- 既存の `jsonResponse` fake は `json()` のみ。実装が `res.body` を無条件に読むと `tests/ai/http-classifiers.test.ts` の全 fake が壊れる。body 未定義のフォールバックか、headers/body を持つ新 fake が必須
- 20 秒タイマーは send() の finally（ヘッダ受信時）で解除されるため、ボディ転送には現状時間上限がない。サイズ上限で実用上は有界になるが、緩慢な転送は上限到達まで待ち続ける。ボディ読み取りにも時間予算を掛けるかはチーム判断（scope 最小はサイズのみ。本 PBI はサイズを約束する）
- 「上限ちょうど」を受理にするか直上で拒否するかを決めてテストで固定する（既存 clip は「超過のみ切り詰め」の慣習。それに合わせるなら `> cap` で拒否）
- 打ち切り後の prefix が JSON 途中で切れることがあるが、それは既存の `invalid response body` 経路に落ちる。専用のエラーメッセージを足さなくてよい（エラー型を増やさない）
- 監査ラッパー（`src/ai/audited-classifier.ts`）は `lastExchange` を読んで clip するだけなので、パース後の監査経路に変更は不要

## 見積もり
1pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（パース契約は不変のため、必要に応じて CHANGELOG の堅牢化記載のみ）
