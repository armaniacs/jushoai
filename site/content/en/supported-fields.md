---
title: Supported fields
description: The fields JushoAI can fill, fields it does not support, and fields it intentionally skips to prevent misfills.
order: 7
---

# Supported fields

JushoAI scans `text`, `email`, `tel`, `search` and `date` inputs and `select` lists (dropdowns). Radio buttons are supported only for gender and age group.

## Fields it can fill

| Kind | Fields | Notes |
|---|---|---|
| Name | Family name, given name, full name (one field) | For one field, it reads the example text to decide whether to put a space between them. Role-specific sections (child, guardian, etc.) are also supported ([Everyday scenarios](./scenarios.md)). |
| Furigana | Family name, given name, furigana (one field) | Full-width katakana, hiragana and half-width katakana. When blank, local dictionary candidates can be offered. |
| Romaji | Family name, given name, full name (one field) | When the profile has a romaji name. One-field romaji uses given-name-first order. |
| Birthday | Year, month, day, era, and single full-date fields (`YYYY-MM-DD`, including `type=date`) | Both Western and Japanese era years. Unlabeled year/month/day dropdowns are also identified from their option wording. |
| Gender and age group | Dropdowns and radio buttons | English options (`Male` / `Female`) are also matched. Age group is derived from the birthday. |
| School and cram school | School name, faculty and department, school grade, cram school (`塾名`) | Also matches English labels such as `Institution`. |
| Company and workplace | Company name, company name (furigana), department, job title | When optional workplace fields are registered in the profile. |
| Contact | Email address, phone number (one field or three split fields), fax number | Supports 3-part emergency contact inputs even without the word "phone". Fax fields reuse your profile phone number. |
| Postal code | One field, or two fields (first and second part) | Hyphens are decided from the example text and maximum length. |
| Address | Prefecture, city, street, building, whole address (one field) | Prefecture dropdowns match spelling variants and numeric codes. Building overflow offers abbreviations; blank prefecture/city can use postal-code lookup candidates. |
| English address | Country, address lines 1 to 4, postal code | When the address has an English address. |

## Fields it does not support

- Checkboxes, file inputs, multi-line text areas (`textarea`) and other input types
- Radio buttons other than gender and age group
- Hidden fields, submit buttons, and `readonly` and `disabled` fields

Fields it cannot classify are left alone. How classification works is described in [Supported forms and how it works](./how-it-works.md).

### Fields intentionally skipped (to prevent misfills)

Even among supported input types, JushoAI leaves the following fields untouched on purpose to avoid misfills or breaking form behavior:

- **Site search boxes**: unlabeled inputs named `q`, `query`, `keyword`, etc. are treated as search boxes so they are never mistaken for name fields.
- **Cram-school search assist inputs**: visual filter inputs in combo widgets are left alone so JushoAI does not fill only the display box while the underlying submission value stays empty.
- **Prefecture/city filter dropdowns for picking a school**: excluded so filters for narrowing down a school list are not misclassified as your home address.
- **Chained dropdowns whose options load after a prior selection**: because matching options do not exist yet, JushoAI stops safely with the `一致する選択肢がないため入力しません` (no matching option) warning.

## Out of scope

Beyond field types, the following stay out of scope.

| Item | Reason | Alternative |
|---|---|---|
| Sensitive data such as credit card or bank account numbers | The profile only stores everyday contact fields | Enter by hand, or use a password manager's secure field |
| Authentication codes, SMS codes and two-factor prompts | Security-sensitive data | Enter by hand |
| Auto-fill on page load | Nothing is injected without preview approval | Run it from the `JushoAI で入力` (fill with JushoAI) button |
| Forms inside cross-origin iframes | Kept out of scope after investigation (embedded widgets and so on) | Open the page's own URL and fill there |
| PDFs and printed forms | Outside browser forms | Your device's own input features |

The range of data sent is described in [Privacy and what is sent](./privacy.md).

## A form you would like supported

If a form did not fill correctly, tell us as a GitHub issue using the links at the bottom of this page. The form's URL and the fields that were not filled help us a lot.
