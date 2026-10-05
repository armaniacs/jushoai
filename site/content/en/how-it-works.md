---
title: Supported forms and how it works
description: How fields are identified, how values are produced, the safety measures, and which fields are not supported.
order: 4
---

# Supported forms and how it works

## The overall flow

1. The extension finds a form with several fields for name, address and similar items, and shows a `JushoAI で入力` (fill with JushoAI) button.
2. When you click the button, it identifies each field with rules.
3. Only the fields the rules cannot identify are classified by the AI you configured.
4. It produces a value for each field and lists them in a preview.
5. When you click `入力する` (fill in), only the fields without a note in the preview are filled.

For usage, see [Getting started](/en/guides/getting-started/).

## Classifying fields (rules)

The rules look at these in order.

1. The `autocomplete` attribute
2. `name` and `id`
3. The label and the placeholder
4. The heading (`th`, `dt` and `legend`)

## What the AI does

The AI classifies only the fields the rules cannot identify. It does not produce the values to fill in. For what is sent, see [Privacy and what is sent](/en/guides/privacy/).

## How values are produced

- Name: if family name and given name have separate fields, each gets its own value. If there is one field, the extension picks a full-width space, a half-width space or no space from the placeholder example. If it cannot tell, it uses a half-width space.
- Name in kana: stored as full-width katakana. It is converted to hiragana, half-width katakana or full-width katakana to match the example or hint of the field.
- Phone number and postal code: whether the number goes in one field or several, and whether it has hyphens, is decided from the example and the maximum length. A phone number is split into area code and the rest by its digits.
- Address: prefecture, city, street number and building name work as separate fields or as one field. If there is no building name field, the building name follows the street number after a half-width space.
- Prefecture drop-down: variations such as 東京 and 東京都, and numeric code values, are matched too.

## Safety measures

- Fields that already have a value are not overwritten.
- A value longer than the maximum length is not clipped. The extension shows a warning and does not fill it.
- `readonly` and `disabled` fields are skipped.
- Fields you edit yourself while the preview is open are not overwritten.
- The postal code field is filled last.

## Unsupported fields

The extension supports text, email, tel and search inputs, and select lists. Other controls, such as checkboxes, radio buttons and date fields, are not supported.

Fields that cannot be identified are not filled. Items such as date of birth are not handled. Gender is supported for select lists only, not for radio buttons.
