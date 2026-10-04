# JushoAI

日本式フォーム（姓名・フリガナ・分割された住所）を補完する Chrome 拡張機能。フィールドの分類はルールで行い、判定できない欄だけ AI で補助できる（ユーザーが選んだプロバイダ: OpenAI 互換 API、Gemini、またはブラウザ内蔵 AI）。値の整形は決定的なコードで行い、プロファイルの値は外部に送信しない（AI を設定した場合のみ、欄のメタデータが選択したプロバイダに送られる）。

## 開発

    make install       # 依存の取得
    make dev           # 開発ビルド（Chrome が起動する）
    make build         # dist/chrome-mv3 に出力
    make test          # Vitest
    make typecheck     # tsc --noEmit
    make check         # typecheck + test + build
    make zip           # dist に配布用 zip を作る
    make clean         # 生成物を削除

`make help` で一覧を表示する。

## 使い方

1. 拡張機能の設定ページでプロファイルと住所を登録する
2. フォームの付近に出る「JushoAI で入力」を押す
3. プレビューで内容を確認し、「入力する」を押す

## AI 判定を使うには

ルールで判定できない欄だけ、AI で補助できる。初期状態は「使わない」で、設定ページの「AI 判定」でプロバイダを選ぶ。AI が使えなくてもルールによる入力は動作する。

- OpenAI 互換 API: ベース URL・モデル名・API キーを入力する。OpenAI / Groq / Mistral / Ollama / LM Studio はプリセットからベース URL を埋められる
- Google Gemini: モデル名・API キーを入力する
- ブラウザ内蔵 AI: Chrome（Gemini Nano）または Edge（Phi-mini）。フラグの有効化と再起動が必要
  - Chrome: `chrome://flags/#prompt-api-for-gemini-nano`
  - Edge: `edge://flags/#edge-llm-prompt-api-for-phi-mini`

保存すると、選んだプロバイダへの通信の許可をブラウザが確認する。許可しないと AI は使われない。接続テストで設定を確認できる。

### 送信されるデータ

AI を使う設定にした場合、ルールで判定できない入力欄のメタデータ（name・label・placeholder・見出し・type・maxlength）が、選んだプロバイダに送られる。プロファイルの値や、欄にすでに入っている値は送らない。API キーは暗号化して保存する（ストレージだけが流出しても復号できないが、この拡張機能自身のコードからは読み出せる）。

Ollama を使う場合は、Ollama 側の `OLLAMA_ORIGINS` に `chrome-extension://<拡張機能の ID>` を許可する。

状態は「JushoAI で入力」の横のバッジに表示され、押すと原因と対処のガイドが開く。

## 構成

- `src/core/` 分類ルール・値整形・注入値の計画（DOM と LLM に依存しない）
- `src/dom/` フォーム走査と値注入
- `src/ai/` AI プロバイダの設定・API キーの暗号化・クラウド分類器
- `src/llm/` Prompt API のラッパー、background のメッセージハンドラ、Content Script からのゲートウェイ
- `src/ui/` ボタンとプレビュー（Shadow DOM）
- `samples/` 手動確認用のフォーム
