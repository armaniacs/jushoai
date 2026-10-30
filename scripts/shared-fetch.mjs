// Shared fetch seam for the fixture CLIs: timeout + never-throw fetchPage.
// Both scripts/sync-target-urls.mjs (bulk: skip-and-continue) and
// scripts/add-fixture.mjs (single-shot: exit 1) go through here; only the
// ok/non-ok policy differs at the call site, never the fetch itself.
export const FETCH_TIMEOUT_MS = 15_000;

// Fetch a page with a timeout; never throws. A non-ok result means "skip this
// URL and continue with the next one" for the bulk caller, or "exit 1" for
// the single-shot caller.
export async function fetchPage(url, fetchFn = fetch) {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, text: await res.text() };
  } catch (err) {
    return { ok: false, error: err };
  }
}
