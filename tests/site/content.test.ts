// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { renderMarkdown } from '../../site/lib/markdown.ts';
import { loadGuides, GUIDE_SLUGS, type Guide } from '../../site/lib/site.ts';
import { extractBadgeLabels, validateGuidePair } from '../../site/lib/validate-guides.ts';
import { SITE_DIR } from './helpers.ts';

const ROOT = resolve(SITE_DIR, '..');
const CONTENT = join(SITE_DIR, 'content');

let guides: Guide[] = [];
beforeAll(async () => {
  guides = await loadGuides(CONTENT, '/');
});

const pair = (slug: string) =>
  [guides.find((g) => g.lang === 'ja' && g.slug === slug), guides.find((g) => g.lang === 'en' && g.slug === slug)] as const;

const extractLinks = (src: string) =>
  renderMarkdown(src, {
    base: '/',
    copyLabel: 'copy',
    copiedLabel: 'copied',
    copyFailLabel: 'failed',
    tableLabel: 'table',
    codeLabel: 'code',
  }).links;

const fileExists = (path: string) => stat(path).then((s) => s.isFile(), () => false);

describe('real guide content', () => {
  it('loads all guides in both languages', () => {
    expect(guides).toHaveLength(GUIDE_SLUGS.length * 2);
  });

  it('has no ja/en parity problems', () => {
    for (const slug of GUIDE_SLUGS) {
      const [ja, en] = pair(slug);
      expect(validateGuidePair(ja, en), slug).toEqual([]);
    }
  });

  it('uses relative ./<slug>.md links for every inter-guide reference', () => {
    for (const g of guides) {
      for (const href of g.links) {
        if (/^(?:https?:\/\/|mailto:|#)/i.test(href)) continue;
        expect(href, `${g.lang}/${g.slug}.md: inter-guide links must not use /guides/: ${href}`).not.toMatch(/^(?:\/en)?\/guides\//);
        const m = /^\.\/([a-z-]+)\.md(?:#.*)?$/.exec(href);
        expect(m, `${g.lang}/${g.slug}.md: expected relative ./<slug>.md link, got ${href}`).not.toBeNull();
        expect(GUIDE_SLUGS as readonly string[], `${g.lang}/${g.slug}.md: unknown slug in ${href}`).toContain(m![1]);
      }
    }
  });

  it('lists the same badge labels in the ja and en troubleshooting tables', () => {
    const [ja, en] = pair('troubleshooting');
    const jb = extractBadgeLabels(ja!.html);
    const eb = extractBadgeLabels(en!.html);
    expect(jb.length).toBeGreaterThan(0);
    expect(new Set(jb)).toEqual(new Set(eb));
  });

  it('has exactly one h1 per guide and no empty headings', () => {
    for (const g of guides) {
      expect(g.headings.filter((h) => h.level === 1), g.slug).toHaveLength(1);
      expect(g.headings.every((h) => h.text.trim() !== ''), g.slug).toBe(true);
    }
  });
});

describe('markdown entrypoints', () => {
  const entrypoints = ['README.md', 'README.en.md', 'docs/user-guide.md', 'docs/user-guide.en.md'] as const;

  it.each(entrypoints)('resolves every local relative link in %s to an existing file', async (relPath) => {
    const absPath = resolve(ROOT, relPath);
    const links = extractLinks(await readFile(absPath, 'utf8'));
    for (const href of links) {
      if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) continue;
      expect(href.startsWith('/'), `${relPath}: root-relative link is not portable on GitHub: ${href}`).toBe(false);
      const pathOnly = href.split('#')[0] ?? '';
      expect(pathOnly, `${relPath}: empty path in ${href}`).not.toBe('');
      const target = resolve(dirname(absPath), pathOnly);
      expect(await fileExists(target), `${relPath}: broken relative link ${href} -> ${target}`).toBe(true);
    }
  });

  it.each([
    ['ja', 'docs/user-guide.md'],
    ['en', 'docs/user-guide.en.md'],
  ] as const)('links all 14 %s guides from %s', async (lang, relPath) => {
    const absPath = resolve(ROOT, relPath);
    const links = extractLinks(await readFile(absPath, 'utf8'));
    const prefix = `../site/content/${lang}/`;
    const linkedSlugs = new Set<string>();
    for (const href of links) {
      const pathOnly = href.split('#')[0] ?? '';
      if (!pathOnly.startsWith(prefix) || !pathOnly.endsWith('.md')) continue;
      const slug = pathOnly.slice(prefix.length, -'.md'.length);
      linkedSlugs.add(slug);
    }
    for (const slug of GUIDE_SLUGS) {
      expect(linkedSlugs.has(slug), `${relPath}: missing link to ${prefix}${slug}.md`).toBe(true);
    }
  });
});
