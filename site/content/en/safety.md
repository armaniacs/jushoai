---
title: How JushoAI keeps your data safe
description: What JushoAI does to protect personal information: safeguards while filling, undo, what is sent, destination checks, keys and permissions, and UI isolation.
order: 8
---

# How JushoAI keeps your data safe

JushoAI handles names and addresses. It is therefore built on three rules: never fill without asking, never send without being asked, and layer the defenses. This page lists what it actually does.

## Safeguards while filling

- Pressing the button does not fill anything right away. You review the fields and values in the preview, and JushoAI fills only when you press the fill button.
- Merely opening a page never fills anything.
- Fields that already have a value are not overwritten. Neither are fields you type into while the preview is open.
- A value longer than the field's maximum length is not truncated; it is skipped with a warning.
- Read-only and disabled fields are skipped.
- The postal code field is filled last, to avoid clashing with forms that auto-complete the address.
- If the preview is removed, moved off screen, hidden or covered during filling, the fill is aborted.

## Undo

Right after filling, the undo button in the preview restores only the fields JushoAI filled to their empty state. A field you added text to afterwards no longer matches, so it is left alone.

The undo history is kept only in memory in the page. It is never saved or sent, and it disappears when the tab closes. Only the latest fill can be undone.

## Values come from fixed processing

AI only classifies what a field is. It does not produce the values. Splitting, kana conversion, half-width conversion and hyphen handling are done by deterministic code. Your profile values are not given to AI or to anyone else.

AI is off by default. It is used only when you configure it, to help with fields the rules cannot classify.

## Send as little as possible

If you configure AI, only field metadata is sent. Profile values, values already in fields and select options are not. The full list of what is sent is in [Privacy and what is sent](/en/guides/privacy/).

Requests happen only when you press the fill button or run `接続テスト` (connection test) on the settings page. Every AI call is recorded in an audit log on your device. You can review, download or delete it on the settings page, and entries disappear after 7 days.

## Destination checks

When you use a cloud AI, the destination is checked as follows.

1. The base URL must be https. http is allowed only for localhost and 127.0.0.1. The URL cannot contain credentials, a query or a fragment.
2. Internal network addresses are rejected. IPv6 addresses are not allowed.
3. When you save, the host name is resolved. If it resolves to an internal address, or the result cannot be confirmed, saving is refused. The check is repeated just before each call.
4. HTTP redirects are not followed. Nothing is sent to a host the server redirects to.
5. A destination you use for the first time receives nothing until you have reviewed its IP address list and approved it.

The check and the real connection use separate name resolutions, so an attack that changes the result in between (DNS rebinding) cannot be ruled out completely. This is also stated in [Privacy and what is sent](/en/guides/privacy/).

## API keys and permissions

API keys are stored encrypted with AES-GCM. The encryption key is kept in a separate, non-extractable store. The settings page never shows the key, only whether one is saved. Changing the origin of the destination discards the saved key.

Network permission is not requested at install. When you save in the settings page, only that provider's host is requested. Without it, AI is not used.

## Isolated UI

JushoAI's UI sits inside a closed Shadow DOM, so page scripts cannot operate it. Strings that come from the page, such as labels, are displayed as text and never interpreted as HTML.

## What is out of scope

- Forms inside cross-origin iframes are not filled.
- Checkboxes, hidden fields, submit buttons and the like are not targeted.
- Pages registered as excluded URLs are left alone. See [Toolbar and filling a form](/en/guides/popup-and-fill/).
