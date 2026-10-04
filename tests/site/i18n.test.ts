// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_DIR } from './helpers.ts';
import { diffShape, findEmptyStrings } from '../../site/lib/site.ts';

const load = async (lang: string) => JSON.parse(await readFile(join(SITE_DIR, 'i18n', `${lang}.json`), 'utf8')) as unknown;

describe('site i18n files', () => {
  it('have the same keys, array lengths and value types in ja and en', async () => {
    expect(diffShape(await load('ja'), await load('en'))).toEqual([]);
  });

  it('contain no empty strings', async () => {
    expect(findEmptyStrings(await load('ja'))).toEqual([]);
    expect(findEmptyStrings(await load('en'))).toEqual([]);
  });
});
