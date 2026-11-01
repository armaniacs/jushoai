import { describe, it, expect } from 'vitest';
import {
  fixtureNameFromUrl, LEDGER_ANCHOR,
  renderLedgerEntry, insertLedgerEntry, insertTestCase, buildWiring,
} from '../../scripts/add-fixture.mjs';

// Stand-ins for the two files the tool wires: the corpus ledger module
// (tests/corpus.ts, anchor inside the LEDGER object) and the samples.test.ts
// describe block.
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
  it('a case', async () => {
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

  it('inserts the test case once, idempotently, and fails without a describe block', () => {
    const stub = `  it('c.html fills the in-scope fields', async () => {\n    expect(await planFor('c.html')).toEqual(expectedFor('c.html'));\n  });\n`;
    const withCase = insertTestCase(testSource, stub) ?? '';
    expect(withCase).toContain(`it('c.html fills the in-scope fields'`);
    expect(withCase.trimEnd().endsWith('});')).toBe(true);
    expect(insertTestCase(withCase, stub)).toBe(withCase);
    expect(insertTestCase('const x = 1;\n', stub)).toBeNull();
  });

  it('wires the fixture into the ledger and the test case, and fails without the ledger anchor', () => {
    const wiring = buildWiring('<form><input name="q1" id="q1" type="text"><button>go</button></form>', 'https://example.com/c', 'c.html');
    expect(wiring.controls).toBe(1);
    expect(wiring.ledgerEntry).toContain(`  'c.html': {`);
    const applied = wiring.applyWiring({ ledger: ledgerSource, test: testSource });
    expect(applied?.ledger).toContain(`  'c.html': {`);
    expect(applied?.test).toContain(`it('c.html fills the in-scope fields'`);
    expect(applied?.test).toContain(`toEqual(expectedFor('c.html'))`);
    // Ledger first: without the anchor the wiring fails and the test source
    // is left untouched (no case without its entry).
    expect(wiring.applyWiring({ ledger: 'const LEDGER = {};\n', test: testSource })).toBeNull();
  });
});
