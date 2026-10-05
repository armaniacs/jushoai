import { validateProfile } from './core/profile';
import { EMPTY_PROFILE, type Address, type Profile, type StoredData } from './core/types';

const KEY = 'jushoai:data';

interface LegacyStoredData {
  profile?: Partial<Profile>;
  profiles?: Partial<Profile>[];
  addresses?: Partial<Address>[];
}

// Normalizes any stored shape to the current one: a legacy single profile becomes the
// first entry labeled メイン, and every entry gets defaults for missing keys.
export function migrateData(stored: LegacyStoredData | undefined): StoredData {
  const addresses = (stored?.addresses ?? []) as Address[];
  const fromList = !!stored?.profiles && stored.profiles.length > 0;
  const legacy = !fromList && stored?.profile ? [{ ...stored.profile }] : [];
  const list = fromList ? stored.profiles! : legacy;
  const profiles = list.map((p) => ({
    ...EMPTY_PROFILE,
    ...p,
    id: p.id || crypto.randomUUID(),
    label: p.label || (fromList ? '' : 'メイン'),
  }));
  return { profiles, addresses };
}

export async function loadData(): Promise<StoredData> {
  const result = await chrome.storage.local.get(KEY);
  return migrateData(result[KEY] as LegacyStoredData | undefined);
}

export async function saveData(data: StoredData): Promise<void> {
  await chrome.storage.local.set({ [KEY]: data });
}

export const isReady = (data: StoredData): boolean =>
  data.profiles.some((p) => validateProfile(p).length === 0) && data.addresses.length > 0;
