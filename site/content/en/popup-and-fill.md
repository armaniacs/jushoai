---
title: Toolbar and filling a form
description: How to check what is registered from the toolbar icon, and how to use the form button, the preview and re-analysis.
order: 4
---

# Toolbar and filling a form

## The toolbar icon

Click the JushoAI icon in the browser toolbar to open `登録内容の確認` (review of registered data).

- A list of registered profiles and addresses
- Which profile and address are in use
- The profile each address belongs to (addresses with no profile show as `共通`, shared)
- The gear at the top right, or `設定を開く` (open settings), takes you to the settings page
- `AI で分析` (analyze with AI) starts classification through preview for the form in the open tab. On a tab without a form it shows why instead

If no profile or address is registered yet, it shows guidance for registering them.

## Fill a form

A `JushoAI で入力` (fill with JushoAI) button appears near a form that has several fields for name, address and similar items. The badge next to it shows the AI status.

The button appears where it does not overlap any fields. If it still gets in the way, drag it out of the way (or focus it and use the arrow keys). Its background is translucent, so a field it covers stays readable.

- A moved position is kept after scrolling and resizing
- With the arrow keys, hold Shift to move in larger steps

1. Click `JushoAI で入力`. A preview opens.
2. At the top, choose the profile and address to use.
3. Review the list of fields and values. Fields with a note are not filled.
4. Click `入力する` (fill in). When some fields could not be applied, the button shows `一部のみ適用` (partially applied, x/y fields), followed by a persistent `一部のみ適用 (x/y fields) 要確認` (needs checking) reminder.

| Note | Meaning |
|---|---|
| 入力済みのため上書きしません | The field already has a value. |
| 文字数を超えるため入力しません | The value is longer than the maximum length. It is not truncated and not entered. |
| 一致する選択肢がないため入力しません | The dropdown has no matching option. |
| プロファイルに値がないため入力しません | The profile has no value registered for that field. |

After filling, the undo button in the preview restores only the fields JushoAI filled. To fill a single field, see [Tips and tools](/en/guides/shortcuts-and-tools/).

Fields classified by AI are marked `AI判定` (decided by AI). Close the preview with the Esc key or `キャンセル` (cancel).

## URLs where JushoAI does not start

On pages where filling forms is not the task, such as spreadsheets and mail, the button only gets in the way. Register a URL under `起動しないURL` (URLs where it does not start) in the settings page, and JushoAI stays out of any page whose URL starts with it.

1. Open `起動しないURL` in the settings page.
2. Type a URL and click `追加` (add).
3. Click `保存` (save).

- Example: registering `https://docs.google.com/spreadsheets/` keeps JushoAI out of every spreadsheet under it. `https://docs.google.com/document/` on the same host is unaffected
- A URL matches when it starts with the registered text (case-insensitive)
- Saving takes effect on already open pages: the button disappears there
- Up to 100 URLs can be registered, and only URLs starting with `http://` or `https://` are accepted

Removing an entry from the list and saving brings the button back.

## Analyze with AI

If some fields could not be classified by the rules, use `AI で分析` (analyze with AI) in the preview to have the AI you configured classify them again. Once configured, fields the rules could not identify can also be classified by AI. See [Setting up an AI provider](/en/guides/ai-providers/) for the AI settings.

If re-analysis makes a form work, you can tell the developers with `開発に報告する` (send feedback). It opens a public GitHub issue and sends only field metadata, never your profile values.

## What to read next

- [Supported fields](/en/guides/supported-fields/)
- [Troubleshooting](/en/guides/troubleshooting/)
