// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { loadGuides, GUIDE_SLUGS } from '../../site/lib/site.ts';

describe('real guide content', () => {
  it('loads all guides in both languages with matching structure', async () => {
    const guides = await loadGuides('site/content', '/');
    expect(guides).toHaveLength(GUIDE_SLUGS.length * 2);
  });

  it('keeps ja and en front matter order identical per guide', async () => {
    const guides = await loadGuides('site/content', '/');
    for (const slug of GUIDE_SLUGS) {
      const ja = guides.find((g) => g.lang === 'ja' && g.slug === slug)!;
      const en = guides.find((g) => g.lang === 'en' && g.slug === slug)!;
      expect(ja.order).toBe(en.order);
    }
  });

  it('uses only site-absolute links to other guides and they point at existing slugs', async () => {
    const guides = await loadGuides('site/content', '/');
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
    const guides = await loadGuides('site/content', '/');
    for (const g of guides) {
      expect(g.headings.filter((h) => h.level === 1)).toHaveLength(1);
      expect(g.headings.every((h) => h.text.trim() !== '')).toBe(true);
    }
  });
});
