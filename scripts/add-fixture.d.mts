export function fixtureNameFromUrl(href: string): string;

// Anchor comment inside tests/corpus.ts: applyWiring appends its template
// entry just above this line, and the wiring fails when the anchor is gone.
export const LEDGER_ANCHOR: string;

export interface LedgerExtract {
  controls: Array<{ name: string; id: string }>;
  skipped: Array<{ key: string; type: string; reason: string }>;
}

export function renderLedgerEntry(file: string, extracted: LedgerExtract): string;

// Shared insertion core: splices `text` above the line carrying the anchor
// position `pos` (the LEDGER_ANCHOR match, or the array `];`).
export function insertAboveAnchor(source: string, text: string, pos: number): string;
export function insertLedgerEntry(source: string, entry: string): string | null;

// Declaration of the aggregated `inScopeFixtures` array in
// tests/integration/samples.test.ts (consumed by a single `it.each`).
export const INSCOPE_ARRAY_RE: RegExp;

// Appends a quoted entry to the `inScopeFixtures` array. Returns the
// unchanged source when the file is already listed (dup guard), or null when
// the array declaration is gone.
export function insertFixtureEntry(source: string, file: string): string | null;

export interface Wiring {
  file: string;
  fixture: string;
  controls: number;
  ledgerEntry: string;
  applyWiring(sources: { ledger: string; test: string }): { ledger: string; test: string } | null;
}

export function buildWiring(html: string, sourceLabel: string, file: string): Wiring;
