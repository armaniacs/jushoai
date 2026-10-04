// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadGuides, GUIDE_SLUGS } from '../../site/lib/site.ts';
import { SITE_DIR } from './helpers.ts';

const CONTENT = join(SITE_DIR, 'content');

describe('real guide content', () => {
  it('loads all guides in both languages with matching structure', async () => {
    const guides = await loadGuides(CONTENT, '/');
    expect(guides).toHaveLength(GUIDE_SLUGS.length * 2);
  });

  it('keeps ja and en front matter order identical per guide', async () => {
    const guides = await loadGuides(CONTENT, '/');
    for (const slug of GUIDE_SLUGS) {
      const ja = guides.find((g) => g.lang === 'ja' && g.slug === slug)!;
      const en = guides.find((g) => g.lang === 'en' && g.slug === slug)!;
      expect(ja.order).toBe(en.order);
    }
  });

  it('uses only site-absolute links to other guides and they point at existing slugs', async () => {
    const guides = await loadGuides(CONTENT, '/');
    for (const g of guides) {
      for (const href of g.links) {
        const m = /^(?:\/en)?\/guides\/([a-z-]+)\/(?:#.*)?$/.exec(href);
        if (!m) continue;
        expect(GUIDE_SLUGS as readonly string[]).toContain(m[1]);
        expect(href.startsWith('/en/')).toBe(g.lang === 'en');
      }
    }
  });

  it('has exactly one h1 per guide and no empty headings', async () => {
    const guides = await loadGuides(CONTENT, '/');
    for (const g of guides) {
      expect(g.headings.filter((h) => h.level === 1)).toHaveLength(1);
      expect(g.headings.every((h) => h.text.trim() !== '')).toBe(true);
    }
  });

  it('has the same number of h2 sections in ja and en per guide', async () => {
    const guides = await loadGuides(CONTENT, '/');
    const h2 = (lang: string, slug: string) =>
      guides.find((g) => g.lang === lang && g.slug === slug)!.headings.filter((h) => h.level === 2).length;
    for (const slug of GUIDE_SLUGS) expect(h2('ja', slug), slug).toBe(h2('en', slug));
  });

  it('uses unique order values per language', async () => {
    const guides = await loadGuides(CONTENT, '/');
    for (const lang of ['ja', 'en']) {
      const orders = guides.filter((g) => g.lang === lang).map((g) => g.order);
      expect(new Set(orders).size, lang).toBe(orders.length);
    }
  });

  it('lists the same badge labels in the ja and en troubleshooting tables', async () => {
    const firstColumn = async (lang: string) => {
      const md = await readFile(join(CONTENT, lang, 'troubleshooting.md'), 'utf8');
      return md.split('\n').filter((l) => l.startsWith('|')).slice(2).map((l) => l.split('|')[1]!.trim());
    };
    const ja = (await firstColumn('ja')).flatMap((c) => c.split(' / ').map((s) => s.trim()));
    const en = (await firstColumn('en')).flatMap((c) => [...c.matchAll(/`([^`]+)`/g)].map((m) => m[1]!));
    expect(ja.length).toBeGreaterThan(0);
    expect(new Set(en)).toEqual(new Set(ja));
  });
});
