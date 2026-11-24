---
title: Addresses
description: How to register addresses, tie them to profiles, register an English address, and use postal-code assist and building abbreviations.
order: 3
---

# Addresses

Addresses are stored separately from profiles, up to 10 entries—such as home, work, or a parent's home. Once you reach 10 addresses, you cannot add more.

If you want to try JushoAI without entering a real address, click `架空の住所を作って試す` (create a fictional address to try)—or `架空の名前と住所を作って試す` when neither side is saved yet—from the guide at the top of the settings page.

## Register an address

Open the settings page and choose `住所` (Addresses) in the left menu. Click `保存` (save) to save addresses independently of profiles (if no valid profile is saved yet, a toast prompts `プロファイルを入力する`).

| Item | Notes |
|---|---|
| `使うプロファイル` (Profile that uses it) | Choose `共通（どのプロファイルでも使う）` (shared across any profile) or a specific profile. |
| `名前（自宅・勤務先など）` (Label) | A label such as home or work (required). |
| `郵便番号` (Postal code) | 7 digits (required for domestic addresses; hyphens are stripped on save). |
| `都道府県` (Prefecture) | Choose from the list (required for domestic addresses). |
| `市区町村` (City) | Required for domestic addresses. |
| `番地` (Street number) | Required for domestic addresses. |
| `建物名・部屋番号（任意）` (Building and room) | Optional. When a form has no dedicated building field, it is appended after the street number with a half-width space. |
| `英語住所（任意）` (English address) | Half-width alphanumeric country, building (`建物名`), street (`番地`), city (`市`), state/region (`州・地域`), and postal code (`英語の郵便番号`) for English-language forms (optional; country is required when used, and filling country makes the domestic fields optional). |

Click `この住所を削除` (delete this address) to remove an entry or `住所を追加` (add address) to add one. You can also click `フォームから取り込む` (import from form) to draft an address from an already-filled form on the active tab ([Single-field fill, import, export and management](./shortcuts-and-tools.md)).

## Tie an address to a profile

For each address, `使うプロファイル` controls how it pairs with profiles:

- **A specific profile**: Selected automatically as the preferred match whenever you switch to that profile.
- **Shared (`共通（どのプロファイルでも使う）`)**: Available as a matching candidate regardless of which profile is active.

When you switch profiles in the preview, JushoAI automatically selects an address linked to that profile (or a shared one). Set a family home address to `共通（どのプロファイルでも使う）` so anyone in the household can share it.

## Choose an address on a form and assist candidates

If you have multiple addresses registered, you can switch between them using the `住所` dropdown at the top of the preview, and the rows update immediately.

Two opt-in assist features can also help in the preview (both are unchecked by default and only apply when you explicitly check them):

- **Postal-prefix assist when prefecture or city is blank (`補助候補を入れる`)**: If `都道府県` or `市区町村` is blank in your address (such as when left blank in guest mode) while `郵便番号` (postal code) is entered, JushoAI checks an on-device postal prefix dictionary (no network, no AI) and may offer a candidate. The dictionary works in 3-digit prefix units: for a prefix shared by several municipalities it offers only the prefecture and leaves the city as a warning. The current dictionary is a seed covering Tokyo's 23 wards and major cities; the update procedure for the nationwide table is in the [release procedure](https://github.com/armaniacs/jushoai/blob/main/docs/release.md). See [License](./license.md) for the data source ([Everyday scenarios](./scenarios.md)).
- **Building-name abbreviation when too long (`略記して入れる`)**: When a building name exceeds a form's `maxlength` limit, JushoAI never silently truncates it. Instead, it displays a warning and proposes a deterministic shortened form (for example, `マンション` → `邸` or `ビルディング` → `ビル`) that only applies if you check the box ([Everyday scenarios](./scenarios.md)).

## What to read next

- [Profiles](./profiles.md)
- [Filling forms and the toolbar](./popup-and-fill.md)
- [Everyday scenarios (family, multi-page, revisits)](./scenarios.md)
- [Single-field fill, import, export and management](./shortcuts-and-tools.md)
