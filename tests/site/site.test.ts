// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  diffShape, findEmptyStrings, GUIDE_SLUGS, loadGuides, normalizeBase, pagePath, pageUrl,
} from '../../site/lib/site.ts';

describe('urls', () => {
  it('normalizes the base path', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('')).toBe('/');
    expect(normalizeBase('JushoAI')).toBe('/JushoAI/');
    expect(normalizeBase('/JushoAI')).toBe('/JushoAI/');
    expect(normalizeBase('/a/b/')).toBe('/a/b/');
    expect(normalizeBase('//x')).toBe('/x/');
  });

  it('puts English pages under en/ and applies the base', () => {
    expect(pagePath('ja', 'guides/privacy/')).toBe('guides/privacy/');
    expect(pagePath('en', 'guides/privacy/')).toBe('en/guides/privacy/');
    expect(pageUrl('/JushoAI/', 'en', '')).toBe('/JushoAI/en/');
    expect(pageUrl('/', 'ja', 'guides/')).toBe('/guides/');
  });
});

describe('diffShape', () => {
  it('reports missing keys, array length and type differences', () => {
    expect(diffShape({ a: 1, b: { c: 'x' }, d: [1, 2] }, { a: 1, b: { c: 'y' }, d: [1, 2] })).toEqual([]);
    expect(diffShape({ a: 1, b: 2 }, { a: 1 })).toEqual(['b: missing in en']);
    expect(diffShape({ a: 1 }, { a: 1, z: 2 })).toEqual(['z: missing in ja']);
    expect(diffShape({ d: [1, 2] }, { d: [1] })).toEqual(['d: length 2 vs 1']);
    expect(diffShape({ a: 'x' }, { a: 1 })).toEqual(['a: type']);
    expect(diffShape({ n: { m: 1 } }, { n: {} })).toEqual(['n.m: missing in en']);
    expect(diffShape({ n: null }, { n: {} })).toEqual(['n: type']);
    expect(diffShape({ n: [] }, { n: null })).toEqual(['n: type']);
    expect(diffShape({ n: null }, { n: 'x' })).toEqual(['n: type']);
    expect(diffShape({ n: null }, { n: null })).toEqual([]);
  });
});

describe('findEmptyStrings', () => {
  it('lists paths of empty strings', () => {
    expect(findEmptyStrings({ a: 'x', b: '', c: [{ d: ' ' }, 'ok'] })).toEqual(['b', 'c[0].d']);
  });
});

describe('loadGuides', () => {
  let dir: string;

  const guide = (title: string, h2s: string[], order: string | number = 1) =>
    `---\ntitle: ${title}\ndescription: d\norder: ${order}\n---\n# ${title}\n${h2s.map((h) => `## ${h}\ntext\n`).join('')}`;

  const writeAll = async (over: Record<string, string> = {}) => {
    for (const lang of ['ja', 'en']) {
      await mkdir(join(dir, lang), { recursive: true });
      for (const [i, slug] of GUIDE_SLUGS.entries()) {
        await writeFile(join(dir, lang, `${slug}.md`), over[`${lang}/${slug}`] ?? guide(`${slug} ${lang}`, ['A', 'B'], i + 1));
      }
    }
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'site-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('loads every guide in both languages with rendered html', async () => {
    await writeAll();
    const guides = await loadGuides(dir, '/');
    expect(guides).toHaveLength(GUIDE_SLUGS.length * 2);
    const g = guides.find((x) => x.lang === 'en' && x.slug === 'privacy')!;
    expect(g.title).toBe('privacy en');
    expect(g.order).toBe(GUIDE_SLUGS.indexOf('privacy') + 1);
    expect(g.html).toContain('<h2 id="a">A</h2>');
  });

  it('fails when a guide is missing, extra, or front matter is incomplete', async () => {
    await writeAll();
    await rm(join(dir, 'en', 'privacy.md'));
    await expect(loadGuides(dir, '/')).rejects.toThrow(/en\/privacy\.md.*missing/);

    await writeAll();
    await writeFile(join(dir, 'ja', 'extra.md'), guide('x', ['A']));
    await expect(loadGuides(dir, '/')).rejects.toThrow(/ja\/extra\.md.*unexpected/);

    await rm(join(dir, 'ja', 'extra.md'));
    await writeAll({ 'ja/privacy': '---\ntitle: t\n---\n# t' });
    await expect(loadGuides(dir, '/')).rejects.toThrow(/ja\/privacy\.md.*description/);
  });

  it('fails when the languages have a different number of h2 sections', async () => {
    await writeAll({ 'en/privacy': guide('privacy en', ['A'], 3) });
    await expect(loadGuides(dir, '/')).rejects.toThrow(/privacy.*h2/);
  });

  it('reports a missing content directory inside the aggregated error', async () => {
    await writeAll();
    await rm(join(dir, 'en'), { recursive: true });
    await expect(loadGuides(dir, '/')).rejects.toThrow(/guide content problems[\s\S]*en: content directory missing/);
  });

  it('reports duplicate order values within a language', async () => {
    await writeAll({ 'ja/privacy': guide('p', ['A', 'B'], 1) });
    await expect(loadGuides(dir, '/')).rejects.toThrow(/ja: duplicate order 1/);
  });

  it('rejects a non-numeric order and accepts 0', async () => {
    const distinct = Object.fromEntries(
      ['ja', 'en'].flatMap((l) => GUIDE_SLUGS.map((s, i) => [`${l}/${s}`, guide(`${s} ${l}`, ['A', 'B'], i)])),
    );
    await writeAll(distinct);
    const guides = await loadGuides(dir, '/');
    expect(guides.find((g) => g.lang === 'ja' && g.slug === GUIDE_SLUGS[0])!.order).toBe(0);

    await writeAll({ ...distinct, 'ja/privacy': guide('p', ['A', 'B'], 'abc') });
    await expect(loadGuides(dir, '/')).rejects.toThrow(/ja\/privacy\.md.*order must be a number/);
  });
});
