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

// Typed save failure (PBI-23): storage errors used to surface as raw rejections
// that callers could neither identify nor display. Wrapping them lets the
// settings page show a failure notice instead of a false success, and lets
// callers tell QUOTA exhaustion apart via isQuotaExceededError.
export class StorageSaveError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageSaveError';
    this.cause = cause;
  }
}

export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof StorageSaveError) return isQuotaExceededError(err.cause);
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /quota/i.test(text);
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
  try {
    await chrome.storage.local.set({ [LAST_KEY]: v });
  } catch (err) {
    throw new StorageSaveError('最終使用状態の保存に失敗しました', err);
  }
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
  const coerced: string[] = [];
  for (const k of Object.keys(template) as (keyof T)[]) {
    if (typeof out[k] !== 'string') {
      out[k] = template[k];
      coerced.push(String(k));
    }
  }
  // PBI-29: 矯正は維持し、どのキーが既定値に戻されたかだけ通知する。
  // キー集合の温存方針・既定値に戻す振る舞いは変えない。
  if (coerced.length > 0) {
    console.warn(`[JushoAI] 型違いのため既定値に戻しました: ${coerced.join(', ')}`);
  }
  return out;
}

// Deterministic id derivation for migrated entries missing one (PBI-35).
// migrateData used to call newId() (randomUUID / random), so every load
// minted different ids and a saved last-selection no longer matched after a
// restart. Deriving the id from kind + index + normalized content keeps
// repeated loads identical without a write-back, so loadData stays pure and
// the PBI-23 merge guard in saveData is untouched. newId() remains the
// generator for genuinely new entries created from the UI.
function hashSeed(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function stableMigratedId(
  kind: 'profile' | 'address', seed: string, index: number, used: Set<string>,
): string {
  const base = `mig-${kind}-${hashSeed(`${kind}:${index}:${seed}`)}`;
  let id = base;
  let n = 1;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

const rawIdOf = (v: unknown): string | undefined => {
  const id = (v as { id?: unknown })?.id;
  return typeof id === 'string' && id !== '' ? id : undefined;
};

// Normalizes any stored shape to the current one: a legacy single profile becomes the
// first entry labeled メイン, and every entry gets defaults for missing keys.
// Addresses linked to a deleted profile become shared instead of dangling.
export function migrateData(stored: LegacyStoredData | undefined): StoredData {
  const rawList = Array.isArray(stored?.profiles) ? stored.profiles : [];
  const fromList = rawList.length > 0;
  const legacy = !fromList && isObject(stored?.profile) ? [stored.profile] : [];
  const list = (fromList ? rawList : legacy).filter(isObject);
  const usedProfileIds = new Set<string>();
  for (const p of list) {
    const existing = rawIdOf(p);
    if (existing) usedProfileIds.add(existing);
  }
  const profiles = list.map((p, index) => {
    const clean = coerceStrings(EMPTY_PROFILE, p);
    const label = clean.label || (fromList ? '' : 'メイン');
    const id = clean.id
      || stableMigratedId('profile', JSON.stringify({ ...clean, id: '', label }), index, usedProfileIds);
    return { ...clean, id, label };
  });
  const profileIds = new Set(profiles.map((p) => p.id));
  const rawAddresses = Array.isArray(stored?.addresses) ? stored.addresses : [];
  const usedAddressIds = new Set<string>();
  for (const a of rawAddresses) {
    if (!isObject(a)) continue;
    const existing = rawIdOf(a);
    if (existing) usedAddressIds.add(existing);
  }
  const addresses = rawAddresses.filter(isObject).map((a, index) => {
    const clean = coerceStrings(EMPTY_ADDRESS, a);
    const profileId = clean.profileId && profileIds.has(clean.profileId) ? clean.profileId : '';
    const id = clean.id
      || stableMigratedId('address', JSON.stringify({ ...clean, id: '', profileId }), index, usedAddressIds);
    return { ...clean, id, profileId };
  });
  return { profiles, addresses };
}

export async function loadData(): Promise<StoredData> {
  const result = await chrome.storage.local.get(KEY);
  return migrateData(result[KEY] as LegacyStoredData | undefined);
}

// Minimal lost-update guard (PBI-23): re-read just before writing and merge by
// id (incoming wins per id, unknown latest entries are kept), so two contexts
// adding profiles at once do not wipe each other out with a full overwrite.
// Deliberately additive: a deletion made elsewhere can resurface here, which a
// tombstone scheme would be needed to distinguish (out of scope).
function mergeById<T extends { id: string }>(latest: T[], incoming: T[]): T[] {
  const merged = new Map<string, T>();
  for (const entry of latest) merged.set(entry.id, entry);
  for (const entry of incoming) merged.set(entry.id, entry);
  return [...merged.values()];
}

function mergeStoredData(latest: StoredData, incoming: StoredData): StoredData {
  return {
    profiles: mergeById(latest.profiles, incoming.profiles),
    addresses: mergeById(latest.addresses, incoming.addresses),
  };
}

export async function saveData(data: StoredData): Promise<void> {
  let latest: StoredData | undefined;
  try {
    latest = await loadData();
  } catch {
    latest = undefined;
  }
  const payload = latest ? mergeStoredData(latest, data) : data;
  try {
    await chrome.storage.local.set({ [KEY]: payload });
  } catch (err) {
    throw new StorageSaveError('プロファイルの保存に失敗しました', err);
  }
}

export const isReady = (data: StoredData): boolean =>
  data.profiles.some((p) => validateProfile(p).length === 0) && data.addresses.length > 0;
