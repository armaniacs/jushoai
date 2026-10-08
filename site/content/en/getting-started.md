---
title: Getting started
description: How to install JushoAI, register your profile and addresses, and fill a form.
order: 1
---

# Getting started

JushoAI is a browser extension for Chromium-based browsers and Firefox 128 or later. It fills forms that ask for a name and an address with the information you registered. It has been verified in Edge. In Firefox (128 or later), the flow of filling a form is checked by automated tests; communication with cloud AI has not been verified.

The extension screens are in Japanese only. This guide quotes each label exactly as it appears, with a short English gloss on first use.

## Install

The extension is not published in a store. Use the zip from GitHub Releases.

Download the zip from [GitHub Releases](https://github.com/armaniacs/jushoai/releases) and unzip it.

Then open the extensions page of your browser: `chrome://extensions` in Chrome, or `edge://extensions` in Edge. In Firefox, open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `manifest.json` in the `firefox-mv3` folder (it is removed when Firefox restarts).

1. Turn on developer mode.
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

- [Profiles](/en/guides/profiles/) and [Addresses](/en/guides/addresses/) — details on what you register
- [Toolbar and filling a form](/en/guides/popup-and-fill/) — how to fill with the button
- [Setting up an AI provider](/en/guides/ai-providers/) — setup for using AI
- [Privacy and what is sent](/en/guides/privacy/) — what is sent
- [Supported forms and how it works](/en/guides/how-it-works/) — how classification works
- [Troubleshooting](/en/guides/troubleshooting/) — what to do when stuck
