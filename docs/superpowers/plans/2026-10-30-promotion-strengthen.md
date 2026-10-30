# PR・普及強化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** README と GitHub Pages にデモ GIF を埋め込み、ストア掲載情報を新 UI に追いつかせ、リリース周知とストアレビュー対応の運用型を整える。

**Architecture:** 録画は `video/playwright/lib.mjs` の共有骨格（launch/record/serveStatic）を流用し、GIF は `site/assets/demo.gif` の1枚で landing と README の両面を満たす（README からは公開 URL で参照）。文面の運用型は `docs/store-listing.md` と `promo/README.md` に置く。設計は `docs/superpowers/specs/2026-10-30-promotion-strengthen-design.md`。

**Tech Stack:** Playwright（録画・スクリーンショット、remotion/package.json 経由で読む）、ffmpeg 9.0.2（GIF 変換）、自作サイトビルド（`site/lib`、日英対応検査）、Vitest（`tests/site/`）

---

## ファイル構成

- Create: `video/playwright/record-readme.mjs` ― README 用 GIF の1シーン録画（samples を自前配信 port 4182）
- Create: `site/assets/demo.gif` ― GIF 資産（録画から ffmpeg で変換）
- Create: `video/playwright/screenshot.mjs` ― ストア用スクリーンショット5枚のキャプチャ
- Modify: `site/lib/landing.ts:64-72` ― `#demo` セクションに GIF を追加
- Modify: `site/i18n/ja.json` / `site/i18n/en.json`（demo 節に gifAlt/gifCaption）
- Modify: `site/assets/site.css` ― `.demo-gif` のスタイル
- Modify: `tests/site/landing.test.ts` ― GIF 表示のテスト
- Modify: `README.md` / `README.en.md` ― GIF と動画リンク
- Modify: `docs/blog/01-for-users-tel-split-fixed.md` / `02-for-engineers-why-llm-fixed.md` / `03-for-developers-reanalyze-internals.md` ― 壊れた画像参照の削除
- Modify: `docs/store-listing.md` ― 5枚構成の新 UI 化、新着情報の節、Issue 案内
- Create: `docs/blog/04-for-users-privacy-design.md` ― 「値を送らない」設計の記事
- Create: `promo/README.md` ― 機能紹介投稿のテンプレート型
- Modify: `.gitignore` ― `video/playwright/.store-shots/`

---

### Task 1: record-readme.mjs（README 用 GIF の録画スクリプト）

**Files:**
- Create: `video/playwright/record-readme.mjs`

- [ ] **Step 1: スクリプトを書く**

`video/playwright/record-readme.mjs` を新規作成する。`record-drag.mjs` と同じ形で自前の配信（port 4182、samples のみ）を立て、別ターミナルを不要にする。headless の Chromium（channel: 'chromium'）で拡張を読み込み、`launch()` が 1920x1080 で録画する。

```js
import path from 'path';
import { fileURLToPath } from 'url';
import { record, serveStatic } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(ROOT, 'dist/chrome-mv3');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const PORT = 4182;
const BASE = `http://127.0.0.1:${PORT}/`;

// One scene for the README GIF: button click, preview, apply. The promo clips
// sweep the preview rows for the 2-minute video; this one keeps every wait
// short so the whole clip stays inside 20 seconds and the GIF needs no trim.
const server = await serveStatic([path.join(ROOT, 'samples')], PORT);
try {
  const { ev } = await record({
    workDir: WORK,
    extDir: EXT,
    publicDir: PUBLIC,
    name: 'readme-clip',
    file: 'demo-registration.html',
    base: BASE,
    waitMs: 1500,
    headless: true,
    channel: 'chromium',
    script: async (h) => {
      await h.sleep(2500);
      const btn = await h.find('JushoAI で入力');
      await h.move(btn, 700);
      await h.sleep(600);
      h.mark('open');
      await h.click();
      await h.sleep(1000);
      const apply = await h.find('入力する');
      await h.move(apply, 2600);
      await h.sleep(500);
      h.mark('apply');
      await h.click();
      await h.sleep(3500);
    },
  });
  console.log(JSON.stringify(ev));
} finally {
  server.close();
}
```

- [ ] **Step 2: 拡張をビルドする**

Run: `make build`
Expected: `dist/chrome-mv3` に出力される（exit 0）

- [ ] **Step 3: 録画を実行する**

Run: `node video/playwright/record-readme.mjs`
Expected: JSON の mark 時刻（`{"ready":...,"open":...,"apply":...,"end":...}`）が出力され、`video/remotion/public/readme-clip.webm` が作られる

- [ ] **Step 4: 長さを確認する**

Run: `ffprobe -v error -show_entries format=duration -of csv=p=0 video/remotion/public/readme-clip.webm`
Expected: 10〜20 の範囲（秒）。外れる場合は Step 1 の sleep を 2000 刻みで調整して Step 3 をやり直す

- [ ] **Step 5: コミットする**

```bash
git add video/playwright/record-readme.mjs
git commit -m "test(video): README用GIFの1シーン録画スクリプトを追加"
```

---

### Task 2: ffmpeg で GIF 変換（site/assets/demo.gif）

**Files:**
- Create: `site/assets/demo.gif`

- [ ] **Step 1: 変換する**

Run:

```bash
ffmpeg -y -i video/remotion/public/readme-clip.webm \
  -vf "fps=12,scale=1280:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  site/assets/demo.gif
