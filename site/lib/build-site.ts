import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { renderFeedbackFooter } from './feedback.ts';
import { renderGuidesIndex } from './guides-index.ts';
import { renderLanding, type Strings } from './landing.ts';
import { renderPage } from './layout.ts';
import { diffShape, findEmptyStrings, LANGS, loadGuides, pagePath, pageUrl, SITE_ORIGIN, type Lang } from './site.ts';

export interface BuildOptions {
  siteDir: string;
  contentDir?: string;
  outDir: string;
  base: string;
}

export async function loadStrings(i18nDir: string): Promise<Record<Lang, Strings>> {
  const read = async (lang: Lang) => JSON.parse(await readFile(join(i18nDir, `${lang}.json`), 'utf8')) as Strings;
  const ja = await read('ja');
  const en = await read('en');
  const problems = [
    ...diffShape(ja, en),
    ...findEmptyStrings(ja).map((p) => `ja ${p}: empty`),
    ...findEmptyStrings(en).map((p) => `en ${p}: empty`),
  ];
  if (problems.length > 0) throw new Error(`i18n problems:\n${problems.join('\n')}`);
  return { ja, en };
}

async function writePage(outDir: string, dir: string, html: string): Promise<string> {
  const file = join(outDir, dir, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  return file;
}

const isInside = (child: string, parent: string) => {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && resolve(parent, rel) === child);
};

// outDir is wiped before every build, so it must never overlap the sources.
function assertSafeOutDir(outDir: string, siteDir: string, contentDir: string): void {
  if (outDir.trim() === '') throw new Error('unsafe output directory: empty path');
  const out = resolve(outDir);
  if (out === dirname(out)) throw new Error(`unsafe output directory: filesystem root (${out})`);
  for (const src of [resolve(siteDir), resolve(contentDir)]) {
    if (isInside(out, src) || isInside(src, out)) {
      throw new Error(`unsafe output directory: ${out} overlaps ${src}`);
    }
  }
}

export async function buildSite(o: BuildOptions): Promise<string[]> {
  const contentDir = o.contentDir ?? join(o.siteDir, 'content');
  assertSafeOutDir(o.outDir, o.siteDir, contentDir);
  const strings = await loadStrings(join(o.siteDir, 'i18n'));
  const guides = await loadGuides(contentDir, o.base);

  await rm(o.outDir, { recursive: true, force: true });
  await mkdir(o.outDir, { recursive: true });
  await cp(join(o.siteDir, 'assets'), join(o.outDir, 'assets'), { recursive: true });
  // GitHub Pages would otherwise run Jekyll over the output.
  await writeFile(join(o.outDir, '.nojekyll'), '');

  const written: string[] = [];
  for (const lang of LANGS) {
    const s = strings[lang];
    const common = { lang, base: o.base, chrome: s.chrome };
    written.push(
      await writePage(o.outDir, pagePath(lang, ''), renderPage({
        ...common, path: '', title: s.meta.title, description: s.meta.description,
        body: renderLanding({ lang, base: o.base, s }), hasCode: true,
      })),
      await writePage(o.outDir, pagePath(lang, 'guides/'), renderPage({
        ...common, path: 'guides/', title: `${s.guides.title} — JushoAI`, description: s.guides.lead,
        body: renderGuidesIndex({ lang, base: o.base, s, guides }),
      })),
    );
    for (const g of guides.filter((x) => x.lang === lang)) {
      written.push(
        await writePage(o.outDir, pagePath(lang, `guides/${g.slug}/`), renderPage({
          ...common, path: `guides/${g.slug}/`, title: `${g.title} — JushoAI`, description: g.description,
          body: `<article class="prose">\n${g.html}${renderFeedbackFooter(s.feedback)}\n</article>`, hasCode: g.html.includes('data-copy'),
        })),
      );
    }
  }

  const notFound: Record<Lang, { title: string; body: string; home: string }> = {
    ja: { title: '404 — JushoAI', body: 'ページが見つかりません。', home: 'ホームへ戻る' },
    en: { title: '404 — JushoAI', body: 'Page not found.', home: 'Back to home' },
  };
  for (const lang of LANGS) {
    const n = notFound[lang];
    await writeFile(
      join(o.outDir, lang === 'en' ? 'en/404.html' : '404.html'),
      renderPage({
        lang, base: o.base, path: '', chrome: strings[lang].chrome, title: n.title, description: n.body,
        body: `<div class="prose"><h1>404</h1><p>${n.body}</p><p><a href="${pageUrl(o.base, lang, '')}">${n.home}</a></p></div>`,
      }),
    );
  }

  const urls = written.map((f) => {
    const dir = relative(o.outDir, dirname(f)).split(sep).join('/');
    return `${SITE_ORIGIN}${o.base}${dir === '' ? '' : `${dir}/`}`;
  });
  await writeFile(
    join(o.outDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
  await writeFile(join(o.outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}${o.base}sitemap.xml\n`);
  return written;
}
