// Registry-driven fixture sync: read tests/target-url.md, and for every URL
// without a wired fixture, fetch the page, scaffold the fixture, wire the test,
// and write the `→ fixture` mapping back to the registry.
// Static HTML only; expectations stay '<expected>' placeholders for humans.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWiring, fixtureNameFromUrl } from './add-fixture.mjs';
import { FETCH_TIMEOUT_MS, fetchPage } from './shared-fetch.mjs';

// Re-exported so existing importers keep working; the implementation lives in
// scripts/shared-fetch.mjs, the single fetch seam for both fixture CLIs.
export { FETCH_TIMEOUT_MS, fetchPage };

export function parseRegistry(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\s*-\s*(\S+)(?:\s*(?:→|->)\s*(\S+))?\s*$/);
    if (m) out.push({ url: m[1], file: m[2] ?? null });
  }
  return out;
}

export function stampRegistry(md, url, file) {
  const lines = md.split('\n');
  let touched = false;
  const next = lines.map((line) => {
    const m = line.match(/^(\s*-\s*\S+?)((?:\s*(?:→|->)\s*\S+)?)\s*$/);
    if (m && m[1].trim().slice(2) === url && !m[2]) {
      touched = true;
      return `${m[1]} → ${file}`;
    }
    return line;
  });
  if (!touched && !next.some((l) => l.includes(url))) next.push(`- ${url} → ${file}`);
  return next.join('\n');
}

export function parseSyncArgs(argv) {
  let only = null;
  let all = false;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--only') {
      only = argv[++i] ?? null;
    } else if (arg.startsWith('--only=')) {
      only = arg.slice('--only='.length) || null;
    } else if (arg === '--all') {
      all = true;
    } else if (arg === '--check') {
      check = true;
    }
  }
  return { only, all, check };
}

// Narrow the sync targets: --only syncs just the given URL (used by
// `make addurl URL=...`), --all syncs every entry. Bulk sync of all unwired
// URLs happens only when explicitly requested; with neither flag there is
// nothing to do (avoids hanging on unrelated unresponsive hosts).
export function selectTargets(entries, { only = null, all = false } = {}) {
  if (only) return entries.filter((e) => e.url === only);
  if (all) return entries.slice();
  return [];
}

// Unfilled scaffold expectations: `renderTestStub` writes `'<expected>'`
// placeholders that stay red until a human fills them. The check below
// lists them per file so the remaining work is visible without hunting
// failures backwards.
export const EXPECTED_PLACEHOLDER = "'<expected>'";

export function countExpectedPlaceholders(source) {
  if (!source) return 0;
  return source.split(EXPECTED_PLACEHOLDER).length - 1;
}

export function collectExpectedRemnants(files) {
  const remnants = [];
  for (const [file, source] of Object.entries(files)) {
    const count = countExpectedPlaceholders(source);
    if (count > 0) remnants.push({ file, count });
  }
  remnants.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return remnants;
}

export function formatExpectedRemnants(remnants) {
  if (remnants.length === 0) return `addurl-check: no ${EXPECTED_PLACEHOLDER} remnants.`;
  const lines = remnants.map(({ file, count }) => `${file}: ${count}`);
  const total = remnants.reduce((sum, r) => sum + r.count, 0);
  return [...lines, `total: ${total} in ${remnants.length} file(s)`].join('\n');
}

// CLI: node scripts/sync-target-urls.mjs --only <url> | --all | --check
if (process.argv[1]?.endsWith('scripts/sync-target-urls.mjs')) {
  const { only, all, check } = parseSyncArgs(process.argv.slice(2));
  if (check) {
    const testPath = new URL('../tests/integration/samples.test.ts', import.meta.url);
    const testSource = readFileSync(testPath, 'utf8');
    const remnants = collectExpectedRemnants({ 'tests/integration/samples.test.ts': testSource });
    console.log(formatExpectedRemnants(remnants));
    process.exit(0);
  }
  if (!only && !all) {
    console.error('usage: node scripts/sync-target-urls.mjs --only <url> | --all | --check');
    process.exit(2);
  }
  const mdPath = new URL('../tests/target-url.md', import.meta.url);
  const testPath = new URL('../tests/integration/samples.test.ts', import.meta.url);
  const md = readFileSync(mdPath, 'utf8');
  let testSource = readFileSync(testPath, 'utf8');
  let updated = md;
  for (const { url, file } of selectTargets(parseRegistry(md), { only, all })) {
    if (file && testSource.includes(`'${file}'`)) {
      console.log(`skip ${url} (already wired)`);
      continue;
    }
    // Shared apply order with add-fixture.mjs: fetch → buildWiring →
    // write → applyTest → stamp. Bulk policy: a non-ok fetch logs and
    // continues with the next URL (single-shot instead exits 1).
    const page = await fetchPage(url);
    if (!page.ok) {
      const reason = page.status ?? page.error?.name ?? 'error';
      console.error(`fetch failed: ${url}: ${reason}`);
      continue;
    }
    const name = file ?? fixtureNameFromUrl(url);
    const wiring = buildWiring(page.text, url, name);
    writeFileSync(new URL(`../samples/${name}`, import.meta.url), wiring.fixture);
    testSource = wiring.applyTest(testSource);
    updated = stampRegistry(updated, url, name);
    console.log(`wired ${url} → samples/${name} (${wiring.controls} controls)`);
  }
  writeFileSync(testPath, testSource);
  writeFileSync(mdPath, updated);
  console.log('next: trim new fixtures, fill expectations, run vitest.');
}
