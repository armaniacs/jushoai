import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from './lib/check-site.ts';
import { normalizeBase } from './lib/site.ts';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site-dist');
const problems = await checkSite(outDir, normalizeBase(process.env.SITE_BASE));

for (const p of problems) console.error(`${p.file}: ${p.message}`);
if (problems.length > 0) {
  console.error(`${problems.length} problem(s) found`);
  process.exit(1);
}
console.log('site check passed');
