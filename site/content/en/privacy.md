---
title: Privacy and what is sent
description: What JushoAI sends and does not send, pre-send review, data kept strictly on your device, the audit log, and how API keys are stored.
order: 10
---

# Privacy and what is sent

## What is sent and what is not

Unless you configure AI, JushoAI makes no external requests.

Data is sent externally only when you have configured a provider other than the built-in AI and you click `JushoAI で入力` (fill with JushoAI) or `AI で分析` (analyze with AI). Only fields that the rules cannot identify are included. The connection test on the settings page sends only one synthetic test field. For each such field, the extension sends:

- An internal field ID. It is generated in the form `jai-N` and is not the HTML `id` attribute.
- `type` and `maxLength`.
- `name`, `htmlId` (the HTML `id` attribute), the `label`, the `placeholder` and the nearby heading (`nearby`). Each of these five is clipped to 80 characters.

These are never sent:

- Your profile values
- The values already in the fields
- The options of `select` lists
- `autocomplete` and `pattern`

Labels and headings are text from the page. They can contain personal information that the page shows.

## Pre-send review and automatic exclusions

When AI is enabled and there are fields the rules cannot identify, the `AI判定で送る内容` (what AI detection sends) panel opens before anything is sent.

- Nothing is sent until you review the metadata in the panel and click `AI判定する` (run AI detection).
- Fields whose page label, heading, or other text looks like a name, address, phone number, email, or postal code are marked `（要確認）` (needs check) and have `送らない` (do not send) checked by default.
- Choosing `ルールのみで入力する` (fill with rules only), closing the panel, or pressing Esc sends nothing and continues with rules only.
- Fields you already taught via `直す` (learned mappings) in the preview are automatically excluded and never sent to AI.

## When requests happen

Requests happen only when you click `JushoAI で入力` or `AI で分析`, or run `接続テスト` (connection test) on the settings page. Opening a page does not contact an AI provider. Checking the badge state only reads the saved settings and permissions. It makes no request.

The destination host is verified down to its resolved address when you save the settings; the save is rejected when the address resolves into an internal network address (including IPv6 translation prefixes such as NAT64 and 6to4) or when the resolution cannot be confirmed. The resolved address is re-checked right before each call, and the call is not made when the address is confirmed to be internal or when the resolution cannot be confirmed; the rest of the run continues with the rules only. The lexical checks on the host name still apply. The host is resolved again on every call (per-call); a previous result is never carried into the next call. The verification and the actual connection are separate name resolutions, so a change of the resolved address between them (DNS rebinding) cannot be fully ruled out.

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
| `page_url` | Only the origin (scheme, host and port) of the page you filled. No path, query or fragment. Empty for connection tests |
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

However, field metadata includes page-derived text (`label`, nearby headings and the like), so personal information shown on the page can end up in the records. Handle the records at your own responsibility.

What a record looks like (fictitious values, not real personal information):

- `request` example: the full prompt sent. It contains only field metadata, like `[{"id":"jai-3","name":"sei","htmlId":"","label":"お名前（セイ）","placeholder":"例：ヤマダ","nearby":"会員登録","type":"text","maxLength":20}]`
- `response` example: `{"jai-3": "lastNameKana"}`. Over 2,000 characters are cut to the head with a trailing `…`
- `page_url` example: `https://example.com`. Origin (scheme, host and port) only; no path, query or fragment

Records are kept for 7 days and then deleted automatically. The period cannot be changed. If there are more than 1,000 records, or the records grow too large in total, the oldest are deleted first. The total size is measured in UTF-8 bytes, the unit the browser's storage quota actually charges. You can delete everything at any time with `ログを削除` (delete the log). Nothing is recorded while AI is off.

`TSV でダウンロード` (download as TSV) saves a TSV file named `jushoai-audit-log-YYYY-MM-DD.tsv`, newest first. It includes the field contents sent and the answers. Values starting with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not run them as formulas. The file contains page addresses and field contents, so handling it is your own responsibility.

