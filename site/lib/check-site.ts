import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { ISSUE_TEMPLATES, issueUrl } from './feedback.ts';

export interface Problem {
  file: string;
  message: string;
}

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const pageIds = (html: string) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

const exists = (p: string) => stat(p).then((s) => s.isFile(), () => false);

// templatesDir is optional so unit tests can check a built tree without the repository layout.
export async function checkSite(outDir: string, base: string, templatesDir?: string): Promise<Problem[]> {
  const problems: Problem[] = [];
  if (templatesDir) {
    for (const t of ISSUE_TEMPLATES) {
      if (!(await exists(join(templatesDir, `${t}.yml`)))) problems.push({ file: templatesDir, message: `missing issue template: ${t}.yml` });
    }
  }
  for (const f of ['sitemap.xml', 'robots.txt', '404.html', 'en/404.html']) {
    if (!(await exists(join(outDir, f)))) problems.push({ file: f, message: 'missing file' });
  }
  const idCache = new Map<string, Set<string | undefined>>();
  for (const file of await htmlFiles(outDir)) {
    const rel = relative(outDir, file);
    const html = await readFile(file, 'utf8');
    const add = (message: string) => problems.push({ file: rel, message });

    if (!/<html lang="[a-z-]+"/.test(html)) add('missing lang attribute on <html>');
    if (!/<title>[^<]+<\/title>/.test(html)) add('missing or empty <title>');
    if (!/<meta name="description" content="[^"]+">/.test(html)) add('missing or empty meta description');
    if (!/<meta property="og:title" content="[^"]+">/.test(html)) add('missing og:title');
    if (!html.includes(issueUrl('feature-request'))) add('missing one-click issue link');
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 !== 1) add(`expected exactly one h1, found ${h1}`);
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      if (!/\balt="/.test(img)) add(`img without alt: ${img}`);
    }

    const ids = pageIds(html);
    for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      const href = (m[1] ?? '').replace(/&amp;/g, '&');
      if (/^(https?:|mailto:|tel:|data:)/.test(href) || href === '') continue;
      if (href.startsWith('#')) {
        if (!ids.has(href.slice(1))) add(`missing anchor target: ${href}`);
        continue;
      }
      if (!href.startsWith(base)) {
        add(`link outside the base path: ${href}`);
        continue;
      }
      const rest = href.slice(base.length);
      const path = decode(rest.split(/[?#]/)[0] ?? '');
      const target = path === '' || path.endsWith('/') ? join(outDir, path, 'index.html') : join(outDir, path);
      if (!(await exists(target))) {
        add(`broken link: ${href}`);
        continue;
      }
      const hashAt = rest.indexOf('#');
      if (hashAt === -1 || !target.endsWith('.html')) continue;
      const fragment = decode(rest.slice(hashAt + 1));
      if (fragment === '') continue;
      if (!idCache.has(target)) idCache.set(target, pageIds(await readFile(target, 'utf8')));
      if (!idCache.get(target)!.has(fragment)) {
        add(`missing anchor target in ${relative(outDir, target)}: #${fragment}`);
      }
    }
  }
  return problems;
}
