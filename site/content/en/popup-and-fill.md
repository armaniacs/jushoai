---
title: Toolbar and filling a form
description: How to check what is registered from the toolbar icon, and how to use the form button, the preview and re-analysis.
order: 4
---

# Toolbar and filling a form

## The toolbar icon

Click the JushoAI icon in the browser toolbar to open `入力内容の確認` (review of registered data).

- A list of registered profiles and addresses
- Which profile and address are in use
- The profile each address belongs to (addresses with no profile show as `共通`, shared)
- The gear at the top right, or `設定を開く` (open settings), takes you to the settings page

If no profile or address is registered yet, it shows guidance for registering them.

## Fill a form

A `JushoAI で入力` (fill with JushoAI) button appears near a form that has several fields for name, address and similar items. The badge next to it shows the AI status.

1. Click `JushoAI で入力`. A preview opens.
2. At the top, choose the profile and address to use.
3. Review the list of fields and values. Fields with a note are not filled.
4. Click `入力する` (fill in).

| Note | Meaning |
|---|---|
| 入力済みのため上書きしません | The field already has a value. |
| 文字数を超えるため入力しません | The value is longer than the maximum length. It is not truncated and not entered. |
| 一致する選択肢がないため入力しません | The dropdown has no matching option. |

Fields classified by AI are marked `AI判定` (decided by AI). Close the preview with the Esc key or `キャンセル` (cancel).

## Re-analyze with an LLM

If some fields could not be classified by the rules, use `LLM で再分析` (re-analyze with an LLM) in the preview to have the AI you configured classify them again. See [Setting up an AI provider](/en/guides/ai-providers/) for the AI settings.

If re-analysis makes a form work, you can tell the developers with `開発にFBする` (send feedback). It opens a public GitHub issue and sends only field metadata, never your profile values.

## What to read next

- [Supported fields](/en/guides/supported-fields/)
- [Troubleshooting](/en/guides/troubleshooting/)
