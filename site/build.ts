import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from './lib/build-site.ts';
import { normalizeBase } from './lib/site.ts';

const siteDir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(siteDir, '..', 'site-dist');
const base = normalizeBase(process.env.SITE_BASE);

const files = await buildSite({ siteDir, outDir, base });
console.log(`built ${files.length} pages into ${outDir} (base ${base})`);
