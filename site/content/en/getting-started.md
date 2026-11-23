---
title: Getting started
description: How to install JushoAI, try it with sample data or register your profile and addresses, and fill a form.
order: 1
---

# Getting started

JushoAI is a browser extension for Chromium-based browsers and Firefox (128 or later) that safely fills Japanese web forms asking for your name, furigana, and address using the information you registered. It is published on the Chrome Web Store, Edge Add-ons, and Firefox Add-ons (AMO). In Firefox (128 or later), the form-filling flow is verified by automated tests; cloud AI communication has not been verified there.

The extension screens are in Japanese only. This is intentional: JushoAI is built for users of Japanese forms, and the interface will not be translated into English. This guide quotes each label verbatim and adds a short English gloss on first use.

## Install

Install from the Chrome Web Store for Chrome, Edge Add-ons for Edge, or Firefox Add-ons (AMO) for Firefox.

[Open JushoAI in the Chrome Web Store](https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl?hl=en)

[Open JushoAI in Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi?hl=en)

[Open JushoAI in Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/jushoai/)

To load a zip in Firefox instead, unzip `jushoai-<version>-firefox.zip` from [GitHub Releases](https://github.com/armaniacs/jushoai/releases), open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `manifest.json` inside the unzipped folder. A temporary add-on is removed when Firefox quits, and the profiles, addresses, and encryption key registered in it are lost with it, so you load it and register again each time.

To load a zip in Chrome or Edge instead, unzip the release from [GitHub Releases](https://github.com/armaniacs/jushoai/releases) and follow these steps.

1. Turn on developer mode (`chrome://extensions` in Chrome, `edge://extensions` in Edge).
2. Choose "Load unpacked". The button label can differ by browser and language.
3. Select the unzipped folder.

## Try or register your profile and addresses

When you open the extension's settings page for the first time (before a valid profile and address are registered), a floating guide appears at the top: `初めてですか？架空の名前と住所で試せます` (New here? You can try with a fictional name and address). If you want to test JushoAI before entering your real details, just click `架空の名前と住所を作って試す` (create a fictional name and address to try) — or `架空の名前を作って試す` / `架空の住所を作って試す` when only one side is missing — and sample data is created right away so you can test on any form.

To register your own information, open `プロファイル` (Profiles) and `住所` (Addresses) in the left menu, fill in the main items below, and press `保存` (save) on each tab (up to 10 each; everything stays strictly inside your browser).

| Group | Item | Notes |
|---|---|---|
| Profile | `名前` (Label) | A label such as personal, self, or family. |
| Profile | `姓`・`名` (Family and given name) | |
| Profile | `セイ`・`メイ` (Katakana reading) | Full-width katakana. Hiragana or half-width input is converted to full-width katakana when you save. |
| Profile | `メールアドレス` (Email address) | |
| Profile | `電話番号` (Phone number) | 10 to 11 digits. Hyphens are removed. |
| Address | `名前` (Label) | A label such as home or work. |
| Address | `郵便番号` (Postal code) | 7 digits. |
| Address | `都道府県` (Prefecture) | Choose from the list. |
| Address | `市区町村` (City) | |
| Address | `番地` (Street number) | |
| Address | `建物名・部屋番号` (Building and room) | Optional. |

Optional fields such as romaji names, birthday, gender, school/cram school, workplace/department/job title, and English addresses are also supported. See [Profiles](./profiles.md) and [Addresses](./addresses.md) for the full list.

The `プロファイル` and `住所` tabs save independently. When you save one side while the other side is not yet registered, a toast prompts you to move to the other tab (`住所を入力する` or `プロファイルを入力する`).

You can also click `フォームから取り込む` (import from form) on the settings page to draft values from an open form, or export and import your profiles and addresses as JSON (exported files are plain text, so handle them carefully; this is especially handy for Firefox temporary add-ons). See [Single-field fill, import, export and management](./shortcuts-and-tools.md) for details.

If you click `JushoAI で入力` (fill with JushoAI) before registering at least one profile and one address, the settings page opens instead.

## Use it on a form

A `JushoAI で入力` (fill with JushoAI) button appears near any form that has at least 3 controls combined (`text`, `email`, `tel`, `search`, and `date` inputs, `select` dropdowns, and radio button groups for gender/age decade) where at least 2 of them can be identified.

1. Click `JushoAI で入力`. (If AI is enabled and there are fields the rules cannot identify, `AI判定で送る内容` opens first so you can review before sending.)
2. The preview (`入力内容の確認`) opens, showing a compatibility summary (`x / y 欄に入力できます（承認後に注入します）`) and the list of fields and values.
3. Fields that are already filled, exceed `maxlength`, fail a `pattern`, have no matching option, or have no registered value receive a note (opt-in building-name abbreviations or dictionary assist candidates may also appear).
4. Fields classified by AI carry the `AI判定` (decided by AI) badge.
5. On forms with both child and guardian sections when you have 2 or more profiles registered, `児童用` (child) and `保護者用` (guardian) dropdowns appear at the top so you can assign separate profiles in one pass ([Everyday scenarios](./scenarios.md)).
6. Click `入力する` (fill in). Only fields without a note (plus any opt-in candidates you checked) are filled.
7. After applying, the panel switches to `入力結果` (fill results), where `元に戻す` (undo) lets you restore only the fields JushoAI filled back to empty right afterward.

Close without filling using Esc or `キャンセル` (cancel). Fields you edit yourself while the preview is open are not overwritten, and postal code fields are filled last to avoid conflicts with forms that auto-complete addresses.

## Using AI (optional)

AI is optional. It is off by default and only classifies fields that the rules cannot identify. To enable it, open `AI 判定（任意）` (AI detection) on the settings page:

1. Choose an option under `AI プロバイダ` (AI provider): built-in browser AI, OpenAI-compatible API, or Google Gemini.
2. Enter the required details (such as base URL, model name, and API key for an OpenAI-compatible API) and click `保存` (save). The browser asks for network permission when you save (and data collection consent in Firefox).
3. Before anything is sent to a saved OpenAI-compatible endpoint for the first time, check the DNS-resolved IP addresses shown below it on the settings page and click `この接続先を承認する` (approve this endpoint). Nothing is sent until you approve it.
4. Run `接続テスト（保存済みの設定で実行）` (connection test) to verify it works.
5. Whenever a form triggers AI classification, the `AI判定で送る内容` (what AI detection sends) panel opens first so you can inspect field metadata and exclude rows before anything leaves your browser.

See [Setting up an AI provider](./ai-providers.md) for details.

## For your safety

JushoAI operates under these guarantees:

- Nothing is entered until you review the preview and press `入力する`. Opening a page never fills anything.
- Already-filled fields are never overwritten, and values exceeding `maxlength` are flagged with a warning instead of being truncated.
- Right after filling, `元に戻す` on the result screen restores only the fields JushoAI filled.
- AI is off by default. Even when enabled, only field metadata is sent—never profile values—and you review the list in `AI判定で送る内容` beforehand.
- A new OpenAI-compatible endpoint receives nothing until you check its IP addresses and approve it.

Read the full picture in [How JushoAI keeps your data safe](./safety.md).

## When you have several profiles or addresses

At the top of the preview, you can choose which profile and address to use, and the list updates immediately. On sites where you have filled before, JushoAI suggests the profile you used there first and collapses unchanged rows on revisits for faster confirmation.

## What to read next

- [Profiles](./profiles.md) and [Addresses](./addresses.md) ― details on registration fields and pairing
- [Filling forms and the toolbar](./popup-and-fill.md) ― toolbar popup, button controls, preview, and result screen
- [Everyday scenarios (family, multi-page, revisits)](./scenarios.md) ― child and guardian profiles, guest mode, and shortened previews
- [Single-field fill, import, export and management](./shortcuts-and-tools.md) ― single-field fill, import/export, and learned mappings
- [Supported fields](./supported-fields.md) ― fields supported and out of scope
- [Setting up an AI provider](./ai-providers.md) ― configuring AI and connection verification
- [How JushoAI keeps your data safe](./safety.md) ― all safety protections
- [Privacy and what is sent](./privacy.md) ― transmitted metadata and on-device storage
- [Supported forms and how it works](./how-it-works.md) ― rule classification and value formatting
- [Troubleshooting](./troubleshooting.md) ― badge guide and FAQ
