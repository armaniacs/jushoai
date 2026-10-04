// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildSite } from '../../site/lib/build-site.ts';
import { GUIDE_SLUGS } from '../../site/lib/site.ts';
import { SITE_DIR, writeFixtureContent } from './helpers.ts';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'site-build-'));
  await writeFixtureContent(join(tmp, 'content'), 'ja');
  await writeFixtureContent(join(tmp, 'content'), 'en');
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const run = (base = '/') =>
  buildSite({ siteDir: SITE_DIR, contentDir: join(tmp, 'content'), outDir: join(tmp, 'out'), base });
const exists = (p: string) => stat(join(tmp, 'out', p)).then(() => true, () => false);

describe('buildSite', () => {
  it('writes the landing, guide index and every guide for both languages', async () => {
    const files = await run();
    expect(files).toHaveLength(2 * (1 + 1 + GUIDE_SLUGS.length));
    for (const path of ['index.html', 'en/index.html', 'guides/index.html', 'en/guides/index.html']) {
      expect(await exists(path)).toBe(true);
    }
    for (const slug of GUIDE_SLUGS) {
      expect(await exists(`guides/${slug}/index.html`)).toBe(true);
      expect(await exists(`en/guides/${slug}/index.html`)).toBe(true);
    }
  });

  it('copies assets, adds .nojekyll and a 404 page', async () => {
    await run();
    expect(await exists('assets/site.css')).toBe(true);
    expect(await exists('assets/logo.png')).toBe(true);
    expect(await exists('.nojekyll')).toBe(true);
    expect(await exists('404.html')).toBe(true);
  });

  it('applies the base path to links and assets', async () => {
    await run('/JushoAI/');
    const html = await readFile(join(tmp, 'out', 'guides', 'privacy', 'index.html'), 'utf8');
    expect(html).toContain('href="/JushoAI/assets/site.css"');
    expect(html).toContain('href="/JushoAI/en/guides/privacy/"');
    expect(html).toContain('<h1 id="privacy-ja">privacy ja</h1>');
  });

  it('uses the guide title and description for the page head', async () => {
    await run();
    const html = await readFile(join(tmp, 'out', 'en', 'guides', 'privacy', 'index.html'), 'utf8');
    expect(html).toContain('<title>privacy en — JushoAI</title>');
    expect(html).toContain('<meta name="description" content="description privacy">');
    expect(html).toContain('<script src="/assets/copy.js" defer></script>');
  });

  it('replaces a previous build', async () => {
    await run();
    await writeFile(join(tmp, 'out', 'stale.txt'), 'x');
    await run();
    expect(await exists('stale.txt')).toBe(false);
  });

  it('fails when guide content is incomplete', async () => {
    await rm(join(tmp, 'content', 'en', 'privacy.md'));
    await expect(run()).rejects.toThrow(/en\/privacy\.md.*missing/);
  });

  describe('unsafe output directories', () => {
    // Runs against a throwaway copy so a regression cannot delete the real site sources.
    let siteCopy: string;
    beforeEach(async () => {
      siteCopy = join(tmp, 'site');
      await cp(SITE_DIR, siteCopy, { recursive: true });
    });
    const attempt = (outDir: string, siteDir = siteCopy) =>
      buildSite({ siteDir, contentDir: join(tmp, 'content'), outDir, base: '/' });
    const stillThere = (p: string) => stat(p).then(() => true, () => false);

    it.each([
      ['the site directory', () => siteCopy],
      ['the parent of the site directory', () => tmp],
      ['a directory inside the site directory', () => join(siteCopy, 'assets', 'out')],
    ])('refuses %s without deleting anything', async (_name, outDir) => {
      await expect(attempt(outDir())).rejects.toThrow(/output directory/);
      expect(await stillThere(join(siteCopy, 'assets', 'site.css'))).toBe(true);
      expect(await stillThere(join(tmp, 'content', 'ja', 'privacy.md'))).toBe(true);
    });

    it('refuses the content directory and a directory inside it', async () => {
      await expect(attempt(join(tmp, 'content'))).rejects.toThrow(/output directory/);
      await expect(attempt(join(tmp, 'content', 'ja'))).rejects.toThrow(/output directory/);
      expect(await stillThere(join(tmp, 'content', 'ja', 'privacy.md'))).toBe(true);
    });

    // A nonexistent siteDir makes a missing guard fail on ENOENT before any rm can run.
    it.each([['an empty path', ''], ['the filesystem root', '/']])('refuses %s', async (_name, outDir) => {
      await expect(attempt(outDir, join(tmp, 'no-such-site'))).rejects.toThrow(/output directory/);
    });
  });
});
