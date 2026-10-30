// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_DIR } from './helpers.ts';
import { validateStrings } from '../../site/lib/validate-guides.ts';

const load = async (lang: string) => JSON.parse(await readFile(join(SITE_DIR, 'i18n', `${lang}.json`), 'utf8')) as unknown;

describe('site i18n files', () => {
  it('has matching shapes with no empty strings in ja and en', async () => {
    expect(validateStrings(await load('ja'), await load('en'))).toEqual([]);
  });
});
