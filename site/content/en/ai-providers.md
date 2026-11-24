---
title: Setting up an AI provider
description: How to choose and configure an AI provider that classifies fields the rules cannot identify, and how pre-send review works.
order: 8
---

# Setting up an AI provider

## Whether to use AI

AI is optional. The default is `使わない（ルールのみ）` (off, rules only), and rule-based filling works without any AI setup. To use AI, choose a provider under `AI プロバイダ` (AI provider) in the `AI 判定（任意）` (AI detection, optional) section of the settings page.

- `使わない（ルールのみ）` (off, rules only)
- `ブラウザ内蔵 AI` (built-in browser AI: Chrome and Edge; requires device support and a flag)
- `OpenAI 互換 API` (OpenAI-compatible API: OpenAI, Groq, Mistral, Ollama, LM Studio, and more)
- `Google Gemini`

The AI only classifies fields that the rules cannot identify. It never produces the values to fill in. See [Supported forms and how it works](./how-it-works.md).

## Pre-send review (what AI detection sends)

When AI is enabled and a form has fields the rules cannot identify, JushoAI opens the `AI判定で送る内容` (what AI detection sends) panel before sending anything to the provider.

- You can inspect the exact metadata (`name`, `id`, `label`, `placeholder`, nearby heading, `type`, and `maxLength`) that will be sent.
- Fields whose label, heading, or other text looks like personal information are marked `（要確認）` (needs check) and have `送らない` (do not send) checked by default. Uncheck `送らない` only if you have confirmed it is safe to send.
- Fields you already taught with `直す` (fix) in the preview (learned mappings) are excluded automatically and never sent to AI.
- Clicking `ルールのみで入力する` (fill with rules only), closing the panel, or pressing Esc sends nothing and continues with rules only. Only clicking `AI判定する` (run AI detection) sends the remaining fields.

## OpenAI-compatible API

Pick a preset (OpenAI, Groq, Mistral, Ollama or LM Studio) and the base URL is filled in. Enter the model name and API key yourself.

The base URL has these rules.

- Only `https` is allowed. `http` is allowed only for `localhost` and `127.0.0.1`.
- A URL that contains credentials, a query or a fragment is rejected.
- Internal network addresses and IPv6 addresses are rejected. When you save the URL, the host name is resolved with DNS, and the URL is rejected if it resolves into an internal address (private, loopback, link-local, including IPv6 translation prefixes such as NAT64 and 6to4) or when the resolution cannot be confirmed. Names that resolve into internal addresses, such as nip.io or sslip.io, cannot be saved either.
- The resolved address is re-checked right before each classify and connection-test call. If it resolves into an internal address or the resolution cannot be confirmed, that call is not made and the rest of the run continues with the rules only; the lexical checks on the host name still apply. The host is resolved again on every call (per-call); a previous result is never carried into the next call.
- Enter only the URL of a provider you trust as the base URL.

If you change the origin of the base URL (scheme, host or port), the saved API key is not carried over. Enter the key again. To delete a saved key, tick `保存済みの API キーを削除する` (delete the saved API key) and save.

Before anything is sent to a saved endpoint for the first time, approve it on the settings page. Below the saved endpoint you will see the list of IP addresses the host name resolves to with DNS and a `この接続先を承認する` (approve this endpoint) button. Check that the destination is what you expect before approving; nothing is sent to that endpoint until you approve it. If you see an unfamiliar address, do not approve and check the base URL instead.

## Ollama and LM Studio (local)

For `localhost`, no API key is needed.

Ollama can reject requests from an extension origin with a 403 unless `OLLAMA_ORIGINS` allows them. Add the following value to `OLLAMA_ORIGINS`.

```text
chrome-extension://<extension ID>
```

In Firefox, allow `moz-extension://<UUID>` instead. The UUID is shown on the settings page and changes with each install, so re-enter it after reinstalling.

## Google Gemini

Set these three items.

- Model name
- API version (the default is `v1beta`)
- API key

Requests go to Google's fixed endpoint, which you cannot change. The saved-endpoint verification (re-resolving right before each call) is therefore not applied.

## Built-in browser AI

The model runs on your device and nothing is sent outside it. In Chrome and Edge, turn on the browser flag, then restart the browser.

| Browser | Model | Flag |
|---|---|---|
| Chrome | Gemini Nano | `chrome://flags/#prompt-api-for-gemini-nano` |
| Edge | Phi-mini | `edge://flags/#edge-llm-prompt-api-for-phi-mini` |

The extension tries to download the model when you click `JushoAI で入力` (fill with JushoAI). Some browsers do not start the download automatically.

Firefox does not include the built-in browser AI (Prompt API), so this option is hidden and cannot be selected there. If settings saved with the built-in provider are loaded in Firefox, JushoAI automatically falls back to rule-only mode (`使わない`) and displays a notice on the settings page.

## Connection test and badge meanings

`接続テスト（保存済みの設定で実行）` (connection test, run with the saved settings) classifies one synthetic field using your saved settings. Save first, then test. To prevent accidental repeated charges, the button is disabled for about 3 seconds right after a test, and extra clicks send no additional requests.

The result is `接続できました` (connected) or one of these.

- Setup is incomplete: enter the settings again on the settings page.
- Network access is not allowed: save the settings again and allow access.
- Authentication failed: check the API key.
- The server refused the request: check the model name and that the model supports JSON output.
- The connection fails: check the URL, the model name and the network.
- The response could not be interpreted: check that the model supports JSON output.

The badge on the form shows the AI state. Click the badge to open guidance for that state. When setup is needed, the guidance has an `AI 設定を開く` (open AI settings) button. For what to do for each badge, see [Troubleshooting](./troubleshooting.md).

One fill run sends at most 60 fields to the AI, 20 at a time. If one batch fails, the remaining batches are not sent and the rest of the run continues with the rules only. For OpenAI-compatible providers, if the server rejects a request with HTTP 400 or 422, the extension retries once in a compatible format (no temperature, `json_object`).

## Network permission

When you save the settings, the browser asks whether to allow network access to that provider. Without the permission, AI is not used and the badge shows `AI 権限なし` (AI permission missing). The permission is requested for that provider's host and for the resolver (dns.google) used for verification at save time and right before each call. The permission is per host and does not distinguish ports: it also covers the other ports on the same host. Actual requests go only to the saved endpoint.

In Firefox, saving a cloud provider also asks for your consent to send website content (field metadata) to the provider under data collection permissions (`websiteContent`). See [Privacy and what is sent](./privacy.md).

## Checking the communication log

Communication with the API can be checked in `通信の監査ログ` (communication audit log) on the settings page. Records are kept on your device for 7 days. Along with the date and time, provider, destination, model, page URL (origin only), number of fields sent, and result, the prompt sent to the model and its answer are recorded. You can check the list, download a TSV, or delete the log. Profile values are never recorded. See [Privacy and what is sent](./privacy.md).
