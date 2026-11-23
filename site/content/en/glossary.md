---
title: Glossary
description: Clear definitions of the 10 key terms used across the guides and extension screens.
order: 13
---

# Glossary

Meanings of the key terms you will see in the guides and inside JushoAI. For step-by-step usage and full rules, refer to each guide.

## Profile

The information about a "person" used for filling. You can register up to 10, such as yourself and family members, and the values stay only in this browser. See [Profiles](./profiles.md).

## Address

The place information used for filling, such as postal code, prefecture, city, street and building. Each address can be linked to a profile, and switching profiles selects the linked address automatically. See [Addresses](./addresses.md).

## Preview

The list shown for review before filling, after clicking `JushoAI で入力` (fill with JushoAI). Clicking `入力する` (fill in) fills only the fields without a notice. See [Filling forms and the toolbar](./popup-and-fill.md).

## Shortened preview

When you revisit the same site and form shape, rows unchanged from your last approved fill collapse into a `前回と同じ` (same as last time) summary row. Click `前回と同じ欄を表示` (show unchanged fields) to view all rows. Only hashes are stored on your device. See [Filling forms and the toolbar](./popup-and-fill.md) and [Privacy and what is sent](./privacy.md).

## Person role (child and guardian)

When a single form contains sections for both a child and a guardian, JushoAI assigns a role to each field. If you have 2 or more profiles registered, the preview lets you pick separate `児童用` (child) and `保護者用` (guardian) profiles. See [Supported forms and how it works](./how-it-works.md).

## Guest

A one-shot, unsaved entry mode opened from `ゲストで入力` (fill as guest) in the toolbar popup. Typed values stay strictly in tab memory and disappear after that single fill or when the tab closes. See [How JushoAI keeps your data safe](./safety.md).

## Learned mappings

Per-domain field mappings (`field signature -> category`) that you teach using `直す` (fix) in the preview. Future classifications apply your correction first, and you can inspect or remove entries under `覚えた対応付け` (learned mappings) on the settings page. See [Single-field fill, import, export and management](./shortcuts-and-tools.md).

## AI detection

Letting the configured AI classify only the fields that rules could not identify. The AI only classifies and never creates the values to fill. Only field metadata is sent, never your profile values. See [Setting up an AI provider](./ai-providers.md) and [Privacy and what is sent](./privacy.md).

## Pre-send review

The `AI判定で送る内容` (what AI detection sends) panel shown before anything is sent to an AI provider. You can inspect the exact field metadata, and rows containing text that looks like personal information are marked `（要確認）` (needs check) with `送らない` (do not send) checked by default. See [Setting up an AI provider](./ai-providers.md) and [How JushoAI keeps your data safe](./safety.md).

## Audit log

The record kept on your device every time an AI is called. On the settings page, `通信の監査ログ` (communication audit log) lets you check the list, download a TSV, or delete the log. Each record contains the prompt sent to the model and its answer. Profile values are never recorded. See [Privacy and what is sent](./privacy.md).
