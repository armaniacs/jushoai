// User-managed list of URLs where JushoAI must not start. Entries are stored in
// their canonical form (see normalizeExclusionEntry) and matched by URL
// components (PBI-239), so a registered "https://docs.google.com/spreadsheets/"
// covers every sheet under it while the sibling
// "https://docs.google.com/document/" stays in scope.
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
  // Fragments name a position inside a page, not a different page, and never
  // take part in matching, so the canonical form drops them. Keeping exactly
  // one canonical form also keeps exact-string removals (the quick-register
  // undo) aligned with the load-time normalized list: a #hash saved at
  // registration would never match the fragment-less entry the load reads.
  parsed.hash = '';
  return { ok: true, value: parsed.href };
}

// Path comparison folds case (see isExcludedUrl) and stops at segment
// boundaries: an entry whose path ends with "/" is a directory prefix, while a
// bare path covers the registered page itself plus its subpaths, never its
// siblings — /pay covers /pay and /pay/detail but not /payment.
const coversPath = (entryPath: string, targetPath: string): boolean => {
  const ep = entryPath.toLowerCase();
  const tp = targetPath.toLowerCase();
  if (ep.endsWith('/')) return tp.startsWith(ep);
  return tp === ep || tp.startsWith(`${ep}/`);
};

const coversQuery = (entrySearch: string, targetSearch: string): boolean => {
  if (entrySearch === '') return true;
  const es = entrySearch.toLowerCase();
  const ts = targetSearch.toLowerCase();
  return ts === es || ts.startsWith(`${es}&`);
};

// Matching is component-based (PBI-239): origin equality, then the path and
// query boundary rules below. Case is ignored on both sides: the scheme and
// host are canonicalized on input, but a page can still link a path with
// different case than the entry. A query-bearing entry is the exact
// registration of one page (the quick-register prefix candidate never carries
// a query), so it pins the path instead of covering a subtree. Fragments name
// a position inside the page, not a different page, and never take part.
export function isExcludedUrl(href: string, entries: readonly string[]): boolean {
  if (href === '' || entries.length === 0) return false;
  let target: URL;
  try {
    target = new URL(href);
  } catch {
    return false;
  }
  return entries.some((e) => {
    if (e === '') return false;
    let entry: URL;
    try {
      entry = new URL(e);
    } catch {
      return false;
    }
    if (entry.origin !== target.origin) return false;
    if (entry.search !== '') {
      return entry.pathname.toLowerCase() === target.pathname.toLowerCase()
        && coversQuery(entry.search, target.search);
    }
    return coversPath(entry.pathname, target.pathname);
  });
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

// The save-time merge for the options page (PBI-241): the page holds the list
// in memory from boot, so writing it back wholesale would silently revert a
// quick registration made while the page is open. Instead it saves a diff:
// final = (current ∪ draft-additions) − draft-removals, where additions are
// entries the draft gained after boot and removals are entries the draft lost
// after boot. An entry the draft never touched survives only if it is still in
// current, so neither writer resurrects the other's deletion. All three inputs
// are canonical (normalizeExclusionEntry at add time, parseExcludedUrls at
// load time), so comparison and the one cap pass after the merge are the only
// concerns here.
export interface ExclusionMergeInput {
  boot: readonly string[];
  draft: readonly string[];
  current: readonly string[];
}

export function mergeExcludedEntries({ boot, draft, current }: ExclusionMergeInput): string[] {
  const inBoot = (value: string): boolean => boot.some((b) => sameEntry(b, value));
  const inDraft = (value: string): boolean => draft.some((d) => sameEntry(d, value));
  const merged: string[] = [];
  const push = (value: string): void => {
    if (!merged.some((m) => sameEntry(m, value))) merged.push(value);
  };
  for (const value of current) push(value);
  for (const value of draft) {
    if (!inBoot(value)) push(value);
  }
  const kept = merged.filter((value) => !(inBoot(value) && !inDraft(value)));
  return kept.length > EXCLUDED_URLS_MAX ? kept.slice(kept.length - EXCLUDED_URLS_MAX) : kept;
}

export function removeExclusionEntry(entries: readonly string[], value: string): string[] {
  return entries.filter((e) => e !== value);
}

// Reads the stored value defensively: anything that is not a list of valid
// http(s) entries reads as an empty list, so a corrupted or hand-edited store
// can never keep the extension from starting. Legacy entries stored before
// PBI-239 (no trailing slash, mixed case, fragments) read under the same rule.
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
