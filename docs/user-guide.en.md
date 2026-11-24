# JushoAI User Guide

[日本語](./user-guide.md) | **English** ・ [Web version (GitHub Pages)](https://armaniacs.github.io/jushoai/en/guides/) ・ [Back to README](../README.en.md)

The extension's own interface is intentionally Japanese-only (built for users of Japanese forms). Every guide quotes Japanese UI labels verbatim alongside English glosses.

## JushoAI in 30 seconds

JushoAI is a browser extension for Chrome, Edge, and Firefox 128+ that fills Japanese web forms—split family/given names, furigana, postal codes, phone numbers, and prefecture-to-building addresses—in one click.

- **Rules first, AI optional**: Fields are classified locally by deterministic rules, and AI is off by default. Even with AI enabled, only metadata for fields the rules cannot decide is sent, and values are always produced by fixed code.
- **Preview before filling**: Clicking `JushoAI で入力` never fills right away. You check every field and value in the preview and approve with `入力する`. Already-filled fields are never overwritten, `maxlength` overflows and `pattern` mismatches are skipped with a warning, and `元に戻す` restores JushoAI-filled fields right afterward.
- **Local data by design**: Profiles and addresses (up to 10 each) stay inside your browser and are never sent externally. Before sending fields the rules cannot identify to AI, `AI判定で送る内容` lets you inspect the metadata (`（要確認）` rows stay excluded by default and can be toggled individually, or `ルールのみで入力する` skips AI entirely); undo history, `ゲストで入力`, and multi-page carryover stay strictly in tab memory.
- **What it intentionally skips**: Sensitive data (credit cards, bank accounts), auth/SMS/2FA codes, auto-fill on page load, cross-origin iframes, PDFs, checkboxes, and radio buttons other than gender and age group.

## Find what you want to do

| What you want to do | Guide |
|---|---|
| Try JushoAI first without entering your real personal info | [Getting started](../site/content/en/getting-started.md) |
| Register company, department, job title, school grade, or cram school | [Profiles](../site/content/en/profiles.md) |
| Fill child and guardian fields together on a school or cram-school form | [Everyday scenarios (family, multi-page, revisits)](../site/content/en/scenarios.md) |
| Fill someone else's info once without saving (`ゲストで入力`) | [Everyday scenarios (family, multi-page, revisits)](../site/content/en/scenarios.md) |
| Speed up revisits on frequent sites (shortened preview and per-site hints) | [Everyday scenarios (family, multi-page, revisits)](../site/content/en/scenarios.md) |
| Carry values from earlier pages to later pages in a multi-step form | [Everyday scenarios (family, multi-page, revisits)](../site/content/en/scenarios.md) |
| Handle building-name character limits or blank furigana/prefecture fields | [Everyday scenarios (family, multi-page, revisits)](../site/content/en/scenarios.md) |
| Fill just one field quickly (`Alt+J` / right-click) | [Single-field fill, import, export and management](../site/content/en/shortcuts-and-tools.md) |
| Fix a misclassified field and teach JushoAI for that site | [Single-field fill, import, export and management](../site/content/en/shortcuts-and-tools.md) |
| Hide the button or register excluded URLs on unwanted pages | [Filling forms and the toolbar](../site/content/en/popup-and-fill.md) |
| Undo right after filling | [Filling forms and the toolbar](../site/content/en/popup-and-fill.md) / [How JushoAI keeps your data safe](../site/content/en/safety.md) |
| Check which field types are supported or skipped | [Supported fields](../site/content/en/supported-fields.md) |
| Configure AI classification and inspect what gets sent beforehand | [Setting up an AI provider](../site/content/en/ai-providers.md) / [Privacy and what is sent](../site/content/en/privacy.md) |
| Fix filling problems or check AI badge errors | [Troubleshooting](../site/content/en/troubleshooting.md) |

## All guides (4 groups, 14 guides)

### Start here

1. [Getting started](../site/content/en/getting-started.md) — Installing JushoAI, trying with fictional sample data, registering profiles and addresses, and filling a form
2. [Profiles](../site/content/en/profiles.md) — Registering person details (name, furigana, birthday, school, workplace) and switching between multiple profiles
3. [Addresses](../site/content/en/addresses.md) — Registering addresses, tying them to profiles, English addresses, and using postal-code and abbreviation assists

### Everyday use

4. [Filling forms and the toolbar](../site/content/en/popup-and-fill.md) — Using the toolbar popup, moving or hiding the button, excluded URLs, preview, result screen, and AI re-analysis
5. [Everyday scenarios (family, multi-page, revisits)](../site/content/en/scenarios.md) — Child and guardian profiles, one-shot guest mode, shortened previews, multi-page carryover, and opt-in assist candidates
6. [Single-field fill, import, export and management](../site/content/en/shortcuts-and-tools.md) — Filling one field (`Alt+J` / right-click), settings layout, importing from a form, JSON export/import, and learned mappings
7. [Supported fields](../site/content/en/supported-fields.md) — Supported input types, out-of-scope items, and fields intentionally skipped to prevent misfills

### AI, safety and privacy

8. [Setting up an AI provider](../site/content/en/ai-providers.md) — Choosing an AI provider for ambiguous fields, pre-send review, endpoint approval, and connection tests
9. [How JushoAI keeps your data safe](../site/content/en/safety.md) — Filling safeguards, undo, pre-send review, destination verification, tab-only temporary data, and closed Shadow DOM UI
10. [Privacy and what is sent](../site/content/en/privacy.md) — What is sent and never sent, pre-send review, on-device storage, audit logs, and encrypted API keys

### Reference and help

11. [Supported forms and how it works](../site/content/en/how-it-works.md) — Rule classification order, person role detection, value formatting, and safety checks
12. [Troubleshooting](../site/content/en/troubleshooting.md) — What each AI badge means, checks when AI or filling fails, and frequently asked questions
13. [Glossary](../site/content/en/glossary.md) — Clear definitions of key terms used across the guides and extension screens
14. [License](../site/content/en/license.md) — Summary of GPL-3.0-only permissions, distribution conditions, disclaimer, and dependency handling
