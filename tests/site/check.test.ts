// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../../site/lib/build-site.ts';
import { checkSite } from '../../site/lib/check-site.ts';
import { SITE_DIR, writeFixtureContent } from './helpers.ts';

let tmp: string;
let out: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'site-check-'));
  out = join(tmp, 'out');
  await writeFixtureContent(join(tmp, 'content'), 'ja');
  await writeFixtureContent(join(tmp, 'content'), 'en');
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const build = (base = '/') => buildSite({ siteDir: SITE_DIR, contentDir: join(tmp, 'content'), outDir: out, base });

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

  describe('cross-page links', () => {
    const inject = async (page: string, href: string) => {
      const file = join(out, page, 'index.html');
      await writeFile(file, (await readFile(file, 'utf8')).replace('</main>', `<a href="${href}">x</a></main>`));
    };

    it('accepts a fragment that exists in the target page', async () => {
      await build('/JushoAI/');
      await inject('guides/privacy', '/JushoAI/en/guides/privacy/#a');
      expect(await checkSite(out, '/JushoAI/')).toEqual([]);
    });

    it('reports a fragment that is missing in the target page', async () => {
      await build();
      await inject('guides/privacy', '/guides/how-it-works/#nope');
      expect((await checkSite(out, '/')).map((p) => p.message)).toEqual([
        expect.stringMatching(/missing anchor target in guides\/how-it-works\/index\.html: #nope/),
      ]);
    });

    it('percent-decodes the path and the fragment', async () => {
      await build();
      await inject('guides/privacy', '/guides/%70rivacy/#%61');
      expect(await checkSite(out, '/')).toEqual([]);
    });
  });
});
