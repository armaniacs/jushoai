---
title: Getting started
description: How to install JushoAI, register your profile and addresses, and fill a form.
order: 1
---

# Getting started

JushoAI is a browser extension for Chromium-based browsers and Firefox 128 or later. It fills forms that ask for a name and an address with the information you registered. It is published on Edge Add-ons and Firefox Add-ons (AMO). In Firefox (128 or later), the flow of filling a form is checked by automated tests; communication with cloud AI has not been verified.

The extension screens are in Japanese only. This is intentional: JushoAI is an extension for users of Japanese forms, and the screens will not be translated into English. This guide quotes each label exactly as it appears, with a short English gloss on first use.

## Install

In Chrome, install from the Chrome Web Store. In Edge, install from Edge Add-ons. In Firefox, install from Firefox Add-ons (AMO).

[Open JushoAI in the Chrome Web Store](https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl?hl=en)

[Open JushoAI in Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi?hl=en)

[Open JushoAI in Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/jushoai/)

To load a zip in Firefox instead, unzip `jushoai-<version>-firefox.zip` from [GitHub Releases](https://github.com/armaniacs/jushoai/releases), open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `manifest.json` in the unzipped folder. A temporary add-on is removed when Firefox quits, and the profiles, addresses and encryption key registered in it are lost with it, so you load it and register again each time.

To load the zip in Chrome or Edge instead, unzip the release from [GitHub Releases](https://github.com/armaniacs/jushoai/releases) and follow these steps.

1. Turn on developer mode (`chrome://extensions` in Chrome, `edge://extensions` in Edge).
2. Choose "Load unpacked". The button label can differ by browser and language.
3. Select the unzipped folder.

## Register your profile and addresses

Open the extension's settings page and fill in these items.

| Group | Item | Notes |
|---|---|---|
| Profile | Family name and given name | |
| Profile | Family name and given name in katakana (セイ・メイ) | Full-width katakana. Hiragana or half-width input is converted to full-width katakana when you save. |
| Profile | Email address | |
| Profile | Phone number | 10 to 11 digits. Hyphens are removed. |
| Address | Name | For example, home or work. |
| Address | Postal code | 7 digits. |
| Address | Prefecture | Choose from the list. |
| Address | City | |
| Address | Street number | |
| Address | Building name | Optional. |

You can register several addresses.

If you have not registered a profile and at least one address, clicking `JushoAI で入力` (fill with JushoAI) opens the settings page instead.

## Using AI (optional)

AI is optional. It only classifies fields that the rules cannot identify. To use it, follow these steps in the `AI 判定` (AI detection) section of the settings page.

1. Choose the kind under `AI プロバイダ` (AI provider): built-in browser AI, OpenAI-compatible API, or Google Gemini.
2. For an OpenAI-compatible API, enter the base URL, model name, and API key, then save. When you save, the browser asks whether to allow network access to that provider.
3. Before anything is sent to a saved endpoint for the first time, approve it. Check that the list of IP addresses shown below the saved endpoint (what the host name resolves to with DNS) is what you expect, then press `この接続先を承認する` (approve this endpoint). Nothing is sent to that endpoint until you approve it.
4. Run `接続テスト` (connection test) to check that it works.

See [Setting up an AI provider](/en/guides/ai-providers/) for details.

## Use it on a form

A `JushoAI で入力` button appears near a form that has several fields for name, address and similar items.

The button appears when the form has at least 3 controls (text, email, tel and search inputs, plus select lists) and the extension can identify at least 2 of them.

1. Click `JushoAI で入力`. A preview opens with a list of fields and values.
2. Fields that are already filled, fields where the value is too long, and fields with no matching option get a note.
3. Fields classified by AI are marked `AI判定` (decided by AI).
4. Click `入力する` (fill in). Only the fields without a note in the preview are filled.

Close the preview with the Esc key or `キャンセル` (cancel). Fields you edit yourself while the preview is open are not overwritten. The postal code field is filled last, to avoid conflicts with forms that complete the address automatically.

## When you have several addresses

At the top of the preview, you can choose which address to use. The list updates when you choose another one.

## What to read next

- [Profiles](/en/guides/profiles/) and [Addresses](/en/guides/addresses/) ― details on what you register
- [Toolbar and filling a form](/en/guides/popup-and-fill/) ― how to fill with the button
- [Setting up an AI provider](/en/guides/ai-providers/) ― setup for using AI
- [Privacy and what is sent](/en/guides/privacy/) ― what is sent
- [Supported forms and how it works](/en/guides/how-it-works/) ― how classification works
- [Troubleshooting](/en/guides/troubleshooting/) ― what to do when stuck
