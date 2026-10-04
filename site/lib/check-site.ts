import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

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

const exists = (p: string) => stat(p).then((s) => s.isFile(), () => false);

export async function checkSite(outDir: string, base: string): Promise<Problem[]> {
  const problems: Problem[] = [];
  for (const file of await htmlFiles(outDir)) {
    const rel = relative(outDir, file);
    const html = await readFile(file, 'utf8');
    const add = (message: string) => problems.push({ file: rel, message });

    if (!/<html lang="[a-z-]+"/.test(html)) add('missing lang attribute on <html>');
    if (!/<title>[^<]+<\/title>/.test(html)) add('missing or empty <title>');
    if (!/<meta name="description" content="[^"]+">/.test(html)) add('missing or empty meta description');
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 !== 1) add(`expected exactly one h1, found ${h1}`);
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      if (!/\balt="/.test(img)) add(`img without alt: ${img}`);
    }

    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
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
      const path = href.slice(base.length).split(/[?#]/)[0] ?? '';
      const target = path === '' || path.endsWith('/') ? join(outDir, path, 'index.html') : join(outDir, path);
      if (!(await exists(target))) add(`broken link: ${href}`);
    }
  }
  return problems;
}
