# JushoAI

A browser extension for Chromium-based browsers (Chrome and Edge) and Firefox 128 or later that fills Japanese web forms (split names, furigana and split addresses) into the right fields in one click. Rules classify the fields, and an AI you choose (an OpenAI-compatible API, Gemini, or the browser's built-in AI) helps only with the fields the rules cannot decide. Values are produced by deterministic code, and your profile values are never sent anywhere. Only field metadata goes to the provider, and only if you turn AI on. You review everything in a preview before it is entered.

If you just want to use it, read up to Usage. To contribute, start with Development.

<!-- README-I18N:START -->

The extension's screens are in Japanese. [日本語](./README.md) | **English**

<!-- README-I18N:END -->

- Documentation: https://armaniacs.github.io/jushoai/en/
- Requests and bugs: [Create an issue](https://github.com/armaniacs/jushoai/issues/new/choose) (opens a form for a feature request, a form that did not fill, or a bug)
- License: GPL-3.0-only ([LICENSE](LICENSE); a summary of the terms is in the [documentation](https://armaniacs.github.io/jushoai/en/guides/license/))

## Install

It is not published in a store. Unzip the release from [GitHub Releases](https://github.com/armaniacs/jushoai/releases) and load it.

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge) and turn on developer mode.
   - For Firefox, open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `manifest.json` in the `firefox-mv3` folder (it is removed when Firefox restarts).
2. Choose "Load unpacked" and select the unzipped folder.
3. In the extension's settings page, register your profile and addresses.

## Usage

1. In the settings page, register profiles (up to 10) and addresses. An address can be tied to the profile that uses it.
2. Click `JushoAI で入力` (fill with JushoAI), which appears near the form.
3. Review the preview and click `入力する` (fill in).

The toolbar icon shows what is registered and which profile is in use. Fields that already have a value are not overwritten, and values longer than a field's maximum length are flagged instead of entered.

## AI provider (optional)

AI is off by default. In the settings page, choose a provider under `AI 判定`: an OpenAI-compatible API (OpenAI, Groq, Mistral, Ollama, LM Studio), Google Gemini, or the browser's built-in AI (Chrome with Gemini Nano, Edge with Phi-mini; not available in Firefox). Nothing is sent unless you turn it on, and only when you click the fill button. What is sent and what is not: see the [privacy guide](https://armaniacs.github.io/jushoai/en/guides/privacy/).

## Feedback

Feature requests, forms that did not fill and bug reports are welcome as GitHub issues: [Create an issue](https://github.com/armaniacs/jushoai/issues/new/choose). Issues are public, so do not include personal information.

## License

GNU General Public License v3.0 only (GPL-3.0-only). Copyright (C) 2026 armaniacs. You may use, copy, modify and redistribute it; if you distribute it, you must provide the source code under the same GPLv3 terms. The full text is in [LICENSE](LICENSE).

## Development

`make help` lists the commands. `make check` runs typecheck, tests, builds for both browsers, manifest checks and web-ext lint. `make build-firefox` writes `dist/firefox-mv3`, and `make e2e-firefox` runs the end-to-end test in a real Firefox (`FIREFOX_BIN` selects the binary, `HEADLESS=1` runs headless). `make site` builds and checks the documentation site into `site-dist/`.
