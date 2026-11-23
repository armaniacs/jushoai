// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_DIR } from './helpers.ts';
import { renderGuidesIndex } from '../../site/lib/guides-index.ts';
import { renderLanding, type Strings } from '../../site/lib/landing.ts';
import { GUIDE_SLUGS, type Guide, type Lang } from '../../site/lib/site.ts';

const load = async (lang: Lang) => JSON.parse(await readFile(join(SITE_DIR, 'i18n', `${lang}.json`), 'utf8')) as Strings;

describe('renderLanding', () => {
  it.each(['ja', 'en'] as const)('renders every section once for %s', async (lang) => {
    const s = await load(lang);
    const html = renderLanding({ lang, base: '/', s });
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    for (const id of ['features', 'demo', 'steps', 'fields', 'providers', 'safety', 'privacy', 'install', 'faq']) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const item of s.features.items) expect(html).toContain(item.title);
    for (const item of s.faq.items) expect(html).toContain(item.q);
    for (const item of s.providers.items) expect(html).toContain(item.name);
  });

  it('links to the language-specific guides and applies the base', async () => {
    const ja = renderLanding({ lang: 'ja', base: '/JushoAI/', s: await load('ja') });
    expect(ja).toContain('href="/JushoAI/guides/getting-started/"');
    expect(ja).toContain('href="/JushoAI/guides/privacy/"');
    const en = renderLanding({ lang: 'en', base: '/', s: await load('en') });
    expect(en).toContain('href="/en/guides/getting-started/"');
  });

  it('shows the install steps with a download button and the mocks', async () => {
    const html = renderLanding({ lang: 'ja', base: '/', s: await load('ja') });
    expect(html).not.toContain('make install');
    expect(html).not.toContain('make build');
    expect(html).toContain('GitHub Releases からダウンロード');
    expect(html).toContain('入力内容の確認');
    expect(html).toContain('AI判定');
  });

  it.each(['ja', 'en'] as const)('links to the Chrome Web Store once with the %s language hint', async (lang) => {
    const html = renderLanding({ lang, base: '/', s: await load(lang) });
    const url = `https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl?hl=${lang}`;
    expect(html.split(`href="${url}"`).length - 1).toBe(1);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('utm_source');
  });

  it.each(['ja', 'en'] as const)('links to Edge Add-ons once with the %s language hint', async (lang) => {
    const html = renderLanding({ lang, base: '/', s: await load(lang) });
    const url = `https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi?hl=${lang}`;
    expect(html.split(`href="${url}"`).length - 1).toBe(1);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it.each([['ja', 'ja'], ['en', 'en-US']] as const)('links to Firefox Add-ons once with the %s locale path', async (lang, amoLocale) => {
    const html = renderLanding({ lang, base: '/', s: await load(lang) });
    const url = `https://addons.mozilla.org/${amoLocale}/firefox/addon/jushoai/`;
    expect(html.split(`href="${url}"`).length - 1).toBe(1);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it.each(['ja', 'en'] as const)('defers the demo video behind a click-to-load facade for %s', async (lang) => {
    const s = await load(lang);
    const html = renderLanding({ lang, base: '/', s });
    // No player in the initial HTML: nothing is fetched from YouTube before activation.
    expect(html).not.toContain('<iframe');
    expect(html).toContain('data-embed="https://www.youtube-nocookie.com/embed/Y3y9ofrsyFo?autoplay=1&amp;rel=0"');
    expect(html).toContain(`data-title="${s.demo.iframeTitle}"`);
    expect(html).toContain('href="https://www.youtube.com/watch?v=Y3y9ofrsyFo"');
    expect(html).not.toContain('www.youtube.com/embed');
  });

  it.each(['ja', 'en'] as const)('shows the demo gif above the video for %s', async (lang) => {
    const s = await load(lang);
    const html = renderLanding({ lang, base: '/', s });
    expect(html).toContain('<video width="1280" height="720" muted loop autoplay playsinline controls');
    expect(html).toContain('src="/assets/demo.mp4"');
    expect(html).toContain('src="/assets/demo.gif"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain(`alt="${s.demo.gifAlt}"`);
    expect(html.indexOf('assets/demo.gif')).toBeLessThan(html.indexOf('video-facade'));
  });

  it('no longer says the extension is unpublished and keeps the Firefox path', async () => {
    const ja = renderLanding({ lang: 'ja', base: '/', s: await load('ja') });
    expect(ja).not.toContain('ストアには公開していません');
    expect(ja).toContain('Firefox');
    const en = renderLanding({ lang: 'en', base: '/', s: await load('en') });
    expect(en).not.toContain('not on the stores');
    expect(en).toContain('Firefox');
  });

  it('adds the interface-language note only on the English page', async () => {
    const ja = renderLanding({ lang: 'ja', base: '/', s: await load('ja') });
    const en = renderLanding({ lang: 'en', base: '/', s: await load('en') });
    expect(en).toContain("The extension's interface is in Japanese.");
    expect(en).toContain('ui-note');
    expect(ja).not.toContain('ui-note');
  });

  it('escapes strings from the dictionary', async () => {
    const mutators: ((s: Strings) => void)[] = [
      (s) => { s.hero.tagline = '<b>x</b>'; },
      (s) => { s.features.items[0]!.body = '<b>x</b>'; },
      (s) => { s.faq.items[0]!.a = '<b>x</b>'; },
      (s) => { s.install.steps[0] = '<b>x</b>'; },
      (s) => { s.install.store = '<b>x</b>'; },
      (s) => { s.demo.lead = '<b>x</b>'; },
      (s) => { s.demo.iframeTitle = '<b>x</b>'; },
      (s) => { s.demo.gifAlt = '<b>x</b>'; },
      (s) => { s.demo.gifCaption = '<b>x</b>'; },
      (s) => { s.providers.items[0]!.body = '<b>x</b>'; },
      (s) => { s.privacy.items[0]!.body = '<b>x</b>'; },
    ];
    for (const mutate of mutators) {
      const s = await load('ja');
      mutate(s);
      const html = renderLanding({ lang: 'ja', base: '/', s });
      expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
      expect(html).not.toContain('<b>x</b>');
    }
  });

  it('links the English page to the English guides and privacy page', async () => {
    const en = renderLanding({ lang: 'en', base: '/', s: await load('en') });
    expect(en).toContain('href="/en/guides/privacy/"');
    expect(en).toContain('href="/en/guides/"');
  });

  it.each(['ja', 'en'] as const)('has each section id exactly once for %s', async (lang) => {
    const html = renderLanding({ lang, base: '/', s: await load(lang) });
    for (const id of ['features', 'demo', 'steps', 'fields', 'providers', 'safety', 'privacy', 'install', 'faq']) {
      expect(html.split(`id="${id}"`).length - 1).toBe(1);
    }
  });
});

describe('renderGuidesIndex', () => {
  const guide = (slug: (typeof GUIDE_SLUGS)[number], order: number, lang: Lang = 'ja'): Guide => ({
    lang, slug, title: `T-${slug}`, description: `D-${slug}`, order, html: '', headings: [], links: [],
  });

  it('lists guides of the language in order with absolute links', async () => {
    const s = await load('ja');
    const guides = [guide('privacy', 3), guide('getting-started', 1), guide('ai-providers', 2), guide('privacy', 1, 'en')];
    const html = renderGuidesIndex({ lang: 'ja', base: '/JushoAI/', s, guides });
    expect(html.indexOf('T-getting-started')).toBeLessThan(html.indexOf('T-ai-providers'));
    expect(html.indexOf('T-ai-providers')).toBeLessThan(html.indexOf('T-privacy'));
    expect(html).toContain('href="/JushoAI/guides/privacy/"');
    expect(html).toContain('<h1>ガイド</h1>');
    expect(html).not.toContain('/en/guides/');
  });

  it('renders the 4 localized group headings in order for ja and en', async () => {
    const allSlugs = [...GUIDE_SLUGS];
    for (const [lang, expected] of [
      ['ja', ['まずはここから', '毎日の入力と使いこなし', 'AI と安全・プライバシー', '仕組み・困ったとき・その他']],
      ['en', ['Start here', 'Everyday use', 'AI, safety and privacy', 'Reference and help']],
    ] as const) {
      const s = await load(lang);
      const guides = allSlugs.map((slug, i) => guide(slug, i + 1, lang));
      const html = renderGuidesIndex({ lang, base: '/', s, guides });
      for (const heading of expected) {
        expect(html).toContain(`<h2 class="guide-group">${heading}</h2>`);
      }
      expect(html.indexOf(expected[0])).toBeLessThan(html.indexOf(expected[1]));
      expect(html.indexOf(expected[1])).toBeLessThan(html.indexOf(expected[2]));
      expect(html.indexOf(expected[2])).toBeLessThan(html.indexOf(expected[3]));
      expect((html.match(/<ul class="guide-list">/g) ?? []).length).toBe(4);
    }
  });

  it('omits empty groups and sorts guides within each group by order', async () => {
    const s = await load('en');
    const guides = [
      guide('addresses', 3, 'en'),
      guide('getting-started', 1, 'en'),
      guide('profiles', 2, 'en'),
      guide('glossary', 10, 'en'),
    ];
    const html = renderGuidesIndex({ lang: 'en', base: '/', s, guides });
    expect(html).toContain('<h2 class="guide-group">Start here</h2>');
    expect(html).toContain('<h2 class="guide-group">Reference and help</h2>');
    expect(html).not.toContain('Everyday use');
    expect(html).not.toContain('AI, safety and privacy');
    expect(html.indexOf('T-getting-started')).toBeLessThan(html.indexOf('T-profiles'));
    expect(html.indexOf('T-profiles')).toBeLessThan(html.indexOf('T-addresses'));
  });

  it('renders ungrouped guides in a trailing list as fallback', async () => {
    const s = await load('ja');
    const unknown = { ...guide('privacy', 20, 'ja'), slug: 'unknown-guide' as (typeof GUIDE_SLUGS)[number], title: 'T-unknown' };
    const guides = [unknown, guide('getting-started', 1, 'ja')];
    const html = renderGuidesIndex({ lang: 'ja', base: '/', s, guides });
    expect(html).toContain('T-unknown');
    expect(html.indexOf('T-getting-started')).toBeLessThan(html.indexOf('T-unknown'));
  });
});