```

Expected: `site/assets/demo.gif` が作られる（exit 0）

- [ ] **Step 2: サイズを確認する**

Run: `ls -lh site/assets/demo.gif`
Expected: 2〜4MB。4MB を超える場合は fps=10 に落として Step 1 をやり直す

- [ ] **Step 3: コミットする**

```bash
git add site/assets/demo.gif
git commit -m "docs(site): READMEとランディング用のデモGIFを追加"
```

---

### Task 3: landing への GIF 埋め込み（TDD）

**Files:**
- Modify: `tests/site/landing.test.ts`
- Modify: `site/i18n/ja.json:39-45`
- Modify: `site/i18n/en.json:39-45`
- Modify: `site/lib/landing.ts:64-72`
- Modify: `site/assets/site.css:83-84`

- [ ] **Step 1: 失敗するテストを書く**

`tests/site/landing.test.ts` の「embeds the demo video without cookies」テスト（64〜76 行目付近）の直後に追加する。

```ts
  it.each(['ja', 'en'] as const)('shows the demo gif above the video for %s', async (lang) => {
    const s = await load(lang);
    const html = renderLanding({ lang, base: '/', s });
    expect(html).toContain('src="/assets/demo.gif"');
    expect(html).toContain(`alt="${s.demo.gifAlt}"`);
    expect(html.indexOf('assets/demo.gif')).toBeLessThan(html.indexOf('class="video"'));
  });
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run tests/site/landing.test.ts`
Expected: FAIL（`s.demo.gifAlt` が undefined で `alt="undefined"` に一致しない）

- [ ] **Step 3: i18n に文言を追加する**

`site/i18n/ja.json` の demo 節（39〜45 行目）に追加する。

```json
    "gifAlt": "入力からプレビュー承認までの流れ（GIF）",
    "gifCaption": "GIF は 15 秒ほど。全文入りの紹介動画は下にあります。"
```

`site/i18n/en.json` の demo 節に追加する。

```json
    "gifAlt": "The flow from clicking the button to approving the preview (GIF)",
    "gifCaption": "The GIF is about 15 seconds. The full video is below."
```

- [ ] **Step 4: landing に GIF を足す**

`site/lib/landing.ts` の `#demo` セクション（64〜72 行目）で、`section-lead` の段落の後、`div.video` の前に1行足す。

```ts
<figure class="demo-gif"><img src="${p.base}assets/demo.gif" alt="${e(s.demo.gifAlt)}" loading="lazy" width="1280" height="800"><figcaption>${e(s.demo.gifCaption)}</figcaption></figure>
```

- [ ] **Step 5: XSS の escape テストにも加える**

`tests/site/landing.test.ts` の escape テスト（98〜99 行目付近の変異リスト）に2つ足す。

```ts
      (s) => { s.demo.gifAlt = '<b>x</b>'; },
      (s) => { s.demo.gifCaption = '<b>x</b>'; },
```

- [ ] **Step 6: サイトのテストが通ることを確認する**

Run: `npx vitest run tests/site/`
Expected: PASS（landing.test.ts の全件を含む tests/site 全ファイル）

- [ ] **Step 7: GIF のスタイルを足す**

`site/assets/site.css` の `.video` の規則（83〜84 行目）の直前に追加する。

```css
.demo-gif { margin: 2rem 0 0; background: var(--code-bg); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.demo-gif img { display: block; width: 100%; height: auto; }
.demo-gif figcaption { padding: 0.5rem 0.75rem; }
```

- [ ] **Step 8: サイトのビルド検査を通す**

