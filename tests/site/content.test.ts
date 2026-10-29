// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import { loadGuides, GUIDE_SLUGS, type Guide } from '../../site/lib/site.ts';
import { extractBadgeLabels, normalizeGuideLink, validateGuidePair } from '../../site/lib/validate-guides.ts';
import { SITE_DIR } from './helpers.ts';

const CONTENT = join(SITE_DIR, 'content');

let guides: Guide[] = [];
beforeAll(async () => {
  guides = await loadGuides(CONTENT, '/');
});

const pair = (slug: string) =>
  [guides.find((g) => g.lang === 'ja' && g.slug === slug), guides.find((g) => g.lang === 'en' && g.slug === slug)] as const;

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

  it('uses normalized links that point at existing slugs with the right language prefix', () => {
    for (const g of guides) {
      for (const href of g.links) {
        const m = /^\/guides\/([a-z-]+)\/(?:#.*)?$/.exec(normalizeGuideLink(href));
        if (!m) continue;
        expect(GUIDE_SLUGS as readonly string[], href).toContain(m[1]);
        expect(href.startsWith('/en/'), href).toBe(g.lang === 'en');
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
