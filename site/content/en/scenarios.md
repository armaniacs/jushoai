---
title: Everyday scenarios (family, multi-page, revisits)
description: How to use separate child and guardian profiles for school forms, one-shot guest filling, shortened previews on revisits, multi-page carryover, and opt-in assist candidates.
order: 5
---

# Everyday scenarios (family, multi-page, revisits)

This guide walks through everyday situations where JushoAI adapts to what you are filling: signing up a child alongside a parent, helping someone else once without saving, revisiting the same site, stepping through multi-page forms, and handling tight character limits or missing profile fields.

## Fill child and guardian fields together on school forms

Application forms for schools, cram schools, and events often place sections for both a child (`児童`, `生徒`, `お子様`, etc.) and a guardian (`保護者`, etc.) on the same page. JushoAI reads each field's wording and section heading to infer its role automatically so you can fill both in one pass.

- **When the dual selectors appear**: when you have **2 or more profiles** registered AND the form has both child and guardian rows, the preview shows `児童用` (child) and `保護者用` (guardian) dropdowns at the top.
- **Default assignment and switching**: by default, your 1st profile is assigned to child (and self) rows and your 2nd profile to guardian rows. A summary line (`〇〇を児童用に、△△を保護者用につかいます`) shows which profile feeds which role, and switching either dropdown immediately updates only that role's rows.
- **Address selector**: both roles share the single `住所` (address) selector below.
- **When only one selector appears**: if you have only 1 profile registered, or if the form contains only one role, the preview keeps the regular single `プロファイル` (profile) selector.

Tip: register the child's school (`学校名`), grade (`学校の学年`), and cram school (`塾名`) in the child's profile so those rows fill together too. See [Profiles](./profiles.md).

## Fill once without saving (Guest mode)

When you are helping a family member or friend fill out a form once, or want to enter someone else's details without using one of your 10 saved profile slots, use guest mode.

1. Click the JushoAI icon in the browser toolbar.
2. Click `ゲストで入力` (fill as guest).
3. In the `ゲストで入力（保存しません）` (fill as guest — not saved) panel, enter only the items you need: `姓` / `名` (family/given name), `セイ` / `メイ` (furigana), `メールアドレス` (email), `電話番号` (phone), `郵便番号` (postal code), `都道府県` (prefecture), `市区町村` (city), `番地` (street), and `建物名・部屋番号` (building).
4. Click `この内容で使う` (use these values) once at least one field is entered (or `使わない` to cancel). Clicking it automatically opens the preview for the first detected form on the page.
5. Review the values and click `入力する` (fill in). If there are multiple forms on the page or you closed the preview before applying, you can also open it via `JushoAI で入力` (fill with JushoAI) on the target form.

- **Works before registering anything**: guest mode works even when you have no regular profile or address saved yet (it stays disabled on excluded URLs in `起動しないURL`).
- **Never mixes with saved data**: for that single fill, your guest entries replace stored profiles and addresses. Fields you leave blank in guest mode stay empty instead of falling back to your saved data.
- **Consumed and never persisted**: the values are consumed once applied, live strictly in tab memory, and are never written to browser storage, audit logs, history, or JSON export. Closing the tab discards them immediately.

## Save time on sites you revisit (shortened preview and per-site profile)

When you come back to a site you use often—such as a reservation portal or school system—JushoAI cuts down the review work without skipping your approval.

- **Shortened preview**: when you revisit the same site with the same form layout and the same selected profile and address, rows whose values match what you approved last time collapse into one muted summary row: `前回と同じ` (`<N>件を前回の承認どおりに入力します` — same as last time, filling N items as previously approved). Only changed rows and warnings stay visible so you can focus on what differs (if every row is unchanged, the full list is shown normally).
- **Expanding all rows**: click `前回と同じ欄を表示` (show fields unchanged from last time) at the bottom of the preview anytime to inspect every row.
- **What is stored**: only hashes (digests) of previously approved rows and the selected profile/address IDs are saved on your device (up to 100 sites)—never raw profile values or labels. See [Privacy and what is sent](./privacy.md).
- **Per-site profile hints**: JushoAI remembers which profile you used on each host (host to profile ID, up to 100 sites, on-device only) and puts it first as the initial candidate next time. It never auto-injects, and you can switch profiles in the preview anytime.

## Carry values across multi-page forms

On multi-step (wizard) forms inside the same tab, values you approved and entered on an earlier page are carried over as candidates for matching fields on later pages.

- **How it helps**: values JushoAI entered on an earlier step (for example via `ゲストで入力` in guest mode, or when blank in the active profile or address) carry over to matching text-like `input` fields with the same `name` or `id` on later pages. Any registered value in the active profile or address still takes priority.
- **Scope**: applies to text-like `input` fields only (`select` dropdowns and radio buttons must match each page's own options). Single-field fill (`Alt+J` or right-click) also uses carried-over values; see [Single-field fill, import, export and management](./shortcuts-and-tools.md).
- **Tab-only lifetime**: carried values live strictly in tab memory. Closing the tab discards them at once, and they are never saved to storage, written to audit logs, exported, or sent externally.

## Opt-in candidates for overflow and missing values

When a building name is slightly longer than `maxlength`, or when furigana, prefecture, or city is missing (such as when left blank in guest mode), JushoAI can propose an on-device assist candidate in the preview.

All three appear as **opt-in checkboxes that are unchecked by default**. JushoAI never truncates, rewrites, or guesses values unless you explicitly check the box before pressing `入力する` (fill in).

- **Building-name abbreviation (`略記して入れる` — enter abbreviated)**: when a building name (or a street/address field containing it) exceeds `maxlength`, JushoAI proposes a deterministic shortened form (`raw → abbreviated`). It removes full-width spaces (keeping half-width spaces in English building names) and shortens a trailing residence suffix (`ビルディング` → `ビル`, and `マンション`, `レジデンス`, `ハイツ`, `コーポ`, `アパート`, or `コーポラス` → `邸`). If the shortened form still exceeds `maxlength`, no candidate is offered and the row keeps its standard warning.
- **Local reading lookup when furigana is blank (`補助候補を入れる` — enter assist candidate)**: when `セイ` or `メイ` is not registered in the profile (such as when left blank in guest mode), JushoAI checks an **on-device reading dictionary** (no network, no AI) for common surnames and given names and offers `候補: ...` converted to the field's kana format. Names outside the dictionary keep the regular missing-value warning.
- **Local postal-prefix lookup when prefecture or city is blank (`補助候補を入れる`)**: when prefecture or city is blank in the address (such as when left blank in guest mode) while `郵便番号` (postal code) is filled, JushoAI checks an **on-device postal prefix dictionary** (major urban areas seed; no network, no AI) and offers `候補: ...`. Unknown prefixes keep the regular missing-value warning.

## What to read next

- [Filling forms and the toolbar](./popup-and-fill.md)
- [Single-field fill, import, export and management](./shortcuts-and-tools.md)
- [Profiles](./profiles.md)
- [How JushoAI keeps your data safe](./safety.md)
- [Privacy and what is sent](./privacy.md)