Run: `make site`
Expected: exit 0（日英のキー対応・H2 数検査を含む）。`check-site.ts` が img の alt を検査するので、alt の無い img では失敗する

- [ ] **Step 9: コミットする**

```bash
git add tests/site/landing.test.ts site/i18n/ja.json site/i18n/en.json site/lib/landing.ts site/assets/site.css
git commit -m "feat(site): ランディングのdemo節にデモGIFを追加"
```

---

### Task 4: README（日英）に GIF と動画リンクを足す

**Files:**
- Modify: `README.md:5-9`（最初の段落の後、README-I18N のマーカーの前）
- Modify: `README.en.md`（同じ位置）

- [ ] **Step 1: README.md に足す**

最初の段落の直後（`<!-- README-I18N:START -->` の前）に挿入する。

```markdown
![JushoAI で入力の流れ。ボタンを押すとプレビューが出て、「入力する」で欄に入る](https://armaniacs.github.io/jushoai/assets/demo.gif)

動いているところは [紹介動画](https://www.youtube.com/watch?v=Y3y9ofrsyFo)（約 2 分）でも見られる。
```

- [ ] **Step 2: README.en.md に足す**

README.md と同じ位置（intro 段落の直後）に挿入する。

```markdown
![The JushoAI fill flow: press the button, review the preview, approve to fill the fields](https://armaniacs.github.io/jushoai/assets/demo.gif)

You can also watch the [demo video](https://www.youtube.com/watch?v=Y3y9ofrsyFo) (about 2 minutes).
```

- [ ] **Step 3: 文字種を確認する**

Run: `python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py README.md README.en.md`
Expected: `OK: no out-of-range characters`

- [ ] **Step 4: コミットする**

```bash
git add README.md README.en.md
git commit -m "docs(readme): 冒頭にデモGIFと紹介動画へのリンクを追加"
```

---

### Task 5: screenshot.mjs（ストア用スクリーンショット5枚）

