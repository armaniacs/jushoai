---
title: How JushoAI keeps your data safe
description: What JushoAI does to protect personal information: safeguards while filling, undo, pre-send review, destination checks, tab-only temporary data, and UI isolation.
order: 9
---

# How JushoAI keeps your data safe

JushoAI handles names and addresses. It is therefore built on three rules: never fill without asking, never send without being asked, and layer the defenses. This page lists what it actually does.

## Safeguards while filling

- Pressing the button does not fill anything right away. You review the fields and values in the preview, and JushoAI fills only when you press `入力する` (fill in).
- Merely opening a page never fills anything.
- Fields that already have a value are not overwritten. Neither are fields you type into while the preview is open.
- A value longer than the field's maximum length is not truncated; it is skipped with a warning.
- A value that does not match the field's `pattern` attribute is skipped with `欄のパターンと合わないため入力しません` (does not match the field pattern, so it will not be filled) rather than forced in. Overly complex regular expressions or very long patterns and values skip pattern checking for safety so the browser tab cannot freeze.
- Opt-in suggestions, including shortened building names on overflow (`略記して入れる`), kana reading candidates, and postal-code lookup candidates (`補助候補を入れる`), are filled only when you check them in the preview.
- Read-only (`readonly`) and disabled (`disabled`) fields are skipped.
- The postal code field is filled last, to avoid clashing with forms that auto-complete the address.
- If the preview is removed, moved off screen, hidden or covered during filling, the fill is aborted.

## Undo

Right after filling, `元に戻す` (undo) on the result screen restores only the fields JushoAI filled to their empty state. A field you added text to afterwards no longer matches, so it is left alone.

Only the latest fill can be undone. The history lives strictly in page/tab memory: it is never saved or sent, and it disappears when the tab closes.

## Values come from fixed processing

AI only classifies what a field is. It does not produce the values. Splitting, kana conversion, full/half-width adjustment and hyphen handling are all done by deterministic code. Your profile values are not given to AI or to anyone else.

AI is off by default. It is used only when you configure it, to help with fields the rules cannot classify.

## Pre-send review and minimal sending

Even when AI is enabled, JushoAI opens the `AI判定で送る内容` (what AI detection sends) panel before sending any unresolved field metadata outside.

- You can review the exact metadata (`name`, `id`, `label`, `placeholder`, nearby heading, `type`, and `maxLength`) before anything is sent.
- Fields containing text that looks like personal information are marked `（要確認）` (needs check) and have `送らない` (do not send) checked by default.
- Fields you already taught via `直す` (learned mappings) are automatically excluded and never sent to AI.
- Choosing `ルールのみで入力する` (fill with rules only), closing the panel, or pressing Esc sends nothing and continues with rules only.

Profile values, values already in fields and select options are never sent. The full list of what is sent is in [Privacy and what is sent](./privacy.md).

Requests happen only when you click `JushoAI で入力` (fill with JushoAI), `AI で分析` (analyze with AI), or run `接続テスト` (connection test) on the settings page. Every AI call is recorded in an audit log on your device. You can review, download or delete it on the settings page, and entries disappear after 7 days.

## Destination checks

When you use a cloud AI, the destination is checked as follows.

1. The base URL must be `https`. `http` is allowed only for `localhost` and `127.0.0.1`. The URL cannot contain credentials, a query or a fragment.
2. Internal network addresses are rejected, including IPv6 translation prefixes such as NAT64 and 6to4. Literal IPv6 addresses in the URL are not allowed.
3. When you save, the host name is resolved. If it resolves to an internal address, or the result cannot be confirmed, saving is refused. The check is repeated just before each call.
4. HTTP redirects are not followed. Nothing is sent to a host the server redirects to.
5. A destination you use for the first time receives nothing until you have reviewed its IP address list and approved it with `この接続先を承認する` (approve this endpoint).

The check and the real connection use separate name resolutions, so an attack that changes the result in between (DNS rebinding) cannot be ruled out completely. This is also stated in [Privacy and what is sent](./privacy.md).

## API keys and permissions

API keys are stored encrypted with AES-GCM. The encryption key is stored in a non-extractable form in a separate store (IndexedDB). The settings page never shows the key, only whether one is saved. Changing the origin of the destination discards the saved key.

Network permission is not requested at install. When you save in the settings page, only that provider's host (and `dns.google` for DNS verification) is requested. Without it, AI is not used (Firefox also prompts for consent to send website content).

## Temporary data kept only in tab memory

These three kinds of temporary data live strictly in tab memory and are never written to extension storage or audit logs, never exported, never sent externally, and disappear when the tab closes.

- **Undo history**: holds only the fields filled in the latest run so they can be restored; cleared when navigating away or closing the tab.
- **Guest values (`ゲストで入力`)**: throwaway values not saved to storage. Consumed after that one fill or discarded when the tab closes.
- **Multi-page carryover values**: values entered on earlier pages of a multi-step form in the same tab, offered as suggestions on later pages; discarded when the tab closes.

## Isolated UI

JushoAI's UI sits inside a closed Shadow DOM, so page scripts cannot operate it. Strings that come from the page, such as labels, are displayed as text and never interpreted as HTML.

## What is out of scope

- Forms inside cross-origin iframes are not filled.
- Checkboxes, hidden fields, submit buttons, multi-line text areas, and radio buttons other than gender and age group are not targeted.
- Pages registered as excluded URLs are left alone. See [Filling forms and the toolbar](./popup-and-fill.md).

If you find a vulnerability, report it privately through GitHub rather than in a public issue. The steps and response targets are in the [security policy](https://github.com/armaniacs/jushoai/security/policy).
