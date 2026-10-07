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

// Picks the address for a profile: the preferred one when it is shared or
// linked to the profile, otherwise the first shared/linked address,
// otherwise the first address. Never returns undefined for a non-empty list.
export function resolveAddressId(
  addresses: Address[], profileId: string, preferredId?: string,
): string | undefined {
  const preferred = preferredId ? addresses.find((a) => a.id === preferredId) : undefined;
  if (preferred && (!preferred.profileId || preferred.profileId === profileId)) {
    return preferred.id;
  }
  return addresses.find((a) => !a.profileId || a.profileId === profileId)?.id
    ?? addresses[0]?.id;
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

let fallbackCounter = 0;

// ID generation that survives contexts without crypto.randomUUID.
// Uses randomUUID when available, otherwise falls back to a time + random +
// counter hex shape that stays unique within a migration run.
export function newId(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    // Fall through to the fallback when globalThis is unreachable
  }
  fallbackCounter += 1;
  const time = Date.now().toString(16);
  const count = fallbackCounter.toString(16).padStart(4, '0');
  const rand = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `fallback-${time}-${count}-${rand}`;
}

// Normalizes any stored shape to the current one: a legacy single profile becomes the
// first entry labeled メイン, and every entry gets defaults for missing keys.
// Addresses linked to a deleted profile become shared instead of dangling.
export function migrateData(stored: LegacyStoredData | undefined): StoredData {
  const fromList = !!stored?.profiles && stored.profiles.length > 0;
  const legacy = !fromList && stored?.profile ? [{ ...stored.profile }] : [];
  const list = fromList ? stored.profiles! : legacy;
  const profiles = list.map((p) => ({
    ...EMPTY_PROFILE,
    ...p,
    id: p.id || newId(),
    label: p.label || (fromList ? '' : 'メイン'),
  }));
  const profileIds = new Set(profiles.map((p) => p.id));
  const addresses = ((stored?.addresses ?? []) as Partial<Address>[]).map((a) => ({
    ...EMPTY_ADDRESS,
    ...a,
    id: a.id || newId(),
    profileId: a.profileId && profileIds.has(a.profileId) ? a.profileId : '',
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
