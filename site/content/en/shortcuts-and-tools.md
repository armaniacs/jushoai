---
title: Single-field fill, import, export and management
description: Filling a single field, the settings page layout, importing from a form, exporting and importing JSON, learned mappings, and undoing fills.
order: 6
---

# Single-field fill, import, export and management

Beyond filling an entire form at once, you can fill a single field on demand, draft registrations from an open form, back up or move your data between browsers, teach site-specific field meanings, and undo a fill.

## Fill just one field

Use this when you want to fill one field instead of the whole form.

- Put the cursor in the field and press `Alt+J`.
- Or right-click the field and choose `JushoAI: この欄に入力` (fill this field with JushoAI; the menu text is in Japanese).

Both run the same rule pipeline (including furigana conversion), your learned mappings for that site, and multi-page carryover within the same tab, with no AI and no external requests.

- Before injecting anything, the `この欄に入力` (fill this field) confirmation panel opens so you can check the value (`注入する` to fill, `キャンセル` or Esc to cancel).
- Already-filled fields, `readonly` or `disabled` fields, values exceeding `maxlength` or failing `pattern`, dropdowns with no matching option, missing profile values, and unclassifiable fields are never filled—instead `この欄には入力できません` (cannot fill this field) shows the reason.
- It does nothing on excluded URLs (`起動しないURL`).

## The settings page

The menu on the left of the settings page leads to these screens. Items with saved entries or logs display their current count next to the label (for example, `プロファイル (2)`).

| Screen | What you can do |
|---|---|
| `プロファイル` (Profiles) | Register name, furigana, birthday, school/workplace, email and phone |
| `住所` (Addresses) | Register domestic and English addresses |
| `AI 判定` (AI detection) | Choose an AI provider and run the connection test |
| `起動しないURL` (Excluded URLs) | List pages where JushoAI should not run |
| `覚えた対応付け` (Learned mappings) | Review and remove field meanings you taught with `直す` in the preview |
| `通信の監査ログ` (Audit log) | Review, download as TSV, or delete the record of AI calls |

At the bottom of the left sidebar is a `不具合報告` (report a bug) link (`公開 issue が開きます。値は送りません` — opens a public GitHub issue without sending values), which opens a pre-filled template containing only the extension version.

## Import from a form

Clicking `フォームから取り込む` (import from form) on the Profile or Address screen builds a draft of your registration from values already filled in the form on the open tab—including values autofilled by your browser.

- It reads the form on the active tab in the current window—make sure the tab with the form open is the active target when you press it (runs rules only with no external sending, and ignores pages registered in `起動しないURL`).
- Furigana fields are also picked up and placed into the kana draft fields (`セイ` / `メイ`).
- Only values that match the expected format and pass validation become part of the draft.
- If the first card is empty, the draft goes into it. A card that already has values is never overwritten; a new card (`新規`) is created instead.
- If no fields can be imported or the import fails, no empty leftover card is created.
- Nothing is saved to storage until you press `保存` (save).

## Export and import

You can write your profiles and addresses to a single JSON file and import it elsewhere. This helps when you switch browsers or re-register after closing a temporary add-on in Firefox.

- Uninstalling the extension deletes your profiles and addresses. Export them to JSON before that.
- `JSON でエクスポート` (export as JSON) prompts for confirmation because the file contains your profiles and addresses as plain text. Handle the file with care.
- `JSON をインポート` (import JSON) merges by ID: a profile or address with the same ID is overwritten and a new ID is added, up to 10 each. Invalid records are rejected.
- A confirmation dialog appears before importing, and unsaved edits on the page are discarded.
- Files larger than 5 MB cannot be imported.

## Learned mappings

When a field is misclassified or unrecognized in the preview, you can teach JushoAI what it means:

1. Click `直す` (fix) on that row in the preview.
2. In `この欄の意味を直す` (correct field meaning), pick the right category under `意味` (meaning).
3. Keep `このサイトに覚えさせる` (remember for this site) checked (checked by default) if you want JushoAI to remember it for this domain, then click `決める` (decide).

From the next classification on that domain, your taught meaning overrides the rule judgment. In addition, **fields you taught are automatically excluded from AI transmission**, so even with AI enabled their metadata is never sent to an AI provider ([Privacy and what is sent](./privacy.md)).

You can inspect or delete taught entries anytime under `覚えた対応付け` (learned mappings) on the settings page (up to 500 entries). Only the domain, field signature (`name` or `id`), and category are stored—never profile values. Deleting a row restores the original judgment on the next run.

## Undo

Right after filling, `元に戻す` (undo) on the result screen restores only the fields JushoAI filled back to empty. Fields you edited afterward are left alone. See [How JushoAI keeps your data safe](./safety.md) for how it works.

## What to read next

- [Filling forms and the toolbar](./popup-and-fill.md)
- [Everyday scenarios (family, multi-page, revisits)](./scenarios.md)
- [How JushoAI keeps your data safe](./safety.md)
- [Troubleshooting](./troubleshooting.md)
