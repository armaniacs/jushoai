import { validateProfile } from './core/profile';
import {
  EMPTY_ADDRESS, EMPTY_PROFILE, type Address, type Profile, type StoredData,
} from './core/types';

const KEY = 'jushoai:data';
const LAST_KEY = 'jushoai:last';

export interface LastUsed {
  profileId?: string;
  addressId?: string;
}

// Returns the stored id when it still exists, otherwise undefined (caller falls back).
export function resolveLastId(stored: string | undefined, ids: string[]): string | undefined {
  return stored && ids.includes(stored) ? stored : undefined;
}

export async function loadLastUsed(): Promise<LastUsed> {
  const result = await chrome.storage.local.get(LAST_KEY);
  const v = result[LAST_KEY] as Partial<LastUsed> | undefined;
  const out: LastUsed = {};
  if (typeof v?.profileId === 'string' && v.profileId !== '') out.profileId = v.profileId;
  if (typeof v?.addressId === 'string' && v.addressId !== '') out.addressId = v.addressId;
  return out;
}

export async function saveLastUsed(v: LastUsed): Promise<void> {
  await chrome.storage.local.set({ [LAST_KEY]: v });
}

interface LegacyStoredData {
  profile?: Partial<Profile>;
  profiles?: Partial<Profile>[];
  addresses?: Partial<Address>[];
}

// Normalizes any stored shape to the current one: a legacy single profile becomes the
// first entry labeled メイン, and every entry gets defaults for missing keys.
export function migrateData(stored: LegacyStoredData | undefined): StoredData {
  const addresses = ((stored?.addresses ?? []) as Partial<Address>[]).map((a) => ({
    ...EMPTY_ADDRESS,
    ...a,
    id: a.id || crypto.randomUUID(),
  }));
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
