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
export function renderTestStub(fileName: string, extracted: Extracted): string;
