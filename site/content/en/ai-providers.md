---
title: Setting up an AI provider
description: How to choose and configure an AI provider that classifies fields the rules cannot identify.
order: 2
---

# Setting up an AI provider

## Whether to use AI

AI is optional. Choose it under `AI プロバイダ` (AI provider) in the `AI 判定（任意）` (AI detection, optional) section of the settings page.

- Off (the default)
- Built-in browser AI
- OpenAI-compatible API
- Google Gemini

The AI only classifies fields that the rules cannot identify. It never produces the values to fill in. See [Supported forms and how it works](/en/guides/how-it-works/).

## OpenAI-compatible API

Pick a preset (OpenAI, Groq, Mistral, Ollama or LM Studio) and the base URL is filled in. Enter the model name yourself, and enter an API key.

The base URL has these rules.

- Only `https` is allowed. `http` is allowed only for `localhost` and `127.x.x.x`.
- A URL that contains credentials, a query or a fragment is rejected.
- Internal network addresses and IPv6 addresses are rejected.

If you change the origin of the base URL (scheme, host or port), the saved API key is not carried over. Enter the key again. To delete a saved key, tick `保存済みの API キーを削除する` (delete the saved API key) and save.

## Ollama and LM Studio (local)

For `localhost`, no API key is needed.

Ollama can reject requests from an extension origin with a 403 unless `OLLAMA_ORIGINS` allows them. Allow this value in `OLLAMA_ORIGINS`.

```text
chrome-extension://<extension ID>
```

## Google Gemini

Set these three items.

- Model name
- API version (the default is `v1beta`)
- API key

## Built-in browser AI

The model runs on your device and nothing is sent outside it. Turn on the browser flag, then restart the browser.

| Browser | Model | Flag |
|---|---|---|
| Chrome | Gemini Nano | `chrome://flags/#prompt-api-for-gemini-nano` |
| Edge | Phi-mini | `edge://flags/#edge-llm-prompt-api-for-phi-mini` |

The extension tries to download the model when you click `JushoAI で入力` (fill with JushoAI). Some browsers do not start the download automatically.

## Connection test and badge meanings

`接続テスト（保存済みの設定で実行）` (connection test, run with the saved settings) classifies one synthetic field using your saved settings. Save first, then test.

The result is `接続できました` (connected) or one of these.

- Setup is incomplete.
- Network access is not allowed.
- Authentication failed.
- The server refused the request. Check that the model supports JSON output.
- The connection failed.
- The response could not be interpreted.

The badge on the form shows the AI state. Click the badge to open guidance for that state. When setup is needed, the guidance has an `AI 設定を開く` (open AI settings) button. For what to do for each badge, see [Troubleshooting](/en/guides/troubleshooting/).

One `入力する` run sends at most 60 fields to the AI, 20 at a time. If one batch fails, the remaining batches are not sent and the rest of the run continues with the rules only. For OpenAI-compatible providers, if the server rejects a request with HTTP 400 or 422, the extension retries once in a compatible format (no temperature, `json_object`).

## Network permission

When you save the settings, the browser asks whether to allow network access to that provider. Without the permission, AI is not used and the badge shows `AI 権限なし` (AI permission missing). The permission is requested only for that provider's host. See [Privacy and what is sent](/en/guides/privacy/).
