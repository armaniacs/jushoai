export function fixtureNameFromUrl(href: string): string;

// Anchor comment inside tests/corpus.ts: applyWiring appends its template
// entry just above this line, and the wiring fails when the anchor is gone.
export const LEDGER_ANCHOR: string;

export interface LedgerExtract {
  controls: Array<{ name: string; id: string }>;
  skipped: Array<{ key: string; type: string; reason: string }>;
}

export function renderLedgerEntry(file: string, extracted: LedgerExtract): string;
export function insertLedgerEntry(source: string, entry: string): string | null;
export function insertTestCase(source: string, stub: string): string | null;

export interface Wiring {
  file: string;
  fixture: string;
  controls: number;
  ledgerEntry: string;
  applyWiring(sources: { ledger: string; test: string }): { ledger: string; test: string } | null;
}

export function buildWiring(html: string, sourceLabel: string, file: string): Wiring;
