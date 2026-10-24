---
title: Tips and tools
description: Filling a single field, importing from a form, export and import, learned mappings, and other details of the settings page and forms.
order: 5
---

# Tips and tools

## Fill just one field

Use this when you want to fill one field instead of the whole form.

- Put the cursor in the field and press Alt+J.
- Right-click the field and choose "JushoAI: この欄に入力" (the menu text is in Japanese).

Both use rules only, with no AI. The value to be entered appears in a confirmation panel, and nothing is filled until you confirm. A field that already has a value, a read-only field, or a value longer than the field allows is not filled, and the reason is shown. It does nothing on excluded URLs.

## The settings page

The menu on the left of the settings page leads to these screens.

| Screen | What you can do |
|---|---|
| `プロファイル` (Profiles) | Register name, furigana, email and phone |
| `住所` (Addresses) | Register addresses |
| `AI 判定` (AI detection) | Choose an AI provider and run the connection test |
| `起動しないURL` (Excluded URLs) | List pages where JushoAI should not run |
| `覚えた対応付け` (Learned mappings) | Review and remove field meanings you taught with the fix button in the preview |
| `通信の監査ログ` (Audit log) | Review, download or delete the record of AI calls |

## Import from a form

The import-from-form button on the profile and address screen builds a draft of your registration from the values in the form on the open tab, including values the browser auto-filled.

- Press it while the tab with the form is open.
- Only values that fit the expected format become part of the draft.
- If the first card is empty, the draft goes into it. A card that already has values is never overwritten; a new card is created instead.
- Nothing is saved until you press Save.

## Export and import

You can write your profiles and addresses to a JSON file and import it elsewhere. This helps when you switch browsers or register again after using a temporary add-on in Firefox.

- The exported file contains your profiles and addresses as plain text. Handle it with care.
- On import, a profile or address with the same ID is overwritten and a new ID is added. Each is limited to 10.
- A confirmation appears before importing, and unsaved input is discarded.
- Files larger than 5 MB cannot be imported.

## Learned mappings

When you correct what a field means in the preview, JushoAI remembers the mapping for that domain and treats the same field that way from the next classification. The list appears on the Learned mappings screen. You can remove a row, and the original judgment returns from the next classification. Only the field's signature and category are shown, never a profile value.

## Undo

Right after filling, the undo button in the preview restores only the fields JushoAI filled. See [How JushoAI keeps your data safe](/en/guides/safety/) for how it works.

## What to read next

- [Toolbar and filling a form](/en/guides/popup-and-fill/)
- [How JushoAI keeps your data safe](/en/guides/safety/)
- [Troubleshooting](/en/guides/troubleshooting/)
