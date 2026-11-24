// Terminal-only zip lookup: a 3-digit prefix table maps to { prefecture,
// city } with no network and no LLM, so an empty prefecture/city field can
// still offer a candidate from the address zip. Unknown prefixes (and
// prefixes shared by several prefectures, which the table omits) return
// null and keep the plain warn-no-value row. A blank city means the prefix
// spans municipalities: callers offer the prefecture and keep warning on
// the city instead of guessing a municipality.
import { ZIP_PREFIX_RANGES } from './zip-dict-data';

export interface ZipAssist {
  prefecture: string;
  city: string;
}

// Hyphen-insensitive: the lookup strips the separator before reading the
// prefix, so both 100-0001 and 1000001 resolve the same way.
export function zipAssistFor(zip: string): ZipAssist | null {
  const digits = zip.replace(/[^0-9]/g, '');
  if (digits.length < 3) return null;
  const prefix = digits.slice(0, 3);
  for (const r of ZIP_PREFIX_RANGES) {
    if (r.lo <= prefix && prefix <= r.hi) return { prefecture: r.prefecture, city: r.city };
  }
  return null;
}
