// Grouping rules for the terminal zip lookup. The generator script feeds
// parsed KEN_ALL rows in here, so the table stays reproducible: the same
// rows always produce the same ranges, whatever order they arrive in.
export interface KenAllRow {
  zip: string;
  prefecture: string;
  city: string;
}

// The shape the lookup reads: inclusive 3-digit prefix ranges. A blank
// city means prefecture-only: several municipalities share the prefix, so
// callers offer the prefecture and keep warning on the city instead of
// guessing a municipality.
export interface ZipPrefixRange {
  lo: string;
  hi: string;
  prefecture: string;
  city: string;
}

// KEN_ALL is a headerless CSV in Shift_JIS (decoded before this point).
// Columns of interest: 2 = 7-digit zip, 6 = prefecture kanji,
// 7 = city kanji. Rows that fail this shape are data noise, not lookup
// input, so they are skipped rather than repaired.
export function parseKenAllCsv(text: string): KenAllRow[] {
  const rows: KenAllRow[] = [];
  for (const fields of splitCsv(text)) {
    if (fields.length < 8) continue;
    const zip = (fields[2] ?? '').trim();
    const prefecture = (fields[6] ?? '').trim();
    const city = (fields[7] ?? '').trim();
    if (!/^[0-9]{7}$/.test(zip)) continue;
    if (prefecture === '' || city === '') continue;
    rows.push({ zip, prefecture, city });
  }
  return rows;
}

// Minimal CSV reader: quoted fields may hold commas and escaped quotes,
// and lines may end with CRLF. Anything else rides through verbatim.
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let hasField = false;
  const pushField = () => { fields.push(field); field = ''; hasField = false; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') {
      quoted = true;
      hasField = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (hasField || field !== '' || fields.length > 0) {
        pushField();
        rows.push(fields);
        fields = [];
      }
    } else {
      field += ch;
      hasField = true;
    }
  }
  if (hasField || field !== '' || fields.length > 0) {
    pushField();
    rows.push(fields);
  }
  return rows;
}

export interface PrefixRanges {
  ranges: ZipPrefixRange[];
  dropped: string[];
}

// Groups rows by 3-digit prefix. One prefecture with one city resolves
// fully; one prefecture with several cities resolves to prefecture-only
// (blank city, the caller keeps warning on the city row); several
// prefectures on one prefix cannot resolve at all, so the prefix is
// dropped and reported instead of pointing at a wrong prefecture.
// Consecutive prefixes with the same value fold into one inclusive range.
export function buildPrefixRanges(rows: KenAllRow[]): PrefixRanges {
  const groups = new Map<string, Map<string, Set<string>>>();
  for (const row of rows) {
    // Strips non-digits while parseKenAllCsv demands plain 7 digits: KEN_ALL
    // ships plain zips, so the producer never reaches this branch with
    // anything to strip; the tolerance only serves direct callers.
    const digits = row.zip.replace(/[^0-9]/g, '');
    if (digits.length < 3) continue;
    const prefix = digits.slice(0, 3);
    let byPref = groups.get(prefix);
    if (!byPref) {
      byPref = new Map();
      groups.set(prefix, byPref);
    }
    let cities = byPref.get(row.prefecture);
    if (!cities) {
      cities = new Set();
      byPref.set(row.prefecture, cities);
    }
    cities.add(row.city);
  }
  const prefixes = [...groups.keys()].sort();
  const ranges: ZipPrefixRange[] = [];
  const dropped: string[] = [];
  for (const prefix of prefixes) {
    const byPref = groups.get(prefix)!;
    const prefs = [...byPref.keys()].sort();
    if (prefs.length !== 1) {
      dropped.push(prefix);
      continue;
    }
    const prefecture = prefs[0]!;
    const cities = [...byPref.get(prefecture)!].sort();
    const value = { prefecture, city: cities.length === 1 ? cities[0]! : '' };
    const prev = ranges[ranges.length - 1];
    if (prev && prev.prefecture === value.prefecture && prev.city === value.city
      && Number(prefix) === Number(prev.hi) + 1) {
      prev.hi = prefix;
    } else {
      ranges.push({ lo: prefix, hi: prefix, ...value });
    }
  }
  return { ranges, dropped };
}
