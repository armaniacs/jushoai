// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderPage, type Chrome } from '../../site/lib/layout.ts';

const chrome: Chrome = {
  nav: { home: 'ホーム', guides: 'ガイド', install: 'インストール', feedback: '要望を送る', langName: 'English', skip: '本文へ', label: 'サイトナビゲーション' },
  footer: { tagline: 'tag', guides: 'ガイド', privacy: 'プライバシー', license: 'ライセンス', feedback: '要望を送る', source: 'ソース' },
};

const page = (over: Partial<Parameters<typeof renderPage>[0]> = {}) =>
  renderPage({
    lang: 'ja', base: '/', path: 'guides/privacy/', title: 'T', description: 'D', body: '<h1>x</h1>', chrome, ...over,
  });

describe('renderPage', () => {
  it('sets lang, title, description and a skip link to main', () => {
    const html = page();
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('<title>T</title>');
    expect(html).toContain('<meta name="description" content="D">');
    expect(html).toContain('<a class="skip" href="#main">本文へ</a>');
    expect(html).toContain('<main id="main">');
  });

  it('escapes the title and description', () => {
    const html = page({ title: 'a<b>&"', description: '"x"' });
    expect(html).toContain('<title>a&lt;b&gt;&amp;&quot;</title>');
    expect(html).toContain('content="&quot;x&quot;"');
  });

  it('declares hreflang alternates for both languages and x-default', () => {
    const html = page();
    expect(html).toContain('<link rel="alternate" hreflang="ja" href="/guides/privacy/">');
    expect(html).toContain('<link rel="alternate" hreflang="en" href="/en/guides/privacy/">');
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="/guides/privacy/">');
  });

  it('links the language switch to the other language and applies the base to assets', () => {
    const ja = page({ base: '/JushoAI/' });
    expect(ja).toContain('href="/JushoAI/en/guides/privacy/" hreflang="en" lang="en"');
    expect(ja).toContain('href="/JushoAI/assets/site.css"');
    expect(ja).toContain('src="/JushoAI/assets/logo.png"');
    const en = page({ lang: 'en', base: '/JushoAI/', chrome: { ...chrome, nav: { ...chrome.nav, langName: '日本語' } } });
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('href="/JushoAI/guides/privacy/" hreflang="ja" lang="ja"');
  });

  it('points the logo and home link at the language root', () => {
    expect(page({ lang: 'en' })).toContain('<a class="logo" href="/en/">');
    expect(page()).toContain('<a class="logo" href="/">');
  });

  it('includes the copy script only when the page has code blocks', () => {
    expect(page()).not.toContain('copy.js');
    expect(page({ hasCode: true })).toContain('<script src="/assets/copy.js" defer></script>');
  });

  it('includes the facade script only when the page has a video', () => {
    expect(page()).not.toContain('facade.js');
    expect(page({ hasVideo: true })).toContain('<script src="/assets/facade.js" defer></script>');
  });

  it('escapes chrome strings and the base in attributes', () => {
    const html = page({
      base: '/a"b/',
      chrome: { ...chrome, nav: { ...chrome.nav, home: '<b>h</b>', label: '<b>l</b>' }, footer: { ...chrome.footer, tagline: '<i>t</i>' } },
    });
    expect(html).toContain('&lt;b&gt;h&lt;/b&gt;');
    expect(html).toContain('aria-label="&lt;b&gt;l&lt;/b&gt;"');
    expect(html).toContain('&lt;i&gt;t&lt;/i&gt;');
    expect(html).not.toContain('<b>h');
    expect(html).toContain('href="/a&quot;b/assets/site.css"');
    expect(html).not.toContain('/a"b/');
  });

  it('labels the nav landmark from the dictionary', () => {
    expect(page()).toContain('<nav aria-label="サイトナビゲーション">');
    const en = page({ lang: 'en', chrome: { ...chrome, nav: { ...chrome.nav, label: 'Site navigation' } } });
    expect(en).toContain('<nav aria-label="Site navigation">');
  });

  it('marks only the current nav link with aria-current="page"', () => {
    const landing = page({ path: '' });
    expect(landing).toContain('<a href="/" aria-current="page">ホーム</a>');
    expect(landing).not.toContain('<a href="/guides/" aria-current="page">');
    const index = page({ path: 'guides/' });
    expect(index).toContain('<a href="/guides/" aria-current="page">ガイド</a>');
    expect(index).not.toContain('<a href="/" aria-current="page">');
    const article = page({ path: 'guides/privacy/' });
    expect(article).toContain('<a href="/guides/" aria-current="page">ガイド</a>');
    expect(article).not.toContain('<a href="/" aria-current="page">');
  });

  it('marks no nav link as current when opted out (404 reuses the landing path)', () => {
    expect(page({ path: '', noCurrent: true })).not.toContain('aria-current="page"');
  });

  it('gives the logo an empty alt because the brand name is next to it', () => {
    expect(page()).toMatch(/<img src="\/assets\/logo\.png" alt="" width="28" height="28">/);
  });

  it('links one-click issue creation from the nav and the footer, and the license page', () => {
    const html = page();
    const url = 'https://github.com/armaniacs/jushoai/issues/new?template=feature-request.yml';
    expect(html.split(url).length - 1).toBe(2);
    expect(html).toContain('href="/guides/license/"');
  });

  it('declares Open Graph metadata with absolute URLs', () => {
    const html = page({ base: '/jushoai/' });
    expect(html).toContain('<meta property="og:title" content="T">');
    expect(html).toContain('<meta property="og:url" content="https://armaniacs.github.io/jushoai/guides/privacy/">');
    expect(html).toContain('content="https://armaniacs.github.io/jushoai/assets/logo.png"');
  });
});
