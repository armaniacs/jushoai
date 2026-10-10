# PBI: Base URL のホスト名を解決して内部アドレス拒否をダイヤル時まで担保する

状態: 実装済み（`make check` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
OpenAI 互換 API のカスタムエンドポイントを設定する利用者として、保存したベース URL が字句チェックだけでなく、実際にダイヤルされるアドレスまで検証されていることを知りたい。なぜなら nip.io/sslip.io のように内部アドレスへ解決される DNS 名が拡張機能の宣言されたセキュリティ制御（「内部ネットワークのアドレスは指定できません」settings.ts:84）を通過し、`Authorization: Bearer <APIキー>` と欄メタデータが内部/LAN アドレスへ配送される経路を塞ぎたいから

## 優先度（順位: 4 / 7、RICEスコア: 6.67（Reach=10 / Impact=2 / Confidence=100% / Effort=3pt）、根拠: 唯一の確定脆弱性（VULN-001、Medium、CWE-918/CWE-367）。ただし悪用には 2 つのユーザー操作が必要で Effort 最大）

## 背景
- VulnHunter 監査の唯一の確定脆弱性 VULN-001（Medium、CWE-918/CWE-367）。`validateBaseUrl`（`src/ai/settings.ts:58-90`）は字句チェックのみで、nip.io/sslip.io のハイフン付き IP エンコード名や DNS rebinding 名がゲートを通過する
- `isPrivateHost`（`src/ai/settings.ts:39-54`）は正規表現による字句レンジ判定のみ。直前のコメント（settings.ts:38）が「String checks cannot catch DNS names that resolve to private addresses」と限界を明示している
- fetch（`src/ai/http-classifiers.ts:155`）はダイヤル時に DNS を解決し、`Authorization: Bearer <APIキー>` + フィールドメタデータ JSON を内部/LAN アドレスへ配送する。src 内のどこでもダイヤル前の再解決・照合は行っていない
- エクスプロイトテスト 3/3 PASS: (1) ゲートバイパス（`validateBaseUrl` / `validateAiSettings` が内部解決名を受け入れる）、(2) 実 build/send 経路でのディスパッチ（`https://169-254-169-254.nip.io/chat/completions` に Bearer キー + 欄ラベル）、(3) ライブ配送（`https://127-0-0-1.nip.io:<port>` 経由で 127.0.0.1 上のサーバーへ実 fetch で物理配送、分類往復まで完了）
- 出典: `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase3_output.md`（修正戦略とファイル範囲が確定済み）、同 `poc/VULN-001_egress_dns_bypass_nip_io.md`、同 `exploit_tests/test_vuln_001_egress_dns_bypass.test.ts`（3/3 PASS）

## BDD受け入れシナリオ
Scenario: 内部アドレスに解決される名前は保存時に拒否される
  Given プロバイダに OpenAI 互換 API を選んでいる
  When ベース URL に https://169-254-169-254.nip.io を入力して保存する
  Then 保存は失敗し、解決先が内部ネットワークのアドレスである旨のエラーが表示される

Scenario: 分類時（ダイヤル直前）に解決先が再チェックされる
  Given 保存済みのベース URL が公開エンドポイントを指している
  When 分類呼び出しの時点で DNS の解決先が内部アドレスに変わっている
  Then fetch は実行されず、分類はルールのみで続行する

Scenario: 正常な公開エンドポイントは従来どおり受け入れられる
  Given ネットワークが利用できる
  When ベース URL に https://api.openai.com/v1 を入力して保存する
  Then 保存は成功し、分類の呼び出しも通常どおり行われる

Scenario: DoH 失敗時は拒否側に倒れる
  Given DNS 解決（DoH）が失敗する環境
  When ベース URL を検証する
  Then 検証は失敗し（fail-closed）、fetch は実行されない

Scenario: 設計どおりの http localhost パスは壊れない
  Given ローカルで OpenAI 互換サーバーを動かしている
  When ベース URL に http://127.0.0.1:1234/v1 を指定する
  Then 従来どおり受け入れられる

## 受け入れ基準（すべて未チェック）
- [x] `validateBaseUrl` が字句チェック後にホスト名を解決し、解決済みアドレスが private/loopback/link-local なら拒否する（レンジ判定は `isPrivateHost` の既存ロジックを解決済み IP に対して再利用）
- [x] 字句チェックは高速パスとして残り、設計どおりの http localhost パス（settings.ts:77-81）は壊れない
- [x] `HttpClassifier.send` が fetch 直前（http-classifiers.ts:155 の直前）に解決済みアドレスを再チェック（または resolve-and-pin）し、保存/分類→fetch の TOCTOU 窓を閉じる
- [x] 解決結果は呼び出しに紐づく TTL でキャッシュされ、1 classify あたりの DNS ルックアップは 1 回に保たれる
- [x] 解決済みアドレスが内部のときの利用者向けエラーメッセージが `validateAiSettings`（settings.ts:98-107）から表示される
- [x] DoH 失敗時は fail-closed（拒否側）に倒る
- [x] 正常な公開エンドポイント（例: https://api.openai.com/v1）は従来どおり受け入れられる
- [x] 監査のエクスプロイトテストを `tests/ai/` に移植し、「ゲートが nip.io 内部解決名を拒否すること」を検証する形に書き換えてパスする
- [x] `make check` が通る

