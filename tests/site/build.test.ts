// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../../site/lib/build-site.ts';
import { GUIDE_SLUGS } from '../../site/lib/site.ts';

let tmp: string;

export async function writeFixtureContent(dir: string, lang: 'ja' | 'en', slugs: readonly string[] = GUIDE_SLUGS) {
  await mkdir(join(dir, lang), { recursive: true });
  let order = 1;
  for (const slug of slugs) {
    await writeFile(
      join(dir, lang, `${slug}.md`),
      `---\ntitle: ${slug} ${lang}\ndescription: description ${slug}\norder: ${order++}\n---\n# ${slug} ${lang}\n\n## A\n\n\`\`\`bash\nmake build\n\`\`\`\n\n## B\n\n[home](/)\n`,
    );
  }
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'site-build-'));
  await writeFixtureContent(join(tmp, 'content'), 'ja');
  await writeFixtureContent(join(tmp, 'content'), 'en');
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const run = (base = '/') =>
  buildSite({ siteDir: 'site', contentDir: join(tmp, 'content'), outDir: join(tmp, 'out'), base });
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
});