**Files:**
- Create: `video/playwright/screenshot.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: スクリプトを書く**

`video/playwright/screenshot.mjs` を新規作成する。2回 launch する（初回は seed なしで初回向けガイドを出す、2回目はダミープロファイルで入力の流れを出す）。設定ページの節は `record-ai.mjs` と同じ nav ラベル（プロファイル・住所・AI 判定）で移動する。出力先は `video/playwright/.store-shots/`（コミットしない。手でストアのダッシュボードに上げる）。

```js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch, serveStatic, sleep, buttonCenter } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(ROOT, 'dist/chrome-mv3');
const WORK = path.join(HERE, '.work');
const OUT = path.join(HERE, '.store-shots');
const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}/`;
const W = 1280;
const H = 800;

// Store screenshots (1280x800, max 5) from samples and the options page with
// the dummy profile. The files are never committed: they are uploaded to each
// store dashboard by hand (docs/store-listing.md).
fs.mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`shot: ${name}`);
};
const server = await serveStatic([path.join(ROOT, 'samples')], PORT);
try {
  // 1) First-time form with the floating guide (no seeded storage).
  const guide = await launch({ workDir: WORK, extDir: EXT, name: 'shots-guide', seed: false });
  const pg = await guide.ctx.newPage();
  await pg.setViewportSize({ width: W, height: H });
  await pg.goto(BASE + 'demo-registration.html');
  await sleep(3500);
  await shot(pg, '1-form-guide.png');
  await guide.ctx.close();

  // 2-3) Preview and filled form with the seeded dummy profile.
  const fill = await launch({ workDir: WORK, extDir: EXT, name: 'shots-fill' });
  const page = await fill.ctx.newPage();
  await page.setViewportSize({ width: W, height: H });
  const cdp = await fill.ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await page.goto(BASE + 'demo-registration.html');
  await sleep(3000);
  const btn = await buttonCenter(page, cdp, 'JushoAI で入力');
  await page.mouse.click(btn.x, btn.y);
  await sleep(1500);
  await shot(page, '2-preview.png');
  const apply = await buttonCenter(page, cdp, '入力する');
  await page.mouse.click(apply.x, apply.y);
  await sleep(2500);
  await shot(page, '3-form-after.png');

  // 4-5) Settings pages (profile, then the AI provider section).
  await page.goto(`chrome-extension://${fill.id}/options.html`);
  await sleep(1500);
  await shot(page, '4-profile-settings.png');
  const nav = page.locator('a, button, li, div').filter({ hasText: /^AI 判定$/ }).first();
  const b = await nav.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(1500);
  await shot(page, '5-ai-settings.png');
  await fill.ctx.close();
} finally {
  server.close();
}
```

- [ ] **Step 2: .gitignore に追記する**

`.gitignore` の `video/playwright/.work/` の行（25 行目）の後に1行足す。

```
video/playwright/.store-shots/
```

- [ ] **Step 3: 実行する**

Run: `node video/playwright/screenshot.mjs`
Expected: `shot: 1-form-guide.png` から `shot: 5-ai-settings.png` までの5行が出力され、`video/playwright/.store-shots/` に5枚の PNG が作られる。ストアに上げる画像は 1280x800 であること（`sips -g pixelWidth -g pixelHeight video/playwright/.store-shots/*.png` で確認）

- [ ] **Step 4: 5枚を目で確認する**

`video/playwright/.store-shots/` の5枚を開いて、個人情報が写っていないこと（ダミープロファイルのみ）と、新 UI（初回向けガイド・保存分離・ナビ件数バッジ）が写っていることを確認する。写り込みがあれば撮り直す

- [ ] **Step 5: コミットする**

```bash
git add video/playwright/screenshot.mjs .gitignore
git commit -m "test(video): ストア用スクリーンショットのキャプチャスクリプトを追加"
```

---

### Task 6: blog 記事の壊れた画像参照を削る

**Files:**
- Modify: `docs/blog/01-for-users-tel-split-fixed.md:5,9`
- Modify: `docs/blog/02-for-engineers-why-llm-fixed.md:5,9`
- Modify: `docs/blog/03-for-developers-reanalyze-internals.md:5,7`

**背景:** 3記事とも同じ `images/before-reanalyze.png` と `images/after-reanalyze.png` を参照するが、`docs/blog/images/` は空で画像は一度もコミットされていない。「再分析前」の状態（tel 3欄が単体扱いで同じ長い番号が入り maxlength 警告が3連）は、分類の2段階化（兄弟欄の補正で電話3欄を tel1/2/3 に束ねる）で修正済みのバグであり、現在のコードでは再現できない。再現のためにバグを戻すことはしないので、参照を削る。

- [ ] **Step 1: 3記事から画像行を削る**

`docs/blog/01-for-users-tel-split-fixed.md` から次の2行を削除する。

```markdown
![再分析前。電話番号の3欄に同じ長い番号が入り、文字数を超えるため入力しませんと出ます](images/before-reanalyze.png)
![再分析後。03 / 3581 / 4321 に分かれ、AI判定バッジが付きます](images/after-reanalyze.png)
```

`docs/blog/02-for-engineers-why-llm-fixed.md` から次の2行を削除する。

```markdown
![再分析前。電話3欄がすべて同一値でmaxlength警告](images/before-reanalyze.png)
![再分析後。tel1/tel2/tel3に正しく分割され、AI判定が付きます](images/after-reanalyze.png)
```

`docs/blog/03-for-developers-reanalyze-internals.md` から次の2行を削除する。

```markdown
![before: tel単体扱いでmaxlength警告3連](images/before-reanalyze.png)
![after: tel1/tel2/tel3に割れて警告が消えます](images/after-reanalyze.png)
```

- [ ] **Step 2: 空のディレクトリを消す**

Run: `rmdir docs/blog/images`
Expected: `docs/blog/images/` が空なら消える。空でなければ中身を確認してから判断する

- [ ] **Step 3: 文字種を確認する**

Run: `python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py docs/blog/`
Expected: `OK: no out-of-range characters`

- [ ] **Step 4: コミットする**

```bash
git add docs/blog/01-for-users-tel-split-fixed.md docs/blog/02-for-engineers-why-llm-fixed.md docs/blog/03-for-developers-reanalyze-internals.md
git commit -m "docs(blog): 一度もコミットされていない画像参照を削除"
```

---

### Task 7: store-listing.md の更新（5枚構成・新着情報・Issue 案内）

**Files:**
- Modify: `docs/store-listing.md:134-151`（画像の節）
- Modify: `docs/store-listing.md`（説明欄の節と末尾付近）

- [ ] **Step 1: 5枚構成を新 UI に合わせて書き換える**

「スクリーンショットは `samples/demo-registration.html` と設定ページを使い、次の順に並べる。」の下の5項目を次に置き換える。

```markdown
1. 入力前のフォームと「JushoAI で入力」ボタン（浮遊ボタンのバッジ付き）
2. 入力前のプレビュー
3. 入力後のフォーム
4. プロファイルの設定ページ（ページ別の保存とナビの件数バッジ）
5. AI プロバイダの設定ページ
```

（初回向けガイドは設定ページ側の仕組み（`src/entrypoints/options/guide-controller.ts`）であり、フォーム側には出ないため、shot 1 はバッジ付きのフォームとする。実装中に判明。）

さらに「画像のファイルはリポジトリに含めない。」の段落の後に1行足す。

```markdown
スクリーンショットの撮り直しは `node video/playwright/screenshot.mjs` で行う（`video/playwright/.store-shots/` に出る。コミットしない）。
```

- [ ] **Step 2: 説明欄に Issue 案内を足す**

「説明」の欄の文面の末尾に1行足す。

```markdown
ストアのレビューには返信できないため、不具合や要望は GitHub の Issue（[作成フォーム](https://github.com/armaniacs/jushoai/issues/new/choose)）へお願いします。
```

- [ ] **Step 3: 新着情報の節を足す**

`## プロモーション動画（任意）` の節の直前に次の節を挿入する。

```markdown
## 新着情報（リリースごとに更新）

リリースのたびに、次の3面を1回の作業で更新する。

1. CHANGELOG の Unreleased を版本として確定する（`docs/release.md` の手順）
2. ストアの「新着情報」欄に、CHANGELOG の Added/Fixed からユーザー向けの文面を作る。技術用語を落とし、利用者が得る変化を1行ずつ書く（例: 「保存をプロファイルと住所のページ別に分けました」「初めての方に設定の流れを案内するガイドを追加しました」）
3. X にリリース告知を投稿する。構成は「バージョン番号 + 追加された機能の1行 + ストアまたはサイトへのリンク」。長文ポストの型は `promo/2026-10-10-store-registration/x-post.md` を参照する
```

- [ ] **Step 4: 文字種を確認する**

Run: `python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py docs/store-listing.md`
Expected: `OK: no out-of-range characters`

- [ ] **Step 5: コミットする**

```bash
git add docs/store-listing.md
git commit -m "docs: ストア掲載の5枚構成を新UIに合わせ、新着情報とレビュー対応の方針を追加"
```

---

### Task 8: 「値を送らない」設計の記事

**Files:**
- Create: `docs/blog/04-for-users-privacy-design.md`

- [ ] **Step 1: 記事を書く**

`docs/blog/04-for-users-privacy-design.md` を新規作成する。事実は `site/content/ja/privacy.md` と `site/content/ja/safety.md`（読んで照合する）、README の「AI 判定を使うには」から取る。画像は使わない。

```markdown
# 登録した名前や住所は、どこにも送られない

フォーム自動入力の拡張機能を名乗ると、最初に聞かれるのがこれです。「入力した情報、どこかに送られていない?」

結論から書きます。JushoAI は、プロファイルに登録した氏名や住所をどこにも送りません。AI を設定しない限り、外部への通信はありません。この記事は、その中身を説明するものです。

## AI を設定しなければ、通信は一切ない

初期設定では AI はオフです。この状態でフォームに入力すると、欄の判定も値の整形も、すべて端末の中で完結します。ページを開いただけで通信することはありませんし、入力も勝手には行いません。

AI（OpenAI 互換 API、Gemini、ブラウザ内蔵 AI）を設定した場合でも、送られるのは「ルールで判定できなかった欄」の情報だけです。

## 送るもの、送らないもの

送るのは、欄を区別するための情報だけです。

- 欄を区別するための内部 ID（HTML の id 属性とは別の、拡張が生成した ID）
- 欄の種類（type）と最大文字数（maxLength）
- name、label、placeholder、見出し。それぞれ 80 文字までに切り詰める

送らないのは、次のものです。

- プロファイルに登録した氏名・フリガナ・住所
- 欄に入っている値
- select の選択肢

言い換えると、拡張機能が AI に聞くのは「この欄は何の欄?」という質問だけで、「この名前をどう整形する?」という質問はしません。値を作る処理は決定的なコードで行うため、AI が学習先に値を渡す経路がそもそもありません。

なお、label や見出しはページに表示されている文言なので、ページによっては個人情報が含まれることがあります。そこまで気になる場合は AI を設定しなければ、通信自体が起きません。

## 通信した記録は、端末の中で見られる

AI を呼び出すたびに、記録が端末内に残ります。設定ページの「通信の監査ログ」で、いつ・どのプロバイダに・何欄を送ったかを一覧で確認でき、ダウンロードと削除もできます。ブラウザ内蔵 AI も接続テストも記録対象です。「送られていない」を信じるのではなく、確認できるようにしてあります。

## 接続先も検査している

API キーを保存するとき、送信先のホストを名前解決の結果まで検査します。解決先が内部ネットワークのアドレスになる・解決を確認できないときは保存を拒否します。呼び出しの直前にも解決先を再確認し、呼び出しごとに取り直します。

## まとめ

- AI を設定しなければ、通信は一切ない
- AI を設定しても送るのは欄のメタデータだけで、プロファイルの値と欄に入っている値は送らない
- 送った記録は設定ページの監査ログで確認できる

仕組みの一覧は[ドキュメントサイト](https://armaniacs.github.io/jushoai/guides/safety/)の「安全のための仕組み」、「[プライバシーと送信データ](https://armaniacs.github.io/jushoai/guides/privacy/)」にまとめてあります。
```

- [ ] **Step 2: 事実を照合する**

Run: 記事の各断言を `site/content/ja/privacy.md` と `site/content/ja/safety.md` と README「AI 判定を使うには」の節と突き合わせる。
Expected: 送るもの/送らないものの一覧、監査ログの欄（一覧・ダウンロード・削除、組み込み AI と接続テストも記録）、ホスト検証（保存時と呼び出し直前の2段階、呼び出しごとに取り直し）の記述が一致する。違う箇所はガイドの文言に合わせて直す

- [ ] **Step 3: 文字種を確認する**

Run: `python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py docs/blog/04-for-users-privacy-design.md`
Expected: `OK: no out-of-range characters`

- [ ] **Step 4: コミットする**

```bash
git add docs/blog/04-for-users-privacy-design.md
git commit -m "docs(blog): プロファイルの値を送らない設計の記事を追加"
```

---

### Task 9: promo/README.md（機能紹介投稿のテンプレート型）

**Files:**
- Create: `promo/README.md`

- [ ] **Step 1: テンプレート型を書く**

`promo/README.md` を新規作成する。

```markdown
# promo

ストア公開の告知と機能紹介の文面を置く。1キャンペーン1ディレクトリで、`promo/<日付>-<名前>/` に `zenn.md`、`note.md`、`x-post.md` を入れる（例: `2026-10-10-store-registration/`）。

## 機能紹介投稿の型

機能を1つ紹介するときは、次の構成で書く。

- 1機能・1 GIF・1リンク。GIF は `site/assets/demo.gif` か、その機能を写した短い録画を使う
- 冒頭の1行で、利用者が得る変化を書く（例: 「登録した住所を、ワンクリックで複数の住所欄に使い分けられる」）
- 続く3〜4行で、押す場所と確認できること（プレビューで確認、入力前に上書きしない）を書く
- 最後の1行にリンク。ストア導線かドキュメントサイト

X は Markdown を解釈しないので、見出しは「■」、区切りは空行と改行で作る。画像は最大 4 枚、長文ポストは 200〜600 字。文面の例は `2026-10-10-store-registration/x-post.md` を参照する。
```

- [ ] **Step 2: 文字種を確認する**

Run: `python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py promo/README.md`
Expected: `OK: no out-of-range characters`

- [ ] **Step 3: コミットする**

```bash
git add promo/README.md
git commit -m "docs(promo): 機能紹介投稿のテンプレート型を追加"
```

---

### Task 10: 最終検証

- [ ] **Step 1: サイトのビルド検査を通す**

Run: `make site`
Expected: exit 0（site-dist に生成され、日英のキー対応・H2 数検査が通る）

- [ ] **Step 2: 両ブラウザのビルドと全体検査を通す**

Run: `make check`
Expected: exit 0（typecheck + 全テスト + 両ブラウザの build + manifest 検査 + web-ext lint）

- [ ] **Step 3: GitHub Pages の公開を確認する**

main に push すると `pages.yml` が `site/**` の変更で自動デプロイする（SITE_BASE は pages の base_path）。デプロイ後に次を確認する。

Run: `curl -sI https://armaniacs.github.io/jushoai/assets/demo.gif`
Expected: HTTP 200 と image/gif。合わせてランディングの `#demo` セクションに GIF が表示されることをブラウザで確認する

- [ ] **Step 4: ストアの5枚をダッシュボードに上げる（手動）**

`video/playwright/.store-shots/` の5枚を、Chrome ウェブストア・Edge アドオン・Firefox AMO の各ダッシュボードにアップロードする。手順は `docs/store-listing.md` の画像の節
