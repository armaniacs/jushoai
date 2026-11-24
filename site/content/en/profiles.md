---
title: Profiles
description: How to register profiles (name, furigana, birthday, school, workplace and more) and use multiple profiles across forms.
order: 2
---

# Profiles

A profile holds the details about one person—such as yourself, a partner, or a child—and you can register up to 10 profiles. All registered values are stored strictly inside this browser.

If you want to test JushoAI before entering your real details, use `架空の名前を作って試す` (create a fictional name to try)—or `架空の名前と住所を作って試す` when neither side is saved yet—from the guide at the top of the settings page.

## Register a profile

Open the extension's settings page and choose `プロファイル` (Profiles) in the left menu. Click `保存` (save) to save profiles independently of addresses (if no valid address is registered yet, a toast prompts `住所を入力する`).

| Item | Notes |
|---|---|
| `名前（個人用・家族用など）` (Label) | A label for picking the profile later, such as personal or family (required). |
| `姓`・`名` (Family and given name) | Your name in kanji or standard characters (required). |
| `セイ（フリガナ・ふりがな入力可）`・`メイ（フリガナ・ふりがな入力可）` (Katakana reading) | Full-width katakana (required). Hiragana or half-width input is converted to full-width katakana when saved, with a live hiragana preview below. |
| `姓（ローマ字・半角英字・任意）`・`名（ローマ字・半角英字・任意）` (Romaji name) | Half-width letters for romaji fields (optional). Single full-name romaji fields fill in given-name-first order. |
| `生年月日` (Birthday) | Optional. Enter as `1990-05-07` (`YYYY-MM-DD`; inputs like `1990/5/7` or `1990年5月7日` normalize on save). Supports split year/month/day, Japanese era, single `type=date` fields, and age-decade selectors. |
| `性別（任意）` (Gender) | Optional. Choose from `男性`, `女性`, `その他`, or `回答しない`. Used for gender dropdowns and radio buttons (including English `Male` / `Female` options). |
| `学校名`・`学部・学科`・`学校の学年`・`塾名` (School, department, grade, cram school) | All optional. Useful for school and cram-school application forms. |
| `会社名（任意）`・`会社名（フリガナ・任意）`・`会社の部署（任意）`・`役職（任意）` (Company, company furigana, department, job title) | All optional. Useful for workplace and business forms. |
| `メールアドレス` (Email address) | Optional. Checked for valid email format when entered. |
| `電話番号` (Phone number) | Optional. 10 to 11 digits (hyphens are stripped on save). Also reused for FAX fields and 3-part emergency contact inputs that omit the word "phone". |

You can also click `フォームから取り込む` (import from form) to build a draft from an already-filled form in the active tab ([Single-field fill, import, export and management](./shortcuts-and-tools.md)).

## Use several profiles

- **Add**: Click `プロファイルを新規追加` (add new profile). You cannot add more once you reach 10.
- **Duplicate**: Click `このプロファイルを複製` (duplicate this profile) to copy an existing entry and adjust only what differs (disabled at 10 profiles).
- **Delete**: Click `このプロファイルを削除` (delete this profile) to remove any entry—including the last remaining one (though you cannot save with zero profiles).

When you have multiple profiles and click `JushoAI で入力` (fill with JushoAI) on a form, you can pick which profile to use at the top of the preview, and the list updates right away.

- **Per-site profile hints**: When you fill a form on a site, JushoAI remembers which profile ID you used for that host (stored on-device only, up to 100 sites) and places it first in the preview next time. It never auto-fills without approval, and you can still switch anytime.
- **Child and guardian profiles**: On school or cram-school forms containing both child and guardian fields, having 2 or more profiles displays `児童用` (child) and `保護者用` (guardian) dropdowns at the top of the preview ([Everyday scenarios](./scenarios.md)).
- **One-shot filling without saving**: If you want to enter someone else's details once without consuming one of your 10 profile slots, use `ゲストで入力` (fill as guest) from the toolbar popup ([Everyday scenarios](./scenarios.md)).

## How profiles relate to addresses

Each address can be tied to a specific profile or kept shared. When you switch profiles in the preview, its tied (or shared) address is selected automatically. See [Addresses](./addresses.md) for details.

## What to read next

- [Addresses](./addresses.md)
- [Filling forms and the toolbar](./popup-and-fill.md)
- [Everyday scenarios (family, multi-page, revisits)](./scenarios.md)
- [Single-field fill, import, export and management](./shortcuts-and-tools.md)
