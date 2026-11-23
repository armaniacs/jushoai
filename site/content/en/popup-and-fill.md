---
title: Filling forms and the toolbar
description: How to use the toolbar popup (review, guest mode, analyze), move or hide the in-page button, review the preview and result screen, and re-analyze with AI.
order: 4
---

# Filling forms and the toolbar

## The toolbar icon

Click the JushoAI icon in the browser toolbar to open `登録内容の確認` (review of registered data).

- Lists of your registered profiles and addresses
- The `使用中` (in use) badge marking the currently active profile and address
- Each address's `使う人` (who uses it; addresses not tied to a specific profile show `共通`, shared)
- The gear icon at the top right (or `設定を開く` in empty-state notices) to open the settings page
- `AI で分析` (analyze with AI) to start classification and open the preview for the form in the active tab (shows a reason when no form is available, or opens settings if nothing is registered yet)
- **`ゲストで入力`** (fill as guest) to open the one-shot, unsaved entry panel (`ゲストで入力（保存しません）`) on the current tab—works even before registering any profile or address ([Everyday scenarios](./scenarios.md))

If no profile or address is saved yet, guidance for registering them is shown. While the extension's interface stays in Japanese, a short 3-step guide (`How to use / 使い方（English）`) is included at the bottom of the popup for English readers.

## Fill a form

A `JushoAI で入力` (fill with JushoAI) button appears near forms with multiple name, address, or similar fields. The badge next to it shows the AI status (clicking the badge opens state-specific guidance). The button avoids overlapping fields and uses a translucent background (becoming opaque on hover or focus) so any covered field remains readable. In-page buttons, previews, and dialogs automatically follow your OS light/dark mode setting.

### Move the button

If the button gets in the way of a field, drag it anywhere clear, or focus it and move it with the arrow keys (hold `Shift` to move in larger steps).

- Your moved position stays put across scrolling and window resizing (clamped inside the viewport)
- Tiny movements count as a click, so slight jitter never swallows a button press

```youtube 9gHt4KeipHc
Dragging the button (about 20 seconds)
```

[Watch on YouTube (about 20 seconds)](https://www.youtube.com/watch?v=9gHt4KeipHc)

### Preview and apply

1. Click `JushoAI で入力`. (If AI is enabled and there are fields the rules cannot identify, `AI判定で送る内容` opens first before sending anything.)
2. The preview (`入力内容の確認`) opens. Choose the profile and address at the top (when 2 or more profiles exist and a form has both child and guardian sections, `児童用` and `保護者用` dropdowns appear; on revisits to the same form, unchanged rows collapse into `前回と同じ` and can be expanded via `前回と同じ欄を表示`—see [Everyday scenarios](./scenarios.md)).
3. Review the compatibility summary (`x / y 欄に入力できます（承認後に注入します）`) and the list of fields and values. Rows with a note are skipped. Overflowing building names (`略記して入れる`) and missing-field dictionary lookups (`補助候補を入れる`) appear as opt-in checkboxes.
4. Click `入力する` (fill in) to enter values into all fields without a note (plus any opt-in candidates you checked).

| Note | Meaning |
|---|---|
| `入力済みのため上書きしません` | The field already has a value. |
| `文字数を超えるため入力しません` | The value exceeds `maxlength`. It is not truncated and not entered. |
| `欄のパターンと合わないため入力しません` | The value does not match the format the field expects. A pattern mismatch, not a length issue. |
| `一致する選択肢がないため入力しません` | The dropdown has no matching option. |
| `プロファイルに値がないため入力しません` | Your profile has no value registered for that field. |

Fields classified by AI carry the `AI判定` (decided by AI) badge, and you can fix a misclassified row with `直す` (fix). Close without filling using Esc or `キャンセル` (cancel). To fill just one field, see [Single-field fill, import, export and management](./shortcuts-and-tools.md).

Once filling finishes (when undoable fields were filled or some fields were not applied), the panel switches to **`入力結果`** (fill results):

- Displays `適用済み x / y件（未適用 z件）` (applied x / y, unapplied z) and a per-outcome breakdown.
- Click `元に戻す` (undo) right afterward to restore only the fields JushoAI filled back to empty (fields you edited afterward are left untouched).
- Click `内訳をissueで報告` (report breakdown as issue) to open a pre-filled GitHub issue draft containing only the counts, minimized page URL, provider, and extension version (no profile values or field text).
- When true runtime failures leave fields unapplied (such as detached or missing fields), the in-page form button also keeps the `一部のみ適用（x/y件）` status banner.

## URLs where JushoAI does not start

On pages where form filling is irrelevant—such as spreadsheets or webmail—the button only gets in the way. Register a URL under `起動しないURL` (URLs where it does not start) in the settings page to keep JushoAI inactive on that URL and pages under it.

1. Open `起動しないURL` in the settings page.
2. Enter a URL and click `追加` (add).
3. Click `保存` (save).

- You can also register straight from any page: click `X` (`このボタンを隠す` — hide this button) at the top right of the `JushoAI で入力` button. The button hides until reload and a dialog opens; choose `このページだけ` (this page only) or `この配下全体` (everything under it; or `このサイト全体` when on an origin root), then click `起動しないURLに登録する` (register as an excluded URL)
- The dialog closes automatically after 15 seconds unless the pointer hovers over it or a button inside has focus. Click `元に戻す` (undo) to bring the hidden button back right away
- After registration succeeds, the dialog displays `解除は設定ページの『起動しないURL』から。` (to remove later, visit Excluded URLs in Settings) and a `登録を取り消す` (undo registration) button that removes the entry and restores the hidden button
- `この配下全体` covers the origin (`https://example.com`) plus the first path segment: registering from `https://example.com/foo/bar` registers `https://example.com/foo/`, covering pages under it; from an origin root, it registers the whole site
- Example: registering `https://docs.google.com/spreadsheets/` keeps JushoAI out of every spreadsheet under it while leaving `https://docs.google.com/document/` on the same host unaffected
- Matching requires the same origin and either the exact path or a descendant path (case-insensitive); for example, `https://example.com/pay` does not match `https://example.com/payment`
- Saving immediately updates already-open tabs and removes the button on matching pages
- Up to 100 URLs can be stored, and only `http://` and `https://` URLs are accepted

Removing an entry from the list and saving brings JushoAI back on that page.

## Analyze with AI

When rules cannot identify some fields, click `AI で分析` (analyze with AI) in the preview to reclassify them using your configured AI provider. Running `AI で分析` from inside the preview re-sends non-excluded fields without reopening `AI判定で送る内容`. See [Setting up an AI provider](./ai-providers.md) for setup details.

After reanalysis completes, a `開発に報告する` (report to developers) checkbox appears next to `入力する`. If you check it before clicking `入力する`, a public GitHub issue draft opens with the minimized URL, classification results, and field metadata—never your profile values.

## What to read next

- [Everyday scenarios (family, multi-page, revisits)](./scenarios.md)
- [Single-field fill, import, export and management](./shortcuts-and-tools.md)
- [Supported fields](./supported-fields.md)
- [Troubleshooting](./troubleshooting.md)
