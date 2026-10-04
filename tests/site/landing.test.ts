// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { renderGuidesIndex } from '../../site/lib/guides-index.ts';
import { renderLanding, type Strings } from '../../site/lib/landing.ts';
import { GUIDE_SLUGS, type Guide, type Lang } from '../../site/lib/site.ts';

const load = async (lang: Lang) => JSON.parse(await readFile(`site/i18n/${lang}.json`, 'utf8')) as Strings;

describe('renderLanding', () => {
  it.each(['ja', 'en'] as const)('renders every section once for %s', async (lang) => {
    const s = await load(lang);
    const html = renderLanding({ lang, base: '/', s });
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    for (const id of ['features', 'steps', 'fields', 'providers', 'privacy', 'install', 'faq']) {
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

  it('shows the install command with a copy button and the mocks', async () => {
    const html = renderLanding({ lang: 'ja', base: '/', s: await load('ja') });
    expect(html).toContain('make install\nmake build');
    expect(html).toContain('data-copy');
    expect(html).toContain('入力内容の確認');
    expect(html).toContain('AI判定');
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
    for (const id of ['features', 'steps', 'fields', 'providers', 'privacy', 'install', 'faq']) {
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
});
