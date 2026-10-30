// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  extractBadgeLabels, normalizeGuideLink, validateGuidePair, validateStrings, type PairGuide,
} from '../../site/lib/validate-guides.ts';

const guide = (lang: 'ja' | 'en', over: Partial<PairGuide> = {}): PairGuide => ({
  slug: 'privacy',
  order: 3,
  title: `title ${lang}`,
  description: `desc ${lang}`,
  headings: [
    { level: 1, text: `title ${lang}`, id: `title-${lang}` },
    { level: 2, text: 'A', id: 'a' },
    { level: 2, text: 'B', id: 'b' },
  ],
  links: lang === 'ja'
    ? ['/guides/safety/', 'https://example.com/x?hl=ja']
    : ['/en/guides/safety/', 'https://example.com/x?hl=en'],
  html: '<article></article>',
  ...over,
});

const badgeTable = (header: string, cells: string[]) =>
  `<table><thead><tr><th>${header}</th><th>State</th></tr></thead>` +
  `<tbody>${cells.map((c) => `<tr><td>${c}</td><td>s</td></tr>`).join('')}</tbody></table>`;

describe('validateGuidePair', () => {
  it('passes a matching pair with language-dependent link prefixes', () => {
    expect(validateGuidePair(guide('ja'), guide('en'))).toEqual([]);
  });

  it('detects guide order drift', () => {
    expect(validateGuidePair(guide('ja'), guide('en', { order: 4 }))).toEqual([
      'privacy: order differs (ja 3 vs en 4)',
    ]);
  });

  it('detects an empty title', () => {
    expect(validateGuidePair(guide('ja', { title: '  ' }), guide('en'))).toEqual([
      'ja/privacy.md: title is empty',
    ]);
  });

  it('detects h2 count drift', () => {
    const en = guide('en', { headings: [{ level: 1, text: 't', id: 't' }, { level: 2, text: 'A', id: 'a' }] });
    expect(validateGuidePair(guide('ja'), en)).toEqual([
      'privacy: h2 section count differs (ja 2 vs en 1)',
    ]);
  });

  it('detects badge label drift in the badge table', () => {
    const ja = guide('ja', { html: badgeTable('バッジ', ['AI: オフ', 'AI 有効']) });
    const en = guide('en', { html: badgeTable('Badge', ['<code>AI: オフ</code> (AI off)', '<code>AI 無効</code> (AI disabled)']) });
    expect(validateGuidePair(ja, en)).toEqual([
      'privacy: badge labels differ (ja-only: AI 有効; en-only: AI 無効)',
    ]);
  });

  it('detects link drift in normalized form', () => {
    const en = guide('en', { links: ['/en/guides/safety/', '/en/guides/nope/', 'https://example.com/x?hl=en'] });
    expect(validateGuidePair(guide('ja'), en)).toEqual([
      'privacy: links differ (ja-only: —; en-only: /guides/nope/)',
    ]);
  });

  it('reports a missing side', () => {
    expect(validateGuidePair(undefined, guide('en'))).toEqual(['privacy: missing in ja']);
  });
});

describe('normalizeGuideLink', () => {
  it('unifies language-dependent link forms', () => {
    expect(normalizeGuideLink('/en/guides/safety/')).toBe('/guides/safety/');
    expect(normalizeGuideLink('/en')).toBe('/');
    expect(normalizeGuideLink('https://x.test/a?hl=ja')).toBe('https://x.test/a');
    expect(normalizeGuideLink('https://x.test/a?hl=en')).toBe('https://x.test/a');
    expect(normalizeGuideLink('https://addons.mozilla.org/ja/firefox/addon/jushoai/')).toBe(
      'https://addons.mozilla.org/firefox/addon/jushoai/',
    );
    expect(normalizeGuideLink('https://addons.mozilla.org/en-US/firefox/addon/jushoai/')).toBe(
      'https://addons.mozilla.org/firefox/addon/jushoai/',
    );
    expect(normalizeGuideLink('/guides/safety/#frag')).toBe('/guides/safety/#frag');
  });
});

describe('extractBadgeLabels', () => {
  it('reads ja slash-joined cells and en code cells as the same set', () => {
    const ja = badgeTable('バッジ', ['AI: オフ', 'AI: OpenAI 互換 / AI: Gemini']);
    const en = badgeTable('Badge', ['<code>AI: オフ</code> (AI off)', '<code>AI: OpenAI 互換</code> / <code>AI: Gemini</code>']);
    expect(new Set(extractBadgeLabels(ja))).toEqual(new Set(extractBadgeLabels(en)));
    expect(extractBadgeLabels(ja)).toEqual(['AI: オフ', 'AI: OpenAI 互換', 'AI: Gemini']);
  });

  it('ignores tables without the badge header', () => {
    expect(extractBadgeLabels(badgeTable('分類', ['氏名 / 名称']))).toEqual([]);
  });
});

describe('validateStrings', () => {
  it('bundles shape and empty-string problems', () => {
    expect(validateStrings({ a: 'x', b: ['y', ''] }, { a: 'x', b: ['y'] })).toEqual([
      'b: length 2 vs 1',
      'ja b[1]: empty',
    ]);
    expect(validateStrings({ a: 'x' }, { a: 'x' })).toEqual([]);
  });
});
