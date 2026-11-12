// Registry-driven fixture sync: read tests/target-url.md, and for every URL
// without a wired fixture, fetch the page, scaffold the fixture, wire the
// corpus ledger entry (tests/corpus.ts) and the test case, and write the
// `→ fixture` mapping back to the registry.
// Static HTML only; expectations stay '<expected>' placeholders for humans.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWiring, fixtureNameFromUrl } from './add-fixture.mjs';
import { FETCH_TIMEOUT_MS, fetchPage } from './shared-fetch.mjs';

// Re-exported so existing importers keep working; the implementation lives in
// scripts/shared-fetch.mjs, the single fetch seam for both fixture CLIs.
export { FETCH_TIMEOUT_MS, fetchPage };

// Single registry-line parser (S6 unification): one regex serves both the
// reader (parseRegistry) and the writer (stampRegistry), so the `→`/`->`
// arrow shape cannot drift between them. Group 1 keeps the exact `- ` prefix
// (leading whitespace included) so stamping preserves the original layout.
export const REGISTRY_LINE_RE = /^(\s*-\s*)(\S+)(?:\s*(?:→|->)\s*(\S+))?\s*$/;

export function parseRegistryLine(line) {
  const m = line.match(REGISTRY_LINE_RE);
  if (!m) return null;
  return { prefix: m[1], url: m[2], file: m[3] ?? null };
}

export function parseRegistry(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const parsed = parseRegistryLine(line);
    if (parsed) out.push({ url: parsed.url, file: parsed.file });
  }
  return out;
}

export function stampRegistry(md, url, file) {
  const lines = md.split('\n');
  let touched = false;
  const next = lines.map((line) => {
    const parsed = parseRegistryLine(line);
    if (parsed && parsed.url === url && !parsed.file) {
      touched = true;
      return `${parsed.prefix}${url} → ${file}`;
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

// Unfilled scaffold expectations: the corpus ledger entry carries
// `'<expected>'` placeholders that stay red until a human fills them. The
// check below lists them so the remaining work is visible without hunting
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
    // The '<expected>' placeholders live in the corpus ledger since the
    // ledger module (tests/corpus.ts) owns the per-fixture expectations.
    const ledgerPath = new URL('../tests/corpus.ts', import.meta.url);
    const ledgerSource = readFileSync(ledgerPath, 'utf8');
    const remnants = collectExpectedRemnants({ 'tests/corpus.ts': ledgerSource });
    console.log(formatExpectedRemnants(remnants));
    process.exit(0);
  }
  if (!only && !all) {
    console.error('usage: node scripts/sync-target-urls.mjs --only <url> | --all | --check');
    process.exit(2);
  }
  const mdPath = new URL('../tests/target-url.md', import.meta.url);
  const testPath = new URL('../tests/integration/samples.test.ts', import.meta.url);
  const ledgerPath = new URL('../tests/corpus.ts', import.meta.url);
  const md = readFileSync(mdPath, 'utf8');
  let testSource = readFileSync(testPath, 'utf8');
  let ledgerSource = readFileSync(ledgerPath, 'utf8');
  let updated = md;
  const wiredNames = [];
  const failedUrls = [];
  for (const { url, file } of selectTargets(parseRegistry(md), { only, all })) {
    // Wired means both the case and the ledger entry are in place; a drift in
    // either file re-wires through the interface below and heals it.
    if (file && testSource.includes(`'${file}'`) && ledgerSource.includes(`'${file}': {`)) {
      console.log(`skip ${url} (already wired)`);
      continue;
    }
    // Shared apply order with add-fixture.mjs: fetch → buildWiring →
    // applyWiring → write → verify. Bulk policy: a non-ok fetch or a missing
    // ledger anchor logs and continues with the next URL (single-shot exits 1).
    const page = await fetchPage(url);
    if (!page.ok) {
      const reason = page.status ?? page.error?.name ?? 'error';
      console.error(`fetch failed: ${url}: ${reason}`);
      continue;
    }
    const name = file ?? fixtureNameFromUrl(url);
    const wiring = buildWiring(page.text, url, name);
    const applied = wiring.applyWiring({ ledger: ledgerSource, test: testSource });
    if (!applied) {
      failedUrls.push(url);
      console.error(`wiring failed: ${url}: the corpus ledger anchor in tests/corpus.ts is missing; fixture not written`);
      continue;
    }
    writeFileSync(new URL(`../samples/${name}`, import.meta.url), wiring.fixture);
    testSource = applied.test;
    ledgerSource = applied.ledger;
    updated = stampRegistry(updated, url, name);
    wiredNames.push(name);
    console.log(`wired ${url} → samples/${name} (${wiring.controls} controls)`);
  }
  writeFileSync(testPath, testSource);
  writeFileSync(ledgerPath, ledgerSource);
  writeFileSync(mdPath, updated);
  // Read back and verify every wired entry, and fail the command when any
  // wiring did not land: the tool reports failure instead of claiming success.
  const ledgerAfter = readFileSync(ledgerPath, 'utf8');
  const testAfter = readFileSync(testPath, 'utf8');
  // samples.test.ts aggregates the定型 cases in one it.each file list, so the
  // read-back matches the quoted file name instead of the old per-case title.
  const missing = wiredNames.filter((name) =>
    !ledgerAfter.includes(`'${name}': {`) || !testAfter.includes(`'${name}'`),
  );
  if (missing.length > 0) {
    console.error(`wiring failed: the corpus ledger or samples.test.ts does not carry: ${missing.join(', ')}`);
  }
  if (failedUrls.length > 0) {
    console.error(`wiring failed for ${failedUrls.length} URL(s): ${failedUrls.join(', ')}`);
  }
  if (missing.length > 0 || failedUrls.length > 0) {
    process.exit(1);
  }
  console.log('next: trim new fixtures, fill expectations, run vitest.');
}
