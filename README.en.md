# JushoAI

A browser extension for Chromium-based browsers (Chrome and Edge) and Firefox 128 or later that fills Japanese web forms (split names, furigana and split addresses) into the right fields in one click. Rules classify the fields, and an AI you choose (an OpenAI-compatible API, Gemini, or the browser's built-in AI) helps only with the fields the rules cannot decide. Values are produced by deterministic code, and your profile values are never sent anywhere. Only field metadata goes to the provider, and only if you turn AI on. You review everything in a preview before it is entered.

![The JushoAI fill flow: press the button, review the preview, approve to fill the fields](https://armaniacs.github.io/jushoai/assets/demo.gif)

You can also watch the [demo video](https://www.youtube.com/watch?v=Y3y9ofrsyFo) (about 2 minutes).

If you just want to use it, read up to Usage. To contribute, start with Development. JushoAI is an extension for users of Japanese forms, and its screens are intentionally Japanese-only (they will not be translated into English).

<!-- README-I18N:START -->

The extension's screens are in Japanese. [日本語](./README.md) | **English**

<!-- README-I18N:END -->

- User guide (read in Markdown): [docs/user-guide.en.md](./docs/user-guide.en.md)
- Documentation (Web / GitHub Pages): https://armaniacs.github.io/jushoai/en/
- Requests and bugs: [Create an issue](https://github.com/armaniacs/jushoai/issues/new/choose) (opens a form for a feature request, a form that did not fill, or a bug)
- License: GPL-3.0-only ([LICENSE](./LICENSE); a summary of the terms is in [License](./site/content/en/license.md) / [Web](https://armaniacs.github.io/jushoai/en/guides/license/))

## Install

In Chrome, install from the [Chrome Web Store](https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl?hl=en). In Edge, install from [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi?hl=en). In Firefox, install from [Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/jushoai/).

1. To load the zip instead of using a store, open `chrome://extensions` (Chrome) or `edge://extensions` (Edge) and turn on developer mode.
   - For Firefox, unzip `jushoai-<version>-firefox.zip`, open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `manifest.json` in the unzipped folder. A temporary add-on is removed when Firefox quits, and the profiles, addresses and encryption key registered in it are lost with it, so you load it and register again each time.
2. Choose "Load unpacked" and select the unzipped folder.
3. In the extension's settings page, register your profile and addresses.

## Usage

1. In the settings page, register profiles (up to 10) and addresses (up to 10) independently; each address can be tied to the profile that uses it. To test before entering real personal data, click `架空の名前と住所を作って試す` (create a fictional name and address to try) at the top of the settings page.
2. Click `JushoAI で入力` (fill with JushoAI), which appears near the form.
3. Review the summary (`x / y 欄に入力できます（承認後に注入します）`) and field list in the preview (`入力内容の確認`), then click `入力する` (fill in).
4. After applying, `入力結果` (fill results) appears, where `元に戻す` (undo) lets you restore only the fields JushoAI filled back to empty right afterward.

The button appears where it does not overlap fields, can be dragged (or moved with arrow keys) if it gets in the way, and uses a translucent background so underlying fields remain legible. In-page buttons, previews, and dialogs automatically follow your OS light/dark mode.

The toolbar icon shows what is registered and which profile is in use. Already-filled fields are never overwritten, and values exceeding `maxlength` or failing a field's `pattern` are skipped with a warning.

### Key features

- **Child and guardian profiles**: On school or cram-school forms with both child and guardian sections, JushoAI infers each role and lets you fill both from separate profiles in one pass.
- **One-shot guest mode (`ゲストで入力`)**: Open from the toolbar popup to fill someone else's details once without saving to settings (kept strictly in tab memory).
- **Shortened previews and per-site profile hints**: Revisiting the same form collapses unchanged rows into `前回と同じ` and suggests the profile you used on that host first.
- **Multi-page carryover**: Values approved on earlier steps of a multi-page form inside the same tab are offered for matching fields on later pages (tab memory only).
- **Opt-in assist candidates**: Proposes building-name abbreviations on `maxlength` overflow (`略記して入れる`), local kana reading lookups when furigana is blank, and postal-prefix lookups when prefecture/city is blank (`補助候補を入れる`)—all unchecked by default.
- **Single-field fill and learned mappings**: Fill one focused field via `Alt+J` or right-click (`JushoAI: この欄に入力`), or teach a site-specific meaning with `直す` in the preview (learned fields are never sent to AI).
- **Import from form and JSON migration**: Draft a profile or address from an open form (`フォームから取り込む`), or export/import JSON across browsers.
- **Broad field coverage**: Supports company/department/job title, school/department/grade/cram school, single `type=date` birthdays, fax numbers, and 3-part emergency contact inputs.

See [docs/user-guide.en.md](./docs/user-guide.en.md) and [Everyday scenarios](./site/content/en/scenarios.md) for details.

### URLs where JushoAI does not start

On pages such as spreadsheets or webmail where form filling is irrelevant, exclude the page via `起動しないURL` in Settings or directly from the in-page button.

- **Quick-register from the page**: Click `X` (`このボタンを隠す` — hide this button) at the top right of `JushoAI で入力` to hide the button and open a dialog. Choose `このページだけ` (this page only) or `この配下全体` (everything under it; `このサイト全体` at an origin root). The dialog closes automatically after 15 seconds unless hovered or focused, and offers `元に戻す` right after hiding or `登録を取り消す` right after saving.
- **Matching rules**: Matches by exact origin and path segment boundary (case-insensitive); for example, `https://example.com/pay` does not match `https://example.com/payment`. Registering `https://docs.google.com/spreadsheets/` keeps JushoAI out of spreadsheets under it while leaving `https://docs.google.com/document/` unaffected.
- **Immediate effect and limit**: Saving updates already-open tabs right away (removing the button). Up to 100 `http://` or `https://` URLs can be stored.

The steps and screen details are in [Filling forms and the toolbar](./site/content/en/popup-and-fill.md) ([Web](https://armaniacs.github.io/jushoai/en/guides/popup-and-fill/)).

## Not covered

- Sensitive data such as credit card or bank account numbers (the profile only stores everyday contact fields)
- Authentication codes, SMS codes and two-factor prompts
- Auto-fill on page load (nothing is injected without preview approval; run it from the `JushoAI で入力` button)
- Forms inside cross-origin iframes (embedded widgets and so on; kept out of scope after investigation)
- PDFs and printed forms
- Checkboxes and radio buttons other than gender and age group (site search boxes and filter inputs are also intentionally skipped to prevent misfills; see [Supported fields](./site/content/en/supported-fields.md) / [Web](https://armaniacs.github.io/jushoai/en/guides/supported-fields/))

## Feedback

Feature requests, forms that did not fill and bug reports are welcome as GitHub issues: [Create an issue](https://github.com/armaniacs/jushoai/issues/new/choose). Issues are public, so do not include personal information.

## License

GNU General Public License v3.0 only (GPL-3.0-only). Copyright (C) 2026 armaniacs. You may use, copy, modify and redistribute it; if you distribute it, you must provide the source code under the same GPLv3 terms. The full text is in [LICENSE](./LICENSE).

## AI provider (optional)

AI is off by default. In the settings page, choose a provider under `AI 判定`: an OpenAI-compatible API (OpenAI, Groq, Mistral, Ollama, LM Studio), Google Gemini, or the browser's built-in AI (Chrome with Gemini Nano, Edge with Phi-mini; not available in Firefox). Nothing is sent unless you turn it on, and only when you click `JushoAI で入力`, `AI で分析`, or run the connection test.

Before sending to a newly saved OpenAI-compatible URL for the first time, review its DNS-resolved IP addresses on the settings page and click `この接続先を承認する` (approve this endpoint). Whenever AI is used on a form, the `AI判定で送る内容` (what AI detection sends) panel opens first so you can inspect field metadata (`（要確認）` rows have `送らない` checked by default), choose `ルールのみで入力する` to send nothing, and fields taught with `直す` (learned mappings) are automatically excluded. What is sent and what is not: see [Setting up an AI provider](./site/content/en/ai-providers.md) and [Privacy and what is sent](./site/content/en/privacy.md).

### Communication audit log

Every AI call is recorded on this device, with what was sent to the model and its answer. In the left menu of the settings page, `通信の監査ログ` (communication audit log) lets you check the list, download a TSV, or delete the log. Records are kept for 7 days. See [Privacy and what is sent](./site/content/en/privacy.md) ([Web](https://armaniacs.github.io/jushoai/en/guides/privacy/)).

## Development

`make help` lists the commands. `make check` runs typecheck, tests, builds for both browsers, manifest checks and web-ext lint. `make build-firefox` writes `dist/firefox-mv3`, and `make e2e-firefox` runs the end-to-end test in a real Firefox (`FIREFOX_BIN` selects the binary, `HEADLESS=1` runs headless). `make site` builds and checks the documentation site into `site-dist/`.
