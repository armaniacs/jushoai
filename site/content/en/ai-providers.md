---
title: Setting up an AI provider
description: How to choose and configure an AI provider that classifies fields the rules cannot identify.
order: 6
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
- Internal network addresses and IPv6 addresses are rejected. When you save the URL, the host name is resolved with DNS, and the URL is rejected only when the resolved address is confirmed to be an internal one (private, loopback or link-local). Names that resolve into internal addresses, such as nip.io or sslip.io, cannot be saved either. When the resolver cannot be reached or the name cannot be resolved, saving continues with a warning that the verification was skipped.
- The resolved address is re-checked right before each classify and connection-test call. When the address is confirmed to be internal, that call is not made and the rest of the run continues with the rules only. When the resolver is unreachable or the name cannot be resolved, the check is skipped and the call proceeds; the lexical checks on the host name still apply. Resolutions are cached with a TTL (30 seconds), and the resolver-unreachable verdict is cached with the same TTL.

If you change the origin of the base URL (scheme, host or port), the saved API key is not carried over. Enter the key again. To delete a saved key, tick `保存済みの API キーを削除する` (delete the saved API key) and save.

## Ollama and LM Studio (local)

For `localhost`, no API key is needed.

Ollama can reject requests from an extension origin with a 403 unless `OLLAMA_ORIGINS` allows them. Add the following value to `OLLAMA_ORIGINS`.

```text
chrome-extension://<extension ID>
```

In Firefox, allow `moz-extension://<UUID>` instead. The UUID is shown on the settings page and changes with each install.

## Google Gemini

Set these three items.

- Model name
- API version (the default is `v1beta`)
- API key

## Built-in browser AI

The model runs on your device and nothing is sent outside it. In Chrome and Edge, turn on the browser flag, then restart the browser. The built-in AI is not available in Firefox.

| Browser | Model | Flag |
|---|---|---|
| Chrome | Gemini Nano | `chrome://flags/#prompt-api-for-gemini-nano` |
| Edge | Phi-mini | `edge://flags/#edge-llm-prompt-api-for-phi-mini` |

The extension tries to download the model when you click `JushoAI で入力` (fill with JushoAI). Some browsers do not start the download automatically.

## Connection test and badge meanings

`接続テスト（保存済みの設定で実行）` (connection test, run with the saved settings) classifies one synthetic field using your saved settings. Save first, then test.

The result is `接続できました` (connected) or one of these.

- Setup is incomplete: enter the settings again on the settings page.
- Network access is not allowed: save the settings again and allow access.
- Authentication failed: check the API key.
- The server refused the request: check the model name and that the model supports JSON output.
- The connection fails: check the URL, the model name and the network.
- The response could not be interpreted: check that the model supports JSON output.

The badge on the form shows the AI state. Click the badge to open guidance for that state. When setup is needed, the guidance has an `AI 設定を開く` (open AI settings) button. For what to do for each badge, see [Troubleshooting](/en/guides/troubleshooting/).

One `入力する` run sends at most 60 fields to the AI, 20 at a time. If one batch fails, the remaining batches are not sent and the rest of the run continues with the rules only. For OpenAI-compatible providers, if the server rejects a request with HTTP 400 or 422, the extension retries once in a compatible format (no temperature, `json_object`).

## Network permission

When you save the settings, the browser asks whether to allow network access to that provider. Without the permission, AI is not used and the badge shows `AI 権限なし` (AI permission missing). The permission is requested only for that provider's host. See [Privacy and what is sent](/en/guides/privacy/).

## Checking the communication log

Communication with the API can be checked in `通信の監査ログ` (communication audit log) on the settings page. Records are kept on your device for 7 days. Along with the date and time, provider, destination, model, page URL, number of fields sent, and result, the prompt sent to the model and its answer are recorded. You can check the list, download a TSV, or delete the log. Profile values are never recorded. See [Privacy and what is sent](/en/guides/privacy/).
