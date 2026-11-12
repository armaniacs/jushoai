// One command for the URL-fixture workflow: fetch a page, scaffold a fixture,
// and wire it into the corpus ledger (tests/corpus.ts) and samples.test.ts.
// Static HTML only: JS-rendered pages still need a manual save, and the generated
// expectations stay '<expected>' placeholders until a human fills and trims them.
import { readFileSync, writeFileSync } from 'node:fs';
import { extractControls, renderFixture } from './scaffold-fixture.mjs';
import { fetchPage } from './shared-fetch.mjs';

export function fixtureNameFromUrl(href) {
  try {
    const u = new URL(href);
    const seg = u.pathname.split('/').filter(Boolean).pop() ?? '';
    const base = (seg || u.host).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base || 'form'}.html`;
  } catch {
    return 'form.html';
  }
}

// The corpus ledger anchor: applyWiring appends its template entry just above
// this comment line inside tests/corpus.ts. The tool never parses the glob or
// the ledger shape around it — it edits the module source only at this one
// interface anchor, and the wiring fails when the anchor is gone.
export const LEDGER_ANCHOR = '// <corpus-ledger: make addurl appends its template entry above this line>';

// Template entry for the corpus ledger, in the CorpusExtras shape:
// '<expected>' placeholders for the scanned controls plus the skipped-control
// reasons as excluded strings.
export function renderLedgerEntry(file, { controls, skipped }) {
  const keys = controls.map((c) => `      '${c.name || c.id}': '<expected>',`).join('\n');
  const excluded = skipped.map((s) => `      '${s.key} (${s.type}): ${s.reason}',`).join('\n');
  const lines = [`  '${file}': {`, keys ? '    expected: {' : '    expected: {},'];
  if (keys) lines.push(keys, '    },');
  if (excluded) lines.push('    excluded: [', excluded, '    ],');
  lines.push('  },');
  return lines.join('\n') + '\n';
}

// Inserts the entry above the anchor line. Returns null when the anchor is
// gone (the caller must fail instead of silently no-oping), or the unchanged
// source when the entry is already present.
export function insertLedgerEntry(source, entry) {
  const idx = source.indexOf(LEDGER_ANCHOR);
  if (idx === -1) return null;
  const firstLine = entry.trimEnd().split('\n')[0];
  if (firstLine && source.includes(firstLine)) return source;
  const lineStart = source.lastIndexOf('\n', idx) + 1;
  return `${source.slice(0, lineStart)}${entry}${source.slice(lineStart)}`;
}

// Inserts the case stub before the closing `});` of the last describe block.
// Returns null when there is no describe block to append to, or the unchanged
// source when the case is already present.
export function insertTestCase(source, stub) {
  const firstLine = stub.trim().split('\n')[0];
  if (firstLine && source.includes(firstLine)) return source;
  const idx = source.lastIndexOf('\n});');
  if (idx === -1) return null;
  return `${source.slice(0, idx)}\n${stub}${source.slice(idx + 1)}`;
}

// Case stub consuming the ledger interface: the expectations and exclusion
// reasons live in the corpus entry, so the stub only names the fixture.
function renderCaseStub(file) {
  return `  it('${file} fills the in-scope fields', async () => {\n    expect(await planFor('${file}')).toEqual(expectedFor('${file}'));\n  });\n`;
}

export function buildWiring(html, sourceLabel, file) {
  const extracted = extractControls(html);
  const entry = renderLedgerEntry(file, extracted);
  const stub = renderCaseStub(file);
  return {
    file,
    fixture: renderFixture(sourceLabel, extracted),
    controls: extracted.controls.filter((c) => c.name).length,
    ledgerEntry: entry,
    // Applies the wiring to both sources (ledger first: a case without its
    // entry would name a fixture the ledger key type does not carry). Returns
    // null when either anchor is missing, so the caller fails instead of
    // writing a half-wired state.
    applyWiring({ ledger, test }) {
      const nextLedger = insertLedgerEntry(ledger, entry);
      if (nextLedger === null) return null;
      const nextTest = insertTestCase(test, stub);
      if (nextTest === null) return null;
      return { ledger: nextLedger, test: nextTest };
    },
  };
}

// CLI: node scripts/add-fixture.mjs <url> [fixture-name]
// Shared apply order with sync-target-urls.mjs: fetch → buildWiring →
// applyWiring → write → verify (stamp is the registry write-back, sync only).
// Guarded so importing the pure functions has no side effects.
if (process.argv[1]?.endsWith('scripts/add-fixture.mjs')) {
  const [url, wanted] = process.argv.slice(2);
  if (url) {
    const page = await fetchPage(url);
    if (!page.ok) {
      // Single-shot policy: one URL was asked for, so a non-ok fetch exits 1.
      // The bulk sync instead logs and continues with the next URL.
      console.error(`fetch failed: ${page.status ?? page.error?.name ?? 'error'}`);
      process.exit(1);
    }
    const wiring = buildWiring(page.text, url, wanted ?? fixtureNameFromUrl(url));
    const testPath = new URL('../tests/integration/samples.test.ts', import.meta.url);
    const ledgerPath = new URL('../tests/corpus.ts', import.meta.url);
    // Wire in memory first: a ledger anchor that is gone fails here, before
    // anything is written (no fixture without its entry and case).
    const applied = wiring.applyWiring({
      ledger: readFileSync(ledgerPath, 'utf8'),
      test: readFileSync(testPath, 'utf8'),
    });
    if (!applied) {
      console.error('wiring failed: the corpus ledger anchor in tests/corpus.ts (or the describe block in samples.test.ts) is missing; nothing was written.');
      process.exit(1);
    }
    writeFileSync(new URL(`../samples/${wiring.file}`, import.meta.url), wiring.fixture);
    writeFileSync(testPath, applied.test);
    writeFileSync(ledgerPath, applied.ledger);
    // Success only after a read-back: the ledger and the test source must
    // actually carry the new entry (a silent no-op never reports success).
    const ledgerWired = readFileSync(ledgerPath, 'utf8').includes(`'${wiring.file}': {`);
    // samples.test.ts aggregates the定型 cases in one it.each file list, so the
    // read-back matches the quoted file name (satisfied by both a list entry
    // and a singly appended `it('... fills the in-scope fields')` stub).
    const testWired = readFileSync(testPath, 'utf8').includes(`'${wiring.file}'`);
    if (!ledgerWired || !testWired) {
      console.error('wiring failed: read back tests/corpus.ts and samples.test.ts but the new entry is not there.');
      process.exit(1);
    }
    console.log(`wrote samples/${wiring.file}, added its entry to the corpus ledger, and wired a case into samples.test.ts (${wiring.controls} controls, expectations are '<expected>' placeholders).`);
    console.log('next: trim the fixture to the smallest reproduction, fill the expectations, run vitest.');
  }
}
