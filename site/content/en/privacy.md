---
title: Privacy and what is sent
description: What JushoAI sends and does not send, when it makes requests, and how API keys are stored.
order: 7
---

# Privacy and what is sent

## What is sent and what is not

Unless you configure AI, JushoAI makes no external requests.

Data is sent only when you have configured a provider other than the built-in AI and you click `JushoAI で入力` (fill with JushoAI). Only fields that the rules cannot identify are included. For each such field, the extension sends:

- An internal field ID. It is generated in the form `jai-N` and is not the HTML `id` attribute.
- `type` and `maxLength`.
- `name`, `htmlId` (the HTML `id` attribute), the label, the placeholder and the nearby heading. Each of these five is clipped to 80 characters.

These are never sent:

- Your profile values
- The values already in the fields
- The options of select lists
- `autocomplete` and `pattern`

Labels and headings are text from the page. They can contain personal information that the page shows.

## When requests happen

Requests happen only when you click `JushoAI で入力`. Opening a page does not contact an AI provider. Checking the badge state only reads the saved settings and permissions. It makes no request.

## Audit log

Every time an AI is called, JushoAI keeps a record on your device. On the settings page, open `通信の監査ログ` (communication audit log) to see the list, download or delete it. Calls to the built-in AI and connection tests are recorded too.

| Column | Meaning |
|---|---|
| `id` | Sequential number |
| `created_at` | When it was recorded (ISO 8601) |
| `provider` | `openai`, `gemini` or `built-in` |
| `host` | The host the request went to. Empty for the built-in AI |
| `model` | The model name. Empty for the built-in AI |
| `purpose` | `classify` (classification when filling) or `connection-test` |
| `page_url` | The address and path of the page you filled. No query or fragment. Empty for connection tests |
| `field_count` | How many fields were sent |
| `chunk_index` / `chunk_count` | The position within a run split into 20-field pieces. Empty when the run was not split |
| `result` | `success`, `auth-error`, `http-error`, `network-error`, `invalid-response` or `error` |
| `http_status` | The HTTP status. Empty when no response arrived, and for the built-in AI |
| `retried` | Whether the request was retried in compatibility mode |
| `duration_ms` | How long the call took, in milliseconds |
| `request` | The full prompt sent to the model. It contains field metadata only |
| `response` | What the model answered. Over 2,000 characters are cut to the head with a trailing `…` |

The list is newest first, and each row shows the target page URL. Opening a record shows the prompt sent to the model, the model's answer, and the system prompt (shared by every call). If you call the AI while the settings page is open, `最新のログを読み込む` (load the latest logs) pulls in the newest records.

The prompt carries field metadata only, so your profile values, the values already in fields, API keys and request headers can never be recorded.

Records are kept for 7 days and then deleted automatically. The period cannot be changed. If there are more than 1,000 records, or the records grow too large in total, the oldest are deleted first. You can delete everything at any time with `ログを削除` (delete the log). Nothing is recorded while AI is off.

`TSV でダウンロード` (download as TSV) saves a TSV file named `jushoai-audit-log-YYYY-MM-DD.tsv`, newest first. It includes the field contents sent and the answers. Values starting with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not run them as formulas. The file contains page addresses and field contents, so handling it is your own responsibility.

## How API keys are stored

API keys are encrypted with AES-GCM before they are saved. The encryption key is stored in a non-extractable form in a separate store (IndexedDB). If only the storage leaks, the keys cannot be decrypted. The extension's own code can still read them.

The settings page never shows a key. It shows only whether one is saved, and lets you replace or delete it.

## Network permission

The extension does not ask for network access at install time. When you save the settings, it asks for access to that provider's host only (an optional permission). Without the permission, AI is not used. In Firefox, it also asks for your consent to send website content (the field metadata) to the provider, as a data collection permission, in the same request.

## With the built-in AI

The built-in browser AI runs on your device and sends nothing outside it. For setup, see [Setting up an AI provider](/en/guides/ai-providers/).
