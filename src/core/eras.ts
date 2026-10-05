import type { SelectOption } from './types';

export interface EraDate { era: string; year: number }

// Ascending start dates. Wareki year = seireki year - start year + 1; the first year is 1.
const ERAS: { name: string; start: string }[] = [
  { name: '明治', start: '1868-09-08' },
  { name: '大正', start: '1912-07-30' },
  { name: '昭和', start: '1926-12-25' },
  { name: '平成', start: '1989-01-08' },
  { name: '令和', start: '2019-05-01' },
];

export function toEraDate(iso: string): EraDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  let current: EraDate | null = null;
  for (const e of ERAS) {
    if (iso < e.start) break;
    current = { era: e.name, year: Number(iso.slice(0, 4)) - Number(e.start.slice(0, 4)) + 1 };
  }
  return current;
}

export function splitBirthday(iso: string): { y: string; m: string; d: string } | null {
  const parts = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-') : null;
  if (!parts) return null;
  return { y: parts[0]!, m: parts[1]!, d: parts[2]! };
}

const leadingDigits = (s: string) => {
  const m = s.normalize('NFKC').trim().match(/^\d+/);
  return m ? Number(m[0]) : NaN;
};

// Absorbs notation differences (value="01", text "1", text "5月") by numeric comparison.
export function matchNumberOption(options: SelectOption[], n: number): SelectOption | null {
  if (!Number.isInteger(n)) return null;
  return options.find((o) => leadingDigits(o.value) === n || leadingDigits(o.text) === n) ?? null;
}

export function matchEraOption(options: SelectOption[], era: string): SelectOption | null {
  const t = era.normalize('NFKC').trim();
  if (!t) return null;
  return options.find((o) => o.text.normalize('NFKC').trim() === t)
    ?? options.find((o) => o.value.normalize('NFKC').trim() === t)
    ?? null;
}
