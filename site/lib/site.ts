import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontMatter } from './frontmatter.ts';
import { renderMarkdown, type Heading } from './markdown.ts';
import { validateGuidePair } from './validate-guides.ts';

export type Lang = 'ja' | 'en';
export const LANGS: readonly Lang[] = ['ja', 'en'];
export const SITE_ORIGIN = 'https://armaniacs.github.io';
// Store listings. The extension's own links carry utm_source=ext_sidebar;
// links from the site must not, or site traffic is counted as coming from the sidebar.
export const STORE_URL = 'https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl';
export const storeUrl = (lang: Lang) => `${STORE_URL}?hl=${lang}`;
export const EDGE_STORE_URL = 'https://microsoftedge.microsoft.com/addons/detail/jushoai/oobgmceceepjapoplehjkkbbpabbddhi';
export const edgeStoreUrl = (lang: Lang) => `${EDGE_STORE_URL}?hl=${lang}`;
// Firefox Add-ons (AMO). AMO picks the locale from the URL path (ja / en-US), not a query parameter.
export const AMO_STORE_URL = 'https://addons.mozilla.org/firefox/addon/jushoai/';
export const amoStoreUrl = (lang: Lang) => `https://addons.mozilla.org/${lang === 'en' ? 'en-US' : 'ja'}/firefox/addon/jushoai/`;
export const GUIDE_SLUGS = [
  'getting-started', 'profiles', 'addresses', 'popup-and-fill', 'shortcuts-and-tools', 'supported-fields',
  'ai-providers', 'safety', 'privacy', 'how-it-works', 'troubleshooting', 'license', 'glossary',
] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export const COPY_LABEL: Record<Lang, { copy: string; done: string }> = {
  ja: { copy: 'コピー', done: 'コピーしました' },
  en: { copy: 'Copy', done: 'Copied' },
};

export function normalizeBase(raw: string | undefined): string {
  let b = (raw ?? '/').trim() || '/';
  if (!b.startsWith('/')) b = `/${b}`;
  b = b.replace(/^\/+/, '/');
  if (!b.endsWith('/')) b += '/';
  return b;
}

export const pagePath = (lang: Lang, path: string) => (lang === 'en' ? `en/${path}` : path);
export const pageUrl = (base: string, lang: Lang, path: string) => base + pagePath(lang, path);

export interface Guide {
  lang: Lang;
  slug: GuideSlug;
  title: string;
  description: string;
  order: number;
  html: string;
  headings: Heading[];
  links: string[];
}

export async function loadGuides(contentDir: string, base: string): Promise<Guide[]> {
  const problems: string[] = [];
  const guides: Guide[] = [];

  for (const lang of LANGS) {
    let files: Set<string>;
    try {
      files = new Set(await readdir(join(contentDir, lang)));
    } catch {
      problems.push(`${lang}: content directory missing (${join(contentDir, lang)})`);
      continue;
    }
    for (const file of files) {
      if (!GUIDE_SLUGS.some((s) => `${s}.md` === file)) problems.push(`${lang}/${file}: unexpected file`);
    }
    for (const slug of GUIDE_SLUGS) {
      if (!files.has(`${slug}.md`)) {
        problems.push(`${lang}/${slug}.md: missing`);
        continue;
      }
      const { data, body } = parseFrontMatter(await readFile(join(contentDir, lang, `${slug}.md`), 'utf8'));
      // Existence checks (required/missing) live here; empty-content checks live in validateGuidePair.
      for (const key of ['title', 'description', 'order']) {
        if (data[key] === undefined || data[key] === null) problems.push(`${lang}/${slug}.md: front matter ${key} is required`);
      }
      const order = Number(data.order);
      if (data.order && !Number.isFinite(order)) problems.push(`${lang}/${slug}.md: order must be a number`);
      const r = renderMarkdown(body, { base, copyLabel: COPY_LABEL[lang].copy, copiedLabel: COPY_LABEL[lang].done, source: `${lang}/${slug}.md` });
      guides.push({
        lang, slug, title: data.title ?? '', description: data.description ?? '',
        order: Number.isFinite(order) ? order : 0, html: r.html, headings: r.headings, links: r.links,
      });
    }
  }

  for (const lang of LANGS) {
    const seen = new Map<number, string>();
    for (const g of guides.filter((x) => x.lang === lang)) {
      const prev = seen.get(g.order);
      if (prev) problems.push(`${lang}: duplicate order ${g.order} (${prev}, ${g.slug})`);
      else seen.set(g.order, g.slug);
    }
  }

  for (const slug of GUIDE_SLUGS) {
    const ja = guides.find((g) => g.lang === 'ja' && g.slug === slug);
    const en = guides.find((g) => g.lang === 'en' && g.slug === slug);
    // A missing file is already reported above; only paired guides are compared.
    if (ja && en) problems.push(...validateGuidePair(ja, en));
  }

  if (problems.length > 0) throw new Error(`guide content problems:\n${problems.join('\n')}`);
  return guides;
}
