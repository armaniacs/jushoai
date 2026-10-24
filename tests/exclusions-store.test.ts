import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXCLUDED_URLS_KEY, loadExcludedUrls, saveExcludedUrls } from '../src/exclusions-store';

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
      },
    },
  });
});

describe('exclusions store', () => {
  it('round-trips the list under its own key', async () => {
    await saveExcludedUrls(['https://docs.google.com/spreadsheets/']);
    expect(store[EXCLUDED_URLS_KEY]).toEqual(['https://docs.google.com/spreadsheets/']);
    expect(await loadExcludedUrls()).toEqual(['https://docs.google.com/spreadsheets/']);
  });

  it('reads a missing or corrupted value as an empty list', async () => {
    expect(await loadExcludedUrls()).toEqual([]);
    store[EXCLUDED_URLS_KEY] = 'https://docs.google.com/';
    expect(await loadExcludedUrls()).toEqual([]);
    store[EXCLUDED_URLS_KEY] = ['not-a-url', 42];
    expect(await loadExcludedUrls()).toEqual([]);
  });

  it('drops invalid entries instead of failing the whole read', async () => {
    store[EXCLUDED_URLS_KEY] = ['https://docs.google.com/spreadsheets/', 'javascript:alert(1)'];
    expect(await loadExcludedUrls()).toEqual(['https://docs.google.com/spreadsheets/']);
  });

  it('persists a removal', async () => {
    await saveExcludedUrls(['https://a.example/', 'https://b.example/']);
    await saveExcludedUrls(['https://b.example/']);
    expect(await loadExcludedUrls()).toEqual(['https://b.example/']);
  });

  // PBI-153: a failed write must surface as a typed error the caller can
  // identify, not a raw chrome.storage rejection.
  it('reports a failed save as a typed error, not a raw rejection (PBI-153)', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async () => ({}),
          set: async () => { throw new Error('quota exceeded'); },
        },
      },
    });
    const { saveExcludedUrls } = await import('../src/exclusions-store');
    const { KvStoreSaveError } = await import('../src/kv-store');
    await expect(saveExcludedUrls(['https://a.example/'])).rejects.toBeInstanceOf(KvStoreSaveError);
  });
});