## Data stored or kept strictly on your device

Apart from AI settings and the audit log, the following data stays strictly on your device and is never sent externally. Profile and address values are not encrypted (they are stored in plain text).

| Data | Storage location and contents | Encrypted | Kept for | How to delete | Sent externally |
|---|---|---|---|---|---|
| Profiles and addresses | Browser storage (`chrome.storage.local`, key `jushoai:data`). Your registered personal data (written to plain JSON only when you explicitly export) | No (plain text) | Until you delete it | Delete from the settings page (`このプロファイルを削除` / `この住所を削除`) | Never |
| Learned mappings | Browser storage (key `jushoai:field-mappings`). Domain + field signature (`name` / `id`) to category only (up to 500 entries). No profile values | No (plain text) | Oldest are deleted past the cap | Delete from the list on the settings page | Never |
| Approval memory for shortened preview | Browser storage (key `jushoai:site-approvals`). Digests (hashes) of approved rows and selected IDs only (up to 100 sites). No raw values or labels | No (plain text) | Oldest are deleted past the cap | Automatic deletion past the cap only | Never |
| Per-site profile hints | Browser storage (key `jushoai:site-profile-assignments`). Host name to profile ID only (up to 100 sites). No profile values | No (plain text) | Oldest are deleted past the cap | Automatic deletion past the cap only | Never |
| Temporary memory (`元に戻す`, `ゲストで入力`, multi-page carryover) | Tab memory only. Not saved to storage or audit logs; disappears when the tab closes | Not applicable (never stored) | Disappears when the tab closes | Close the tab | Never |

The audit log and API keys are described in detail in `Audit log` and `How API keys are stored` above. In short: the audit log stays in `chrome.storage.local` (key `jushoai:audit-log`) in plain text and is deleted automatically after 7 days (oldest first when past the cap). You can delete it at any time with `ログを削除` (delete the log) on the settings page. Page-derived text can contain personal information, so handle the records at your own responsibility. API keys are saved in `chrome.storage.local` (key `jushoai:ai-settings`) encrypted with AES-GCM and are kept until replaced or deleted. Checking `保存済みの API キーを削除する` (delete the saved API key) and saving on the settings page removes them.

## How API keys are stored

API keys are encrypted with AES-GCM before they are saved. The encryption key is stored in a non-extractable form in a separate store (IndexedDB). If only the storage leaks, the keys cannot be decrypted. The extension's own code can still read them.

The settings page never shows a key. It shows only whether one is saved, and lets you replace or delete it.

## Network permission

The extension does not ask for network access at install time. When you save the settings, it asks for access to that provider's host and the verification resolver (`dns.google`) only (an optional permission). The permission is per host and does not distinguish ports, so it also covers the other ports on the same host. Actual requests go only to the saved endpoint. Without the permission, AI is not used. In Firefox, it also asks for your consent to send website content (the field metadata) to the provider, as a data collection permission (`websiteContent`), in the same request.

## Reports to developers (GitHub Issues)

Reporting features open a pre-filled GitHub Issue draft only when you explicitly opt in or press a report button. None of them ever include your profile values or values already in fields.

- **Partial-apply report (`内訳をissueで報告`)**: includes only counts per result (applied, already filled, too long, etc.), a minimized page URL (origin + first path segment), provider name, and extension version. No field metadata or category names are included.
- **Re-analysis report (`開発に報告する`)**: includes the minimized page URL, provider name, extension version, before/after classifications, and field metadata (`name`, `htmlId`, `label`, `placeholder`, nearby heading, clipped to 80 characters each). If page text contains personal information, remove it before submitting the Issue.
- **Bug report from settings (`不具合報告`)**: opens an empty template with only the extension version.

## Other safeguards

Safeguards while filling, destination checks and UI isolation are described in [How JushoAI keeps your data safe](./safety.md).

## With the built-in AI

The built-in browser AI runs on your device and sends nothing outside it. For setup, see [Setting up an AI provider](./ai-providers.md).
