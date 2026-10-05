export function fixtureNameFromUrl(href: string): string;
export function varNameFromFile(file: string): string;
export function insertImport(source: string, varName: string, file: string): string;
export function insertSampleEntry(source: string, file: string, varName: string): string;
export function insertTestCase(source: string, stub: string): string;

export interface Wiring {
  file: string;
  fixture: string;
  controls: number;
  applyTest(testSource: string): string;
}

export function buildWiring(html: string, sourceLabel: string, file: string): Wiring;
