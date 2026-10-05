---
title: Troubleshooting
description: What to do for each badge state, what to check when AI or filling does not work, and common questions.
order: 5
---

# Troubleshooting

## Badge states and what to do

Click the badge to open guidance for its state. When setup is needed, the guidance has an `AI 設定を開く` (open AI settings) button.

| Badge | State | What to do |
|---|---|---|
| `AI: オフ` (AI off) | The provider is set to off. | To use AI, choose a provider on the settings page. |
| `AI 未設定` (AI not configured) | Settings are missing (base URL, model name, API key and so on). This is also shown when the saved API key cannot be decrypted. | Enter the settings again on the settings page. |
| `AI 権限なし` (AI permission missing) | Network access is not allowed. | Save the settings again and allow access. |
| `AI 認証エラー` (AI authentication error) | The provider rejected the authentication. | Check the API key. For a local server such as Ollama, check `OLLAMA_ORIGINS`. |
| `AI: OpenAI 互換` / `AI: Gemini` | The provider is available. | Nothing. |
| `AI 有効` (AI enabled) | The built-in browser AI is available. | Nothing. |
| `AI 未準備` (AI not ready) | The built-in AI model is not downloaded yet. | Click `JushoAI で入力` (fill with JushoAI) and the extension tries to download it. |
| `AI 準備中` (AI preparing) | The built-in AI model is downloading. | Wait for it to finish. |
| `AI 無効` (AI disabled) | The built-in AI cannot be used (flag, device requirements, unsupported browser and so on). | Click the badge to see the guidance. Check the flag. |

## When the AI does not work

First run `接続テスト（保存済みの設定で実行）` (connection test, run with the saved settings) on the settings page. Save before you run it.

- Authentication fails: check the API key.
- Ollama returns 403: allow `chrome-extension://<extension ID>` in `OLLAMA_ORIGINS` on the Ollama side.
- The server refuses the request: check the model name, and check that the model supports JSON output.
- The connection fails: check the URL, the model name and the network.
- Network access is not allowed: save the settings again and allow access.
- The built-in AI is disabled: turn on the flag and restart the browser. For the flags, see [Setting up an AI provider](/en/guides/ai-providers/).

## When nothing is filled or the result is wrong

- The `JushoAI で入力` button does not appear: it appears only on a form with at least 3 text, email, tel or search inputs and select lists, where at least 2 can be identified. Hidden fields are not counted.
- The settings page opens: you have not registered a profile and at least one address.
- A field is not filled: only fields without a note are filled. The preview adds a note to fields that are already filled, too long, or have no matching option. `readonly` and `disabled` fields are skipped.
- Some fields are not supported: checkboxes, radio buttons and date fields are out of scope. Fields that cannot be identified are not filled.
- The postal code is filled last: this avoids conflicts with forms that complete the address automatically.

For details on how fields are identified, see [Supported forms and how it works](/en/guides/how-it-works/).

## FAQ

### Does it work without AI?

Yes. The rules identify the fields. AI is used only to classify fields the rules cannot identify. Unless you configure AI, JushoAI makes no external requests.

### What is sent?

Only when you configure an AI provider other than the built-in browser AI, the extension sends metadata for fields the rules cannot identify: the internal field ID, `name`, `htmlId`, the label, the placeholder, the nearby heading, `type` and `maxLength`. It never sends your profile values. Labels and headings are text from the page, so they can contain personal information that the page shows. Data is sent only when you click `JushoAI で入力`. For details, see [Privacy and what is sent](/en/guides/privacy/).

### I am worried about wrong input.

The preview lets you check fields and values before anything is filled. Only fields without a note are filled. Fields that already have a value are not overwritten, and a value longer than the maximum length is not filled.

### Which forms does it work on?

It handles text, email, tel and search inputs, and select lists. The form needs at least 3 of them, and at least 2 must be identifiable. Items such as date of birth are not handled. Gender is supported for select lists only.

### Ollama returns 403.

Ollama can reject requests from an extension origin with a 403 unless `OLLAMA_ORIGINS` allows them. Allow `chrome-extension://<extension ID>` in `OLLAMA_ORIGINS`.
