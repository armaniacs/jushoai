// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../../site/lib/build-site.ts';
import { checkSite } from '../../site/lib/check-site.ts';
import { GUIDE_SLUGS } from '../../site/lib/site.ts';

let tmp: string;
let out: string;

const fixture = async (lang: 'ja' | 'en') => {
  await mkdir(join(tmp, 'content', lang), { recursive: true });
  for (const [i, slug] of GUIDE_SLUGS.entries()) {
    await writeFile(
      join(tmp, 'content', lang, `${slug}.md`),
      `---\ntitle: ${slug}\ndescription: d\norder: ${i + 1}\n---\n# ${slug}\n\n## A\n\n[x](/guides/privacy/) [y](#a)\n\n## B\n\ntext\n`,
    );
  }
};

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'site-check-'));
  out = join(tmp, 'out');
  await fixture('ja');
  await fixture('en');
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const build = (base = '/') => buildSite({ siteDir: 'site', contentDir: join(tmp, 'content'), outDir: out, base });

describe('checkSite', () => {
  it('finds no problems in a clean build (root and sub-path bases)', async () => {
    await build('/');
    expect(await checkSite(out, '/')).toEqual([]);
    await build('/JushoAI/');
    expect(await checkSite(out, '/JushoAI/')).toEqual([]);
  });

  it('reports a broken internal link', async () => {
    await build();
    const file = join(out, 'guides', 'privacy', 'index.html');
    await writeFile(file, (await readFile(file, 'utf8')).replace('</main>', '<a href="/guides/nope/">x</a></main>'));
    const problems = await checkSite(out, '/');
    expect(problems.map((p) => p.message)).toEqual([expect.stringContaining('/guides/nope/')]);
  });

  it('reports a missing anchor target', async () => {
    await build();
    const file = join(out, 'index.html');
    await writeFile(file, (await readFile(file, 'utf8')).replace('</main>', '<a href="#missing">x</a></main>'));
    expect((await checkSite(out, '/')).map((p) => p.message)).toEqual([expect.stringContaining('#missing')]);
  });

  it('reports a missing title, description, lang, h1 and img alt', async () => {
    await build();
    await mkdir(join(out, 'bad'), { recursive: true });
    await writeFile(join(out, 'bad', 'index.html'), '<!doctype html><html><head></head><body><h1>a</h1><h1>b</h1><img src="/assets/logo.png"></body></html>');
    const messages = (await checkSite(out, '/')).map((p) => p.message).join('\n');
    for (const needle of ['lang', 'title', 'description', 'h1', 'alt']) expect(messages).toContain(needle);
  });

  it('ignores external links and mailto links', async () => {
    await build();
    const file = join(out, 'index.html');
    await writeFile(file, (await readFile(file, 'utf8')).replace('</main>', '<a href="https://example.com/x">x</a><a href="mailto:a@b.c">m</a></main>'));
    expect(await checkSite(out, '/')).toEqual([]);
  });
});
