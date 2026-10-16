import { validateProfile } from './core/profile';
import {
  EMPTY_ADDRESS, EMPTY_PROFILE, type Address, type Profile, type StoredData,
} from './core/types';

// Pure selection resolvers live in core/selection.ts; storage only
// re-exports them for backward compatibility (no duplicate implementation).
export { resolveAddressId, resolveLastId } from './core/selection';

const KEY = 'jushoai:data';
const LAST_KEY = 'jushoai:last';

export interface LastUsed {
  profileId?: string;
  addressId?: string;
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

// Load-boundary hardening: hand edits, corruption, or version skew must never
// break startup nor inject mistyped values into fields. Wrong-typed string
// fields fall back to the template default; non-object entries are dropped.
// The key set itself is left alone (whitelisting is out of scope).
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function coerceStrings<T extends object>(template: T, value: unknown): T {
  const out = { ...template, ...(isObject(value) ? value : {}) } as T;
  for (const k of Object.keys(template) as (keyof T)[]) {
    if (typeof out[k] !== 'string') out[k] = template[k];
  }
  return out;
}

// Normalizes any stored shape to the current one: a legacy single profile becomes the
// first entry labeled メイン, and every entry gets defaults for missing keys.
// Addresses linked to a deleted profile become shared instead of dangling.
export function migrateData(stored: LegacyStoredData | undefined): StoredData {
  const rawList = Array.isArray(stored?.profiles) ? stored.profiles : [];
  const fromList = rawList.length > 0;
  const legacy = !fromList && isObject(stored?.profile) ? [stored.profile] : [];
  const list = (fromList ? rawList : legacy).filter(isObject);
  const profiles = list.map((p) => {
    const clean = coerceStrings(EMPTY_PROFILE, p);
    return { ...clean, id: clean.id || newId(), label: clean.label || (fromList ? '' : 'メイン') };
  });
  const profileIds = new Set(profiles.map((p) => p.id));
  const rawAddresses = Array.isArray(stored?.addresses) ? stored.addresses : [];
  const addresses = rawAddresses.filter(isObject).map((a) => {
    const clean = coerceStrings(EMPTY_ADDRESS, a);
    return {
      ...clean,
      id: clean.id || newId(),
      profileId: clean.profileId && profileIds.has(clean.profileId) ? clean.profileId : '',
    };
  });
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
