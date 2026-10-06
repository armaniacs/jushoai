---
title: Supported fields
description: The fields JushoAI can fill, and the ones it does not support.
order: 5
---

# Supported fields

JushoAI works with text, email, tel and search inputs and select lists (dropdowns). Radio buttons are supported only for gender and age group.

## Fields it can fill

| Kind | Fields | Notes |
|---|---|---|
| Name | Family name, given name, full name (one field) | For one field, it reads the example text to decide whether to put a space between them. |
| Furigana | Family name, given name, furigana (one field) | Full-width katakana, hiragana and half-width katakana. |
| Romaji | Family name, given name, full name (one field) | When the profile has a romaji name. |
| Birthday | Year, month, day, era | Both Western and Japanese era years. |
| Gender and age group | Dropdowns and radio buttons | Age group is derived from the birthday. |
| School | School name, faculty and department | |
| Contact | Email address, phone number | Phone numbers work in one field or three split fields. |
| Postal code | One field, or two fields (first and second part) | Hyphens are decided from the example text and maximum length. |
| Address | Prefecture, city, street, building, whole address (one field) | Prefecture dropdowns match different notations. |
| English address | Country, address lines 1 to 4, postal code | When the address has an English address. |

## Fields it does not support

- Checkboxes, date inputs, file inputs and other types
- Radio buttons other than gender and age group
- Hidden fields, submit buttons, and `readonly` and `disabled` fields

Fields it cannot classify are left alone. How classification works is described in [Supported forms and how it works](/en/guides/how-it-works/).

## A form you would like supported

If a form did not fill correctly, tell us as a GitHub issue using the links at the bottom of this page. The form's URL and the fields that were not filled help us a lot.
