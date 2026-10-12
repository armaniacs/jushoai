import { parseExcludedUrls } from './core/exclusions';

export const EXCLUDED_URLS_KEY = 'jushoai:excluded-urls';

// A missing, corrupted or hand-edited value reads as an empty list: a broken
// store must never keep the extension from starting.
export async function loadExcludedUrls(): Promise<string[]> {
  const result = await chrome.storage.local.get(EXCLUDED_URLS_KEY);
  return parseExcludedUrls(result[EXCLUDED_URLS_KEY]);
}

export async function saveExcludedUrls(entries: readonly string[]): Promise<void> {
  await chrome.storage.local.set({ [EXCLUDED_URLS_KEY]: [...entries] });
}