## テスト戦略（t_wadaスタイル: 単体 / 統合）
- 単体: resolver を差し替えられる seam に内部解決名の拒否・公開名の受理・DoH 失敗時の fail-closed・TTL キャッシュの境界（有効内/切れ目）を検証する。`isPrivateHost` のレンジ判定は解決済み IP 入力に対しても既存テストと同水準で網羅する
- 統合: `handleMessage` に fake fetch/resolver を渡し、`ai-classify` と `ai-test` の両方が send シーム経由でダイヤル直前の再チェックを受けること。互換再試行（400/422）や 401/403 と組み合わせても再チェックが欠けないことを検証する
- 移植: 監査のエクスプロイトテスト（`exploit_tests/test_vuln_001_egress_dns_bypass.test.ts`）を `tests/ai/` に移植し、修正前は失敗・修正後は「拒否されること」を期待する形に反転する

## 実装者向け注記
### 現状コードの確認
- 読み取りで確認済み: `validateBaseUrl`（`src/ai/settings.ts:58-90`）は同期関数で、URL 形式・認証情報・クエリ/フラグメント・IPv6・空ラベル・http ループバック限定（settings.ts:77-81）・`isPrivateHost`・単一ラベル拒否を字句で判定する。`isPrivateHost`（settings.ts:39-54）は正規表現の字句レンジ判定のみ
- `HttpClassifier.send`（`src/ai/http-classifiers.ts:151-161`）は AbortController でタイムアウトして fetch（:155）を 1 回呼ぶだけ。リダイレクトピボットは既存の `redirect: 'error'`（http-classifiers.ts:40）で封済み
- `ai-classify` と `ai-test` の両方が `src/llm/handle-message.ts` の `selectRaw`（:85-114、ゲートは :103、classifier 生成は :105）を通るため、シーム単位の修正で全 egress 呼び出し元をカバーでき、呼び出し元ごとの修正は不要
- Gemini 経路は定数ホスト + 正規表現検証済み apiVersion + encodeURIComponent 済み model で影響なし。修正対象は OpenAI 互換の baseUrl
- 監査の出典: `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase3_output.md`、同 `poc/VULN-001_egress_dns_bypass_nip_io.md`、同 `exploit_tests/test_vuln_001_egress_dns_bypass.test.ts`（3/3 PASS）

### 実装手順
1. `src/ai/settings.ts`: 解決プリミティブを追加する。MV3 の Service Worker には dns API が存在しないため DoH を使う（リゾルバは固定の信頼できるオリジンに限定）。`isPrivateHost` のレンジ判定を「解決済み IP に対して再利用できる形」に切り出し、字句チェックは高速パスとして残す
2. `validateBaseUrl`: 字句チェック後にホスト名を解決し、解決済みアドレスが private/loopback/link-local なら拒否する。同期→非同期化の波及範囲（`validateAiSettings`、`originPattern`、options 保存パス、テスト）を確認してから変える
3. `src/ai/settings.ts` `validateAiSettings`: 解決済みアドレスが内部のときの利用者向けエラーメッセージを用意する（settings.ts:98-107 の errors に流す）
4. `src/ai/http-classifiers.ts` `send`: fetch 直前に解決済みアドレスを再チェック（または resolve-and-pin）する。解決結果は呼び出しに紐づく TTL でキャッシュし、per-classify のコストを 1 ルックアップに保つ
5. 監査のエクスプロイトテストを `tests/ai/` に移植し、「ゲートが nip.io 内部解決名を拒否すること」を検証する形に書き換える

### 落とし穴
- MV3 の Service Worker には `chrome.dns` が存在しない。DoH で解決すること。リゾルバのオリジンを検証対象ホストから可変にすると新たな SSRF 面になるため、定数オリジンにする
- `validateBaseUrl` を async 化すると同期前提の呼び出し元が全部波及する。特に `originPattern`（settings.ts:93-96）は host 権限パターンの算出に使われているため、権限要求のタイミングまで確認する
- 設計どおりの http localhost パス（settings.ts:77-81）と loopback 判定（`isLoopbackHost` が `.localhost` を false にする挙動、settings.ts:31-36）を壊さない。ローカル開発のユースケースが死ぬ
- TLS は信頼しないこと: 攻撃者は DNS-01 ACME で nip.io/sslip.io 名の CA 有効証明書を取得できる。証明書不一致を防壁に数えない
- ダイヤル直前の再チェックと実際の接続の間の残存 rebinding は狭いが残る。resolve-and-pin（検証済み IP へ接続し SNI/host は変更しない）はフォローアップとして記録し、本 PBI では実装しない
- 再チェック対象は「設定の書き換え」ではなく「DNS の変化」である。保存時と分類時の 2 箇所で同じ解決プリミティブを使い、1 か所だけ直す形にしない
- fake resolver を差し替えられる seam（`HttpDeps` の拡張など）を先に用意すると、単体テストと監査テストの移植が書きやすい

## 見積もり
3pt（要チームでの見積もり）

## Definition of Done（すべて未チェック）
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [x] ドキュメント更新済み（セキュリティ設計の記述を「保存時 + ダイヤル直前の解決済みアドレス検証」に合わせる）
