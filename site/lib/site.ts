import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontMatter } from './frontmatter.ts';
import { renderMarkdown, type Heading } from './markdown.ts';

export type Lang = 'ja' | 'en';
export const LANGS: readonly Lang[] = ['ja', 'en'];
export const SITE_ORIGIN = 'https://armaniacs.github.io';
export const GUIDE_SLUGS = [
  'getting-started', 'profiles', 'addresses', 'popup-and-fill', 'supported-fields',
  'ai-providers', 'privacy', 'how-it-works', 'troubleshooting', 'license',
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

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Compares the shape (keys, array lengths, value types) of the ja and en dictionaries.
export function diffShape(ja: unknown, en: unknown, path = ''): string[] {
  if (Array.isArray(ja) || Array.isArray(en)) {
    if (!Array.isArray(ja) || !Array.isArray(en)) return [`${path}: type`];
    const out = ja.length !== en.length ? [`${path}: length ${ja.length} vs ${en.length}`] : [];
    for (let i = 0; i < Math.min(ja.length, en.length); i++) out.push(...diffShape(ja[i], en[i], `${path}[${i}]`));
    return out;
  }
  if (ja === null || en === null) return ja === en ? [] : [`${path}: type`];
  if (isObject(ja) && isObject(en)) {
    const keys = new Set([...Object.keys(ja), ...Object.keys(en)]);
    return [...keys].flatMap((k) => {
      const p = path ? `${path}.${k}` : k;
      if (k in ja && k in en) return diffShape(ja[k], en[k], p);
      return [`${p}: missing in ${k in ja ? 'en' : 'ja'}`];
    });
  }
  return typeof ja === typeof en ? [] : [`${path}: type`];
}

export function findEmptyStrings(v: unknown, path = ''): string[] {
  if (typeof v === 'string') return v.trim() === '' ? [path] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => findEmptyStrings(x, `${path}[${i}]`));
  if (isObject(v)) return Object.entries(v).flatMap(([k, x]) => findEmptyStrings(x, path ? `${path}.${k}` : k));
  return [];
}

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
      for (const key of ['title', 'description', 'order']) {
        if (!data[key]) problems.push(`${lang}/${slug}.md: front matter ${key} is required`);
      }
      const order = Number(data.order);
      if (data.order && !Number.isFinite(order)) problems.push(`${lang}/${slug}.md: order must be a number`);
      const r = renderMarkdown(body, { base, copyLabel: COPY_LABEL[lang].copy, copiedLabel: COPY_LABEL[lang].done });
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
    const counts = LANGS.map((l) => guides.find((g) => g.lang === l && g.slug === slug)?.headings.filter((h) => h.level === 2).length);
    if (counts.every((c) => c !== undefined) && counts[0] !== counts[1]) {
      problems.push(`${slug}: h2 section count differs (ja ${counts[0]} vs en ${counts[1]})`);
    }
  }

  if (problems.length > 0) throw new Error(`guide content problems:\n${problems.join('\n')}`);
  return guides;
}
