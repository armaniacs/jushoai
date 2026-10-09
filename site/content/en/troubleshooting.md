---
title: Troubleshooting
description: What to do for each badge state, what to check when AI or filling does not work, and common questions.
order: 9
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
- Ollama returns 403: allow `chrome-extension://<extension ID>` in `OLLAMA_ORIGINS` on the Ollama side (in Firefox, the `moz-extension://<UUID>` shown on the settings page; the UUID changes with each install).
- The server refuses the request: check the model name, and check that the model supports JSON output.
- The connection fails: check the URL, the model name and the network.
- Network access is not allowed: save the settings again and allow access.
- The built-in AI is disabled: turn on the flag and restart the browser. For the flags, see [Setting up an AI provider](/en/guides/ai-providers/).

## When nothing is filled or the result is wrong

- The `JushoAI で入力` button does not appear: it appears only on a form with at least 3 text, email, tel or search inputs, select lists and radio button groups combined, where at least 2 can be identified. Hidden fields are not counted.
- The settings page opens: you have not registered a profile and at least one address.
- A field is not filled: only fields without a note are filled. The preview adds a note to fields that are already filled, too long, or have no matching option. `readonly` and `disabled` fields are skipped.
- Some fields are not supported: checkboxes and date fields are out of scope. Only gender and decade radio button groups are supported; other radio buttons are out of scope. Fields that cannot be identified are not filled.
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

It handles text, email, tel and search inputs, and select lists. The form needs at least 3 of them, and at least 2 must be identifiable. See [Supported fields](/en/guides/supported-fields/) for the fields it can fill.

### Ollama returns 403.

Ollama can reject requests from an extension origin with a 403 unless `OLLAMA_ORIGINS` allows them. Allow `chrome-extension://<extension ID>` in `OLLAMA_ORIGINS`. In Firefox, allow the `moz-extension://<UUID>` shown on the settings page; the UUID changes with each install.

### What do I check in the preview?

The list of fields and values. At the top you can choose the profile and address to use. Fields classified by AI are marked `AI判定` (decided by AI). Fields with a note are not filled. Close the preview with the Esc key or `キャンセル` (cancel).

### What does `AI で分析` do?

It has the AI you configured classify every field again. It rescues fields the rules could not identify. After the analysis you still need to approve with `入力する` (fill in).

### What do I see when I click the toolbar icon?

The list of registered profiles and addresses, and which ones are in use. `AI で分析` (analyze with AI) starts classification through preview for the form in the open tab. The gear at the top right opens the settings page.

### What does the connection test do?

It classifies one synthetic field using your saved settings. Save first, then test. Connection test calls are also recorded in the audit log.

### How many profiles can I register?

Up to 10. Once you reach 10, you can neither add nor duplicate one. Delete one to make room.

### How many addresses can I register?

Up to 10. Once you reach 10, you cannot add more.

### How do I use several profiles or addresses?

Choose the profile and address at the top of the preview. When an address is tied to a profile, switching the profile selects the tied address automatically.

### What if I register no profile or address?

Clicking `JushoAI で入力` (fill with JushoAI) opens the settings page instead. Register at least one profile and one address first.

### Are hiragana or half-width katakana fields filled?

Yes. The reading is converted to full-width katakana, hiragana, or half-width katakana to match each field.

### Are romaji fields filled?

Yes, when romaji family and given names are registered in the profile.

### The form has only one address field.

The prefecture through building are combined into that one field. The building follows the street number with a half-width space.

### The prefecture dropdown uses numbers.

Spelling variants such as `東京` and `東京都`, as well as numeric codes, are matched. When no option matches, the field gets a note and is not filled.

### The phone number is split in three.

The digits are split into the area code and the rest. Whether to add hyphens is decided from the placeholder and the maximum length.

### What about hyphens in the postal code?

They are decided from the placeholder and the maximum length. A 7-digit number is split into the first 3 and the last 4 digits.

### What goes into a decade field?

The decade derived from the birthday in the profile. Both dropdowns and decade radio button groups are supported.

### What goes into an era field?

The era derived from the birthday in the profile.

### What happens to fields that already have a value?

They are not overwritten. The preview adds the note `入力済みのため上書きしません` (already filled, so it will not be overwritten). Fields you fill yourself while the preview is open are not overwritten either.

### Are overlong values truncated?

No. A value longer than the maximum length gets a warning note and is not filled.

### What about checkboxes or date fields?

They are out of scope. Checkbox, date, file inputs and similar are never filled.

### What about radio buttons other than gender?

They are out of scope. Only gender and decade radio button groups are supported.

### Are multi-line fields filled?

No. Multi-line fields are out of scope.

### Where is my registered data stored?

Only inside this browser. It is never sent anywhere.

### Is my API key stored safely?

It is stored encrypted with AES-GCM. It is never shown on the settings page. Only whether one is saved is shown, and you can replace or delete it.

### Where can I check the communication log?

In `通信の監査ログ` (communication audit log) on the settings page, you can check the list, download, or delete it. Along with the date and time, provider, destination, model, page URL, number of fields sent, and result, the prompt sent to the model and its answer are kept for 7 days. Profile values are never recorded.

### Does it communicate just by opening a page?

No. Communication happens only when you click `JushoAI で入力` (fill with JushoAI). Checking the badge state only reads the saved settings and permissions, and makes no requests.

### A field stays empty even after re-analysis.

Filling it by hand is fine. JushoAI never breaks fields that already have a value. When re-analysis makes a form work, you can tell the developers with `開発に報告する` (send feedback) in the preview.

### I want a form to be supported.

Tell us about forms that could not be filled through the GitHub issue link at the bottom of the page. A form URL plus which fields were not filled makes it easier to check.

### Anything to watch for with the TSV file?

Values starting with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not run them as formulas. The file contains page addresses, so handling it is your own responsibility.

### I want to change or delete my API key.

Entering a new one on the settings page replaces it. Checking `保存済みの API キーを削除する` (delete the saved API key) and saving deletes it. Changing the base URL origin does not carry over the saved API key.

### I want to make a similar profile efficiently.

`このプロファイルを複製` (duplicate this profile) copies it, so you only fix what differs.

### My family shares one address.

Setting `使うプロファイル` (profile that uses it) to `共通` (shared) offers the address with any profile.

### How do I register an English address?

Fill `英語住所（任意）` (English address, optional) with the country, state or region, city, street, building and postal code in half-width alphanumeric characters. It is for forms with English fields.

### Preparing the built-in AI takes a while.

The model download is attempted when you click `JushoAI で入力` (fill with JushoAI). Some browsers do not start it automatically. While the badge shows `AI 未準備` (AI not ready) or `AI 準備中` (AI preparing), wait for it to finish.

### Several buttons appear.

`JushoAI で入力` (fill with JushoAI) appears on every form found. Click the button near the form you want to fill.

### Which browsers are supported?

Desktop Chromium browsers. Operation is confirmed on Edge.

### I want to change the audit log period.

It is fixed at 7 days and cannot be changed. `ログを削除` (delete the log) removes everything at any time.

### Does it work offline?

Without AI configured, there is no external communication and it runs on rules alone. A setup using an external AI provider needs network access.

### Must I write my address or name in a report?

No. Issues are public, so do not include personal information. Preview reports send only field metadata, never your profile values or the values already in fields.
