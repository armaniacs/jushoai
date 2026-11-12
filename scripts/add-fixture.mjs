// One command for the URL-fixture workflow: fetch a page, scaffold a fixture,
// and wire it into the corpus ledger (tests/corpus.ts) and samples.test.ts.
// Static HTML only: JS-rendered pages still need a manual save, and the generated
// expectations stay '<expected>' placeholders until a human fills and trims them.
import { readFileSync, writeFileSync } from 'node:fs';
import { extractControls, renderFixture, renderLedgerEntry } from './scaffold-fixture.mjs';
import { fetchPage } from './shared-fetch.mjs';

// Single ledger seam: the corpus entry renderer lives in scaffold-fixture.mjs
// (shared with the manual scaffold stub); re-exported here so existing
// importers of add-fixture.mjs keep working.
export { renderLedgerEntry };

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

// Shared insertion core (S6 unification): insertAboveAnchor splices `text`
// above the line that carries the anchor position `pos` — the LEDGER_ANCHOR
// match for the ledger, the array `];` for inScopeFixtures. Both wrappers
// keep their own dup guard / missing-anchor contract and differ only in how
// they locate `pos`.
export function insertAboveAnchor(source, text, pos) {
  const lineStart = source.lastIndexOf('\n', pos) + 1;
  return `${source.slice(0, lineStart)}${text}${source.slice(lineStart)}`;
}

// Inserts the entry above the anchor line. Returns null when the anchor is
// gone (the caller must fail instead of silently no-oping), or the unchanged
// source when the entry is already present.
export function insertLedgerEntry(source, entry) {
  const idx = source.indexOf(LEDGER_ANCHOR);
  if (idx === -1) return null;
  const firstLine = entry.trimEnd().split('\n')[0];
  if (firstLine && source.includes(firstLine)) return source;
  return insertAboveAnchor(source, entry, idx);
}

// Appends a quoted entry to the aggregated `inScopeFixtures` array in
// tests/integration/samples.test.ts (consumed by a single `it.each`, SIMP-T2).
// Returns the unchanged source when the file is already listed (dup guard
// covers both the array entry and a legacy single-`it()` stub, so re-running
// on a wired fixture never duplicates it), or null when the array declaration
// is gone (the caller must fail instead of silently no-oping).
export const INSCOPE_ARRAY_RE = /const inScopeFixtures:\s*CorpusName\[\]\s*=\s*\[/;

// Strict wired check (FIX-B/M3): an `inScopeFixtures` element line, a legacy
// single-`it()` stub title, or a `planFor('file')` test body call. The element
// line is matched with its leading newline + 4-space indent (exactly what
// insertFixtureEntry writes), not a bare `'file'` contains-match: a bare match
// also hits single-line lists such as `anchorFixtures` (`['a.html', 'b.html']`
// carries `'a.html',` with a trailing comma), so even the `'file',` comma form
// still false-positives there. The `planFor(` seam covers the five custom-
// titled singles (formmailer-anketo-gender / formmailer-raijo-age /
// overseas-webform-joshibi / furigana-fieldset-form / reinvent-registration-
// contact): without it the strict check would call them unwired and a later
// sync would append a duplicate array entry, breaking the 121/121 smoke.
export function isFixtureWired(source, file) {
  return source.includes(`\n    '${file}',`)
    || source.includes(`it('${file} fills the in-scope fields'`)
    || source.includes(`planFor('${file}'`);
}

export function insertFixtureEntry(source, file) {
  // Dup guard: the quoted name matches an array element line, and the legacy
  // title matches a pre-aggregation single-`it()` stub. Either way the fixture
  // is already wired, so the source is left untouched (never a dup, never mixed).
  if (isFixtureWired(source, file)) return source;
  const m = INSCOPE_ARRAY_RE.exec(source);
  if (!m) return null;
  const close = source.indexOf('];', m.index);
  if (close === -1) return null;
  return insertAboveAnchor(source, `    '${file}',\n`, close);
}

export function buildWiring(html, sourceLabel, file) {
  const extracted = extractControls(html);
  const entry = renderLedgerEntry(file, extracted);
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
      const nextTest = insertFixtureEntry(test, file);
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
      console.error('wiring failed: the corpus ledger anchor in tests/corpus.ts (or the inScopeFixtures array in samples.test.ts) is missing; nothing was written.');
      process.exit(1);
    }
    writeFileSync(new URL(`../samples/${wiring.file}`, import.meta.url), wiring.fixture);
    writeFileSync(testPath, applied.test);
    writeFileSync(ledgerPath, applied.ledger);
    // Success only after a read-back: the ledger and the test source must
    // actually carry the new entry (a silent no-op never reports success).
    const ledgerWired = readFileSync(ledgerPath, 'utf8').includes(`'${wiring.file}': {`);
    // samples.test.ts aggregates the定型 cases in one it.each file list, so
    // the read-back matches the array element line (or a legacy stub title),
    // never a bare quoted-name contains-match (see isFixtureWired).
    const testWired = isFixtureWired(readFileSync(testPath, 'utf8'), wiring.file);
    if (!ledgerWired || !testWired) {
      console.error('wiring failed: read back tests/corpus.ts and samples.test.ts but the new entry is not there.');
      process.exit(1);
    }
    console.log(`wrote samples/${wiring.file}, added its entry to the corpus ledger, and wired a case into samples.test.ts (${wiring.controls} controls, expectations are '<expected>' placeholders).`);
    console.log('next: trim the fixture to the smallest reproduction, fill the expectations, run vitest.');
  }
}
