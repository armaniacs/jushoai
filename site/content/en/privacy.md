---
title: Privacy and what is sent
description: What JushoAI sends and does not send, when it makes requests, and how API keys are stored.
order: 3
---

# Privacy and what is sent

## What is sent and what is not

Unless you configure AI, JushoAI makes no external requests.

Data is sent only when you have configured a provider other than the built-in AI and you click `JushoAI で入力` (fill with JushoAI). Only fields that the rules cannot identify are included. For each such field, the extension sends:

- An internal field ID. It is generated in the form `jai-N` and is not the HTML `id` attribute.
- `type` and `maxLength`.
- `name`, `htmlId` (the HTML `id` attribute), the label, the placeholder and the nearby heading. Each of these five is clipped to 80 characters.

These are never sent:

- Your profile values
- The values already in the fields
- The options of select lists
- `autocomplete` and `pattern`

Labels and headings are text from the page. They can contain personal information that the page shows.

## When requests happen

Requests happen only when you click `JushoAI で入力`. Opening a page does not contact an AI provider. Checking the badge state only reads the saved settings and permissions. It makes no request.

## How API keys are stored

API keys are encrypted with AES-GCM before they are saved. The encryption key is stored in a non-extractable form in a separate store (IndexedDB). If only the storage leaks, the keys cannot be decrypted. The extension's own code can still read them.

The settings page never shows a key. It shows only whether one is saved, and lets you replace or delete it.

## Network permission

The extension does not ask for network access at install time. When you save the settings, it asks for access to that provider's host only (an optional permission). Without the permission, AI is not used.

## With the built-in AI

The built-in browser AI runs on your device and sends nothing outside it. For setup, see [Setting up an AI provider](/en/guides/ai-providers/).
