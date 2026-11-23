---
title: Supported forms and how it works
description: How fields and person roles are identified, how values are produced, the safety measures, and which fields are not supported.
order: 11
---

# Supported forms and how it works

## The overall flow

1. The extension finds a form with several fields for name, address and similar items, and shows a `JushoAI で入力` (fill with JushoAI) button.
2. When you click the button, it identifies each field with rules.
3. If there are fields the rules cannot identify and AI is enabled, you review them in `AI判定で送る内容` (what AI detection sends) before the AI classifies them.
4. It produces a value for each field and lists them in a preview.
5. When you click `入力する` (fill in), only the fields without a note (plus any opt-in candidates you checked) are filled.

For usage, see [Getting started](./getting-started.md).

## Classifying fields (rules)

The rules look at these in order.

1. The `autocomplete` attribute
2. `name` and `id`
3. The `label` and the `placeholder`
4. The heading (`th`, `dt` and `legend`, as well as `h1` to `h6` headings directly preceding a `fieldset` and sibling row headings)

If you taught a field's meaning in the preview using `直す` (learned mappings), that learned category overrides the rule judgment on future runs.

## Person roles (child, guardian and self)

When a school or event application form has sections for both a child (`児童`, `生徒`, `お子様`, etc.) and a guardian (`保護者`, etc.), JushoAI infers each field's role from the field wording and section heading. Fields without a role clue default to self (`本人`).

Splitting (such as phone numbers or postal codes) and address narrowing work strictly within the same role so child fields and guardian fields never mix.

When both child and guardian fields are present and you have 2 or more profiles registered, the preview shows separate `児童用` (child) and `保護者用` (guardian) profile selectors.

## What the AI does

The AI classifies only the fields the rules cannot identify. It does not produce the values to fill in. For what is sent, see [Privacy and what is sent](./privacy.md).

## How values are produced

- **Name**: if family name and given name have separate fields, each gets its own value. If there is one field, the extension picks a full-width space, a half-width space or no space from the placeholder example. If it cannot tell, it uses a half-width space.
- **Name in kana**: stored as full-width katakana. It is converted to hiragana, half-width katakana or full-width katakana to match the example or hint of the field.
- **Phone number and postal code**: whether the number goes in one field or several, and whether it has hyphens, is decided from the example and the maximum length. A phone number is split into area code and the rest by its digits.
- **Birthday**: single full-date fields (including `type=date`) receive `YYYY-MM-DD`. Split year/month/day and Japanese era fields are supported, and even unlabeled dropdowns are recognized from option wording such as `2014年`, `5月` and `7日`.
- **Address**: prefecture, city, street number and building name work as separate fields or as one field. If there is no building name field, the building name follows the street number after a half-width space.
- **Prefecture drop-down**: variations such as `東京` and `東京都`, and numeric code values, are matched too.
- **Character width enforcement**: on inputs whose `pattern` attribute expects half-width or full-width characters, the width is adjusted to match before checking maximum length.
- **Opt-in suggestions (only when checked)**: building name abbreviations on overflow, local name-reading dictionary candidates when kana is missing, and local postal-code dictionary candidates when prefecture/city is missing are applied only if you check them in the preview.

## Safety measures

- Fields that already have a value are not overwritten. Fields you edit yourself while the preview is open are not overwritten either.
- A value longer than the maximum length is not clipped. The extension shows a warning and does not fill it.
- A value that does not match the field's `pattern` attribute is skipped with a warning. Overly complex regular expressions or overly long values skip checking safely so the tab cannot freeze.
- `readonly` and `disabled` fields are skipped.
- The postal code field is filled last, to avoid conflicts with forms that auto-complete the address.
- Right after filling, `元に戻す` (undo) on the result screen restores only the fields JushoAI filled.

## Unsupported fields

The extension supports `text`, `email`, `tel`, `search` and `date` inputs, `select` lists, and gender and decade radio button groups.

Checkboxes, file inputs, multi-line text areas (`textarea`), and radio buttons other than gender and decade are not supported. Site search boxes, cram-school search assist inputs, chained filter dropdowns and fields that cannot be classified are also left untouched. See [Supported fields](./supported-fields.md) for the full list.
