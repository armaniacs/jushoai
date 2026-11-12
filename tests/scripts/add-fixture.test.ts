import { describe, it, expect } from 'vitest';
import {
  fixtureNameFromUrl, LEDGER_ANCHOR,
  renderLedgerEntry, insertAboveAnchor, insertLedgerEntry, insertFixtureEntry, buildWiring,
} from '../../scripts/add-fixture.mjs';

// Stand-ins for the two files the tool wires: the corpus ledger module
// (tests/corpus.ts, anchor inside the LEDGER object) and the aggregated
// `inScopeFixtures` array in samples.test.ts (consumed by a single it.each).
const ledgerSource = `export interface CorpusEntry { html: string; expected: Record<string, string>; excluded?: string[]; }

const LEDGER = {
  'a.html': {
    expected: {
      k: 'v',
    },
  },
${LEDGER_ANCHOR}
};
`;

const testSource = `import { corpusEntry } from '../corpus';

describe('x', () => {
  const inScopeFixtures: CorpusName[] = [
    'a.html',
  ];
  it.each(inScopeFixtures)('%s fills the in-scope fields', async (file) => {
  });
});
`;

describe('add-fixture', () => {
  it('derives a file name from the URL path', () => {
    expect(fixtureNameFromUrl('https://pro.form-mailer.jp/lp/f3553ff3175246')).toBe('f3553ff3175246.html');
    expect(fixtureNameFromUrl('not a url')).toBe('form.html');
  });

  it('renders a ledger entry with the expected template and the exclusion reasons', () => {
    const entry = renderLedgerEntry('c.html', {
      controls: [{ name: 'q1', id: 'q1' }, { name: '', id: 'q2' }],
      skipped: [{ key: 'submit', type: 'submit', reason: 'action element, never a fill target (exclude)' }],
    });
    expect(entry).toContain(`  'c.html': {`);
    expect(entry).toContain(`      'q1': '<expected>',`);
    expect(entry).toContain(`      'q2': '<expected>',`);
    expect(entry).toContain(`      'submit (submit): action element, never a fill target (exclude)',`);
  });

  it('inserts text above the anchor line through the shared core', () => {
    expect(insertAboveAnchor('a\nb\n', 'X\n', 2)).toBe('a\nX\nb\n');
    expect(insertAboveAnchor('a\nb\n', 'X\n', 0)).toBe('X\na\nb\n');
  });

  it('inserts the ledger entry above the anchor exactly once and idempotently', () => {
    const entry = renderLedgerEntry('c.html', { controls: [], skipped: [] });
    const wired = insertLedgerEntry(ledgerSource, entry) ?? '';
    expect(wired).toContain(`  'c.html': {`);
    expect(wired.indexOf(`  'c.html': {`)).toBeLessThan(wired.indexOf(LEDGER_ANCHOR));
    expect(insertLedgerEntry(wired, entry)).toBe(wired);
  });

  it('fails the ledger insert when the anchor is gone (hand-changed ledger shape)', () => {
    const entry = renderLedgerEntry('c.html', { controls: [], skipped: [] });
    expect(insertLedgerEntry("const LEDGER = {\n  'a.html': { expected: {} },\n};\n", entry)).toBeNull();
  });

  it('appends the fixture to inScopeFixtures once, guards duplicates, and fails without the array', () => {
    const withEntry = insertFixtureEntry(testSource, 'c.html') ?? '';
    expect(withEntry).toContain(`    'c.html',\n  ];`);
    expect(withEntry).toContain(`it.each(inScopeFixtures)`);
    // Dup guard: re-adding the same file leaves the source untouched.
    expect(insertFixtureEntry(withEntry, 'c.html')).toBe(withEntry);
    expect(insertFixtureEntry(testSource, 'a.html')).toBe(testSource);
    // Legacy single-it() stubs also satisfy the guard (no mixed-style dup).
    const legacy = `${testSource}\n  it('c.html fills the in-scope fields', async () => {\n  });\n`;
    expect(insertFixtureEntry(legacy, 'c.html')).toBe(legacy);
    // A missing array declaration fails instead of silently no-oping.
    expect(insertFixtureEntry('const x = 1;\n', 'c.html')).toBeNull();
  });

  it('wires the fixture into the ledger and the inScopeFixtures array, and fails without the ledger anchor', () => {
    const wiring = buildWiring('<form><input name="q1" id="q1" type="text"><button>go</button></form>', 'https://example.com/c', 'c.html');
    expect(wiring.controls).toBe(1);
    expect(wiring.ledgerEntry).toContain(`  'c.html': {`);
    const applied = wiring.applyWiring({ ledger: ledgerSource, test: testSource });
    expect(applied?.ledger).toContain(`  'c.html': {`);
    expect(applied?.test).toContain(`    'c.html',\n  ];`);
    expect(applied?.test).not.toContain(`it('c.html fills the in-scope fields'`);
    expect(applied?.test).toContain(`it.each(inScopeFixtures)`);
    // Idempotent: wiring the same fixture twice changes nothing.
    const rewired = wiring.applyWiring({ ledger: applied!.ledger, test: applied!.test });
    expect(rewired).toEqual(applied);
    // Ledger first: without the anchor the wiring fails and the test source
    // is left untouched (no case without its entry).
    expect(wiring.applyWiring({ ledger: 'const LEDGER = {};\n', test: testSource })).toBeNull();
  });
});
