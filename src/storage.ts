import { validateProfile } from './core/profile';
import { EMPTY_PROFILE, type StoredData } from './core/types';

const KEY = 'jushoai:data';

export async function loadData(): Promise<StoredData> {
  const result = await chrome.storage.local.get(KEY);
  const stored = result[KEY] as Partial<StoredData> | undefined;
  return {
    profile: { ...EMPTY_PROFILE, ...stored?.profile },
    addresses: stored?.addresses ?? [],
  };
}

export async function saveData(data: StoredData): Promise<void> {
  await chrome.storage.local.set({ [KEY]: data });
}

export const isReady = (data: StoredData): boolean =>
  validateProfile(data.profile).length === 0 && data.addresses.length > 0;
