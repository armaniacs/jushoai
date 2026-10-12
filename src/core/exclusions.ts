// User-managed list of URLs where JushoAI must not start. Entries are stored in
// their canonical form (see normalizeExclusionEntry) and matched by prefix, so a
// registered "https://docs.google.com/spreadsheets/" covers every sheet under it
// while the sibling "https://docs.google.com/document/" stays in scope.
export const EXCLUDED_URLS_MAX = 100;
export const EXCLUSION_ENTRY_MAX_LENGTH = 2048;

export type ExclusionInput = { ok: true; value: string } | { ok: false; reason: string };
export type AddExclusionResult = { ok: true; entries: string[] } | { ok: false; reason: string };

const HTTP_SCHEME = /^https?:\/\//i;

// Parsing through URL does the rejecting (a scheme without a host, spaces in the
// host) and the canonicalizing (host case, percent-encoding) in one step. The
// path keeps its case: some servers treat /A and /a as different resources.
export function normalizeExclusionEntry(raw: string): ExclusionInput {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, reason: 'URL を入力してください' };
  if (!HTTP_SCHEME.test(trimmed)) {
    return { ok: false, reason: 'http:// または https:// で始まる URL を入力してください' };
  }
  if (trimmed.length > EXCLUSION_ENTRY_MAX_LENGTH) {
    return { ok: false, reason: `URL は ${EXCLUSION_ENTRY_MAX_LENGTH} 文字までです` };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'URL の形式が正しくありません' };
  }
  if (parsed.hostname === '') return { ok: false, reason: 'URL の形式が正しくありません' };
  return { ok: true, value: parsed.href };
}

// Matching ignores case on both sides: the scheme and host are canonicalized on
// input, but a page can still link a path with different case than the entry.
export function isExcludedUrl(href: string, entries: readonly string[]): boolean {
  if (href === '' || entries.length === 0) return false;
  const target = href.toLowerCase();
  return entries.some((e) => e !== '' && target.startsWith(e.toLowerCase()));
}

const sameEntry = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export function addExclusionEntry(entries: readonly string[], raw: string): AddExclusionResult {
  const normalized = normalizeExclusionEntry(raw);
  if (!normalized.ok) return normalized;
  if (entries.length >= EXCLUDED_URLS_MAX) {
    return { ok: false, reason: `登録できる URL は ${EXCLUDED_URLS_MAX} 件までです` };
  }
  // A case-insensitive duplicate adds nothing, because matching is
  // case-insensitive too.
  if (entries.some((e) => sameEntry(e, normalized.value))) {
    return { ok: false, reason: 'すでに登録されています' };
  }
  return { ok: true, entries: [...entries, normalized.value] };
}

export function removeExclusionEntry(entries: readonly string[], value: string): string[] {
  return entries.filter((e) => e !== value);
}

// Reads the stored value defensively: anything that is not a list of valid
// http(s) prefixes reads as an empty list, so a corrupted or hand-edited store
// can never keep the extension from starting.
export function parseExcludedUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const normalized = normalizeExclusionEntry(value);
    if (!normalized.ok) continue;
    if (out.some((e) => sameEntry(e, normalized.value))) continue;
    out.push(normalized.value);
    if (out.length >= EXCLUDED_URLS_MAX) break;
  }
  return out;
}
