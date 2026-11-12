# Task SIMP-T9 report — S8 doctype 統一方針決定 + 最小正規化

- ブランチ: `work/pbi-208-round4`
- 実施日: 2026-11-12
- 変更: なし (調査・方針決定のみ。commit なし)

## 1. 分布集計 (`samples/*.html` 全 134 件)

### 1.1 doctype 有無

| 区分 | 件数 | 割合 |
| --- | --- | --- |
| `<!doctype html>` あり | 77 | 57% |
| なし (bare: `<!--…-->` または `<form>` 始まり) | 57 | 43% |

どちらもテストに影響しない。`tests/integration/samples.test.ts` の `planFor` は
`DOMParser().parseFromString(html, 'text/html').body.innerHTML` で body 内容だけを取り出して
`scanFields` に渡すため、doctype / `<html>` / `<head>` / `<body>` の有無は分類・計画の結果を変えない。

### 1.2 doctype あり 77 件の内訳

| 書式 | 件数 | 例 |
| --- | --- | --- |
| `<!doctype html>` + コメント + `<html lang="ja"><meta charset="utf-8"><title>…` ワンライナー + `<form>` | 70 | `ff-csr.html`, `6932.html` |
| 同上ただし `<html lang="en">` (海外系フォーム) | 3 | `bst-inquire.html`, `isi-contact.html`, `nishimachi-inquiry.html` |
| 完全文書 (`<html><head>…</head><body>…`) | 4 | `demo-registration.html`, `demo-request-info.html`, `demo-shop-checkout.html`, `demo-ai-ambiguous.html` |

備考: S8 行の記述 (`ff-csr.html:1–13` が full header、bare が約 100 件) は現時点で古い。
`ff-csr.html` は現在ワンライナー形式であり、`<head>` / `<body>` を持つのは demo 系 4 件のみ。
bare 側も 57 件まで減少している (doctype 派が多数派に逆転済み)。

### 1.3 bare 57 件の内訳

- 先頭が `<!-- Minimal reproduction … -->` コメント: 56 件
- 先頭が `<form>` 直接: 1 件 (`reinvent-registration-contact.html`)

### 1.4 `id=""` 空属性

- 443 箇所 / 44 ファイル。
- 主な発生源: scaffolder が `id` 不明時も `id="${c.id}"` を無条件出力するため (`scaffold-fixture.mjs:79`)、
  および実ページ由来の name-only 欄 (form-mailer 系の `singleAnswer(…)`、`enquete_…` など)。
- scanner (`src/dom/scan-fields.ts:53,107,146`) は `el.id` をそのまま `htmlId` として扱い、
  空でも例外なく分類フローが継続する。削る実益なし。

### 1.5 `value=""`

- 1695 箇所 / 124 ファイル。`value=""` を持たないファイルは 10 件
  (`apaman-contact.html`, `furigana-fieldset-form.html`, `katakana-fieldset-form.html`,
  `nkanzai-contact.html`, `ois-contact.html`, `overseas-address-form.html`,
  `reinvent-registration-contact.html`, `roman-name-form.html`, `single-field-form.html`,
  `tosyo-00001-html.html`)。
- scaffolder が全 input に `value=""` を付与する既定 (`scaffold-fixture.mjs:79`) のため、
  scaffolder 生成物では 100% 存在する。無害かつ「空であることの明示」になる。

## 2. 決定方針

1. **bare form (`<!--…--><form>…</form>`) を正とする。** 理由: scaffolder の既定出力がその書式であり、
   新規 fixture が自然にその形になること、テストが body 内容しか見ないため doctype の有無に機能差がないこと。
2. **新規 fixture は scaffolder の既定に従う** (doctype を付けない。`value=""` 付き、`id` 不明時は `id=""` のまま)。
3. **既存 fixture の正規化は行わない** (横断 churn 禁止)。doctype あり 77 件も含め、touch した際に寄せる程度とする。
4. **`value=""` は残す** (scaffolder 既定で無害・明示的)。**`id=""` も削らない** (scanner が許容し実益なし)。
5. **demo 系 4 件の完全文書も現状維持。** 手動確認用デモであり、doctype 方針の対象外とする。

## 3. 変更の有無と理由

- **scaffolder 変更: なし。** `renderFixture` (`scripts/scaffold-fixture.mjs:68–83`) の出力は
  `<!-- … -->\n<form>…</form>` という bare 形式であり、方針 (bare を正) と既に一致している。
  brief の「食い違う場合のみ最小変更」条件に該当しないため、触らない。
- **fixture 正規化: なし。** 横断 churn 禁止が原則であり、削除がゼロリスクかつ自明な箇所も特定できなかった
  (doctype / `<html>` ワンライナー / `<head>` はいずれもテスト結果に影響せず、消す側にも残す側にも機能的利得がない。
  「迷ったら触るな」に従い不変とした)。`ff-csr.html` のヘッダも現行ワンライナー形式で無害のため対象外。
- よって **commit なし**。本レポートファイルの作成のみ。

## 4. 検証

- 何も変えていないため、brief に従い検証 (tests/scripts、samples.test.ts) は不要と判断し、未実施。
- `git status --short` はクリーンを確認済み (レポートファイル自体は untracked として残る運用を想定)。
