export interface ScaffoldControl {
  tag: string;
  type: string;
  name: string;
  id: string;
  label: string;
  legend: string;
  placeholder: string;
  maxLength: string;
  pattern: string;
}

export interface ScaffoldSkipped {
  tag: string;
  type: string;
  key: string;
  reason: string;
}

export interface Extracted {
  controls: ScaffoldControl[];
  skipped: ScaffoldSkipped[];
}

export function extractControls(html: string): Extracted;
export function renderFixture(sourceName: string, extracted: Extracted): string;

// Shared key/exclusion line formatters (single seam for both fixture CLIs).
export function formatExpectedLines(controls: Array<{ name: string; id: string }>): string[];
export function formatExcludedLines(skipped: Array<{ key: string; type: string; reason: string }>): string[];

export interface LedgerLike {
  controls: Array<{ name: string; id: string }>;
  skipped: Array<{ key: string; type: string; reason: string }>;
}

// Corpus ledger template entry (shared with add-fixture.mjs, which
// re-exports it so existing importers keep working).
export function renderLedgerEntry(file: string, extracted: LedgerLike): string;
export function renderTestStub(fileName: string, extracted: Extracted): string;
