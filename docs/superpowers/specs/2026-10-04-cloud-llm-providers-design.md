# クラウド LLM プロバイダ 設計書

ブラウザ内蔵 AI が使えない環境のために、ユーザーが設定した LLM プロバイダ（OpenAI 互換 API、Gemini）でフィールド分類を補助する。基本設計は `2026-10-03-jushoai-design.md` に従い、この文書はプロバイダ追加で変わる部分だけを定める。

## 目的とスコープ

- 設定で選んだ 1 つのプロバイダで、ルールが判定できない欄の分類を行う
- 値の生成は従来どおり決定的なコードで行い、LLM は分類だけを行う
- 外部への通信は、ユーザーが明示的にプロバイダを選んで保存したときだけ行う

### 含める

- プロバイダ: 使わない / ブラウザ内蔵 / OpenAI 互換 / Gemini
- OpenAI 互換のプリセット: OpenAI / Groq / Mistral / Ollama / LM Studio（ベース URL を埋めるだけ）
- API キーの自動暗号化（パスワードなし）
- 保存時のオプショナル host 権限の要求
- 設定ページ（プロバイダ選択・入力・接続テスト・送信内容の説明）

### 含めない

- 複数プロバイダの優先順位・自動フォールバック
- マスターパスワード
- models.dev 連携、`openai2` スロット
- Ollama 向けの `Origin` ヘッダ除去（declarativeNetRequest）。Ollama を使う場合は、利用者側で `OLLAMA_ORIGINS` に拡張機能のオリジンを許可する旨を設定ページと README に案内する
- ブラウザ内蔵 AI の改修（コードはそのまま残し、初期値は「使わない」）

## 送信するデータ

クラウドに送るのは、分類のための欄のメタデータだけ。

- 送る: 欄の id、name、htmlId、label、placeholder、nearby（見出し）、type、maxLength（各文字列は 80 文字に切り詰める）
- 送らない: プロファイルの値、欄の現在値、select の選択肢、autocomplete、pattern
- 欄のメタデータにはページ上の文言が含まれるため、README と設定ページに「選択したプロバイダにこれらが送られる」と明記する

## アーキテクチャ

```
Content Script ──ai-classify(メタデータのみ)──▶ background (Service Worker)
                                                   │ 設定を読む(API キーは background だけが復号)
                                                   ▼
                                    FieldClassifier を選択
                                    ├ none      → 何もしない(ルールのみ)
                                    ├ built-in  → PromptApiClassifier(既存)
                                    ├ openai    → OpenAICompatibleClassifier
                                    └ gemini    → GeminiClassifier
```

- 新しい分類器は既存の `FieldClassifier` を実装する。プロンプト（`buildPrompt`）、JSON スキーマ（`buildSchema`、`CATEGORIES`）、出力の検証（`parseLlmOutput`）を再利用し、異なるのは HTTP の呼び出しだけ
  - OpenAI 互換: `POST {baseUrl}/chat/completions`、`response_format: json_schema`
  - Gemini: `generateContent`、`responseMimeType: application/json` と `responseSchema`
- 呼び出しは background の `fetch` のみ。Content Script と設定ページは通信しない
- 20 欄ずつのチャンク分割、チャンク単位のタイムアウト（20 秒）、失敗時にルール分類へ縮退する挙動は既存のゲートウェイを共用する
- API キーは background だけが復号する。Content Script と設定ページの表示には出さず、設定ページが受け取るのは「保存済みか」だけ

### 状態表示

プロバイダごとの状態を区別する。

| プロバイダ | 状態 |
|---|---|
| none | 「AI: 使わない」 |
| built-in | 既存の AiStatus（利用可能 / 未準備 / 準備中 / 無効） |
| openai / gemini | 未設定（キーまたはモデルなし）/ 権限が未許可 / 認証エラー / 利用可能 |

バッジは現在のプロバイダ名を表示し、押すと原因と対処のガイドを開く。

## 設定

`chrome.storage.local` のキー `jushoai:ai-settings`。

| 項目 | 内容 |
|---|---|
| `provider` | `none`（初期値）/ `built-in` / `openai` / `gemini` |
| `openai` | `baseUrl`、`apiKey`（暗号化）、`model` |
| `gemini` | `apiKey`（暗号化）、`model`、`apiVersion`（既定 `v1beta`） |

- プリセットはベース URL を埋めるだけで、モデル名は自由入力。具体的なモデル名は古くなるため既定値として埋め込まない
- 設定の正規化と検証は純粋関数にする

## API キーの保管

- AES-GCM で暗号化したエンベロープだけを `chrome.storage.local` に保存する
- 鍵を包む KEK は、抽出不可の `CryptoKey` として IndexedDB に分離する
- KEK の保管先は `KeyStore` インターフェースの背後に置く。本番は IndexedDB 実装、テストはメモリ実装
- 暗号化は、storage だけが漏れても API キーを復号できないようにするためのもの。拡張機能自身のコードからは読めるため、設定ページに限界を明記する
- API キーは、ログ・エラーメッセージ・メッセージの応答に出さない

## 通信

- ベース URL は検証する
  - `https` のみ許可する
  - `http` はループバック（`localhost`、`127.0.0.1`、`[::1]`）だけ許可する
  - それ以外の内部ネットワークアドレスは拒否する（SSRF 対策）
  - リダイレクトは辿らない
- 権限は `optional_host_permissions`（`https://*/*` と、ループバックの `http`）に宣言し、設定ページの「保存」で、そのプロバイダのオリジンだけを `chrome.permissions.request` で要求する。許可が無い間は「権限が未許可」状態にする
- リクエストにはメタデータの許可リストだけを載せる

## 設定ページ

- プロバイダ選択、OpenAI 互換のプリセット、各入力欄を置く
- 「接続テスト」は合成した 1 欄を分類させ、結果を表示する
- 「保存」で入力を検証し、権限を要求し、API キーを暗号化して保存する
- 送信されるデータの説明と、API キー保管の限界を常に表示する
- 「Ollama を使う場合は `OLLAMA_ORIGINS` に拡張機能のオリジンを許可する」旨を案内する
- 保存済みの API キーはマスク表示し、読み出しはしない（置き換えと削除のみ）

## エラー処理と縮退

| 状況 | 挙動 |
|---|---|
| provider が none | ルール分類のみ |
| 未設定 / 権限が未許可 | ルール分類のみ。バッジとガイドで原因を示す |
| HTTP エラー / タイムアウト / 不正なレスポンス | 該当チャンクを飛ばし、ルール分類は継続 |
| 認証エラー（401 / 403） | 状態を「認証エラー」にし、ガイドで API キーの確認を促す |
| 復号に失敗 | キーを未設定として扱い、再入力を促す |

## テスト

- リクエストの組み立てとレスポンスの解析は純粋関数にして、`fetch` を差し替えて検証する
- ベース URL の検証は、許可・拒否の表形式テストにする
- 暗号化は往復と改ざん検出をテストする（`KeyStore` はメモリ実装）
- 設定の保存と読み出し、権限が未許可のときの状態遷移をテストする
- background のメッセージ処理は、プロバイダの選択と縮退をテストする
- 実際のプロバイダとの通信は自動化できないため、手動確認の手順を README に記す
