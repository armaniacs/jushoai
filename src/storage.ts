import { validateProfile } from './core/profile';
import type { KvSpec } from './kv-store';
import {
  EMPTY_ADDRESS, EMPTY_PROFILE, type Address, type Profile, type StoredData,
} from './core/types';

// Pure selection resolvers live in core/selection.ts; storage only
// re-exports them for backward compatibility (no duplicate implementation).
export { resolveAddressId, resolveLastId } from './core/selection';

const KEY = 'jushoai:data';
const LAST_KEY = 'jushoai:last';
// Backup reminder state: timestamps only, never profile values. One
// key holds both so a single read settles the transfer section.
const BACKUP_KEY = 'jushoai:backup';

// Format version of the persisted envelope (WHY one place): the store written
// before any version existed reads as 0 and is accepted as-is; a version
// newer than this constant means a newer build wrote the data. The load
// boundary tolerates the newer shape (known entries keep working), keeps the
// version and the unknown keys on save, and surfaces an update prompt.
export const FORMAT_VERSION = 1;

export interface LastUsed {
  profileId?: string;
  addressId?: string;
}

// Timestamps behind the backup nudge: the last successful export
// and the last nudge dismissal, as epoch milliseconds. Profile values never
// enter this key.
export interface BackupMeta {
  lastExportAt?: number;
  dismissedAt?: number;
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

// Typed read failure for the import seam (PBI-117 review): a failed read
// inside saveImported must interrupt the import instead of letting the
// incoming data replace everything in storage. Distinct from StorageSaveError
// so callers can report 読み取り失敗 and 保存失敗 apart.
export class StorageReadError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageReadError';
    this.cause = cause;
  }
}

export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof StorageSaveError) return isQuotaExceededError(err.cause);
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /quota/i.test(text);
}

// The last-used shape check, extracted as a pure parse so the spec below and
// loadLastUsed share one copy (same pattern as the learning stores' exported
// parse functions).
export function parseLastUsed(raw: unknown): LastUsed {
  const v = raw as Partial<LastUsed> | undefined;
  const out: LastUsed = {};
  if (typeof v?.profileId === 'string' && v.profileId !== '') out.profileId = v.profileId;
  if (typeof v?.addressId === 'string' && v.addressId !== '') out.addressId = v.addressId;
  return out;
}

export async function loadLastUsed(): Promise<LastUsed> {
  const result = await chrome.storage.local.get(LAST_KEY);
  return parseLastUsed(result[LAST_KEY]);
}

export async function saveLastUsed(v: LastUsed): Promise<void> {
  try {
    await chrome.storage.local.set({ [LAST_KEY]: v });
  } catch (err) {
    throw new StorageSaveError('最終使用状態の保存に失敗しました', err);
  }
}

// The backup meta parse, extracted as pure so the spec below and
// loadBackupMeta share one copy (same pattern as parseLastUsed). Anything
// that is not a non-negative integer timestamp is dropped, so a hand edit
// cannot resurface the nudge logic with a junk value.
export function parseBackupMeta(raw: unknown): BackupMeta {
  const v = raw as Partial<BackupMeta> | undefined;
  const out: BackupMeta = {};
  if (typeof v?.lastExportAt === 'number' && Number.isInteger(v.lastExportAt) && v.lastExportAt >= 0) {
    out.lastExportAt = v.lastExportAt;
  }
  if (typeof v?.dismissedAt === 'number' && Number.isInteger(v.dismissedAt) && v.dismissedAt >= 0) {
    out.dismissedAt = v.dismissedAt;
  }
  return out;
}

export async function loadBackupMeta(): Promise<BackupMeta> {
  const result = await chrome.storage.local.get(BACKUP_KEY);
  return parseBackupMeta(result[BACKUP_KEY]);
}

export async function saveBackupMeta(v: BackupMeta): Promise<void> {
  try {
    await chrome.storage.local.set({ [BACKUP_KEY]: v });
  } catch (err) {
    throw new StorageSaveError('バックアップ状態の保存に失敗しました', err);
  }
}

// The profile store's load specs (PBI-159): the flow-unit loader
// (src/content/flow-state.ts) batches these with the learning stores' specs so
// a flow reads all its keys in one get([keys...]) call. loadData/loadLastUsed
// keep their own reads and error modes; the specs only supply key + parse.
export const DATA_STORE: KvSpec<StoredData> = {
  key: KEY,
  parse: (raw) => migrateData(raw as LegacyStoredData | undefined),
};

export const LAST_USED_STORE: KvSpec<LastUsed> = {
  key: LAST_KEY,
  parse: parseLastUsed,
};

export const BACKUP_STORE: KvSpec<BackupMeta> = {
  key: BACKUP_KEY,
  parse: parseBackupMeta,
};

interface LegacyStoredData {
  version?: unknown;
  profile?: Partial<Profile>;
  profiles?: Partial<Profile>[];
  addresses?: Partial<Address>[];
}

// Reads the envelope version (WHY lenient): anything that is not a
// non-negative integer (absent, mistyped, or hand-edited counts as 0, the
// pre-version shape, so a corrupt version stamp degrades to the legacy path
// instead of breaking startup. Only an integer above FORMAT_VERSION is newer.
export function storedFormatVersion(raw: unknown): number {
  const v = isObject(raw) ? (raw as { version?: unknown }).version : undefined;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

export interface FormatInfo {
  version: number;
  needsUpdate: boolean;
}

export async function loadFormatInfo(): Promise<FormatInfo> {
  const result = await chrome.storage.local.get(KEY);
  const version = storedFormatVersion(result[KEY]);
  return { version, needsUpdate: version > FORMAT_VERSION };
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

// Known-keys-only projection (PBI-117 review): coerceStrings tolerates unknown
// keys at the load boundary (hand edits and version skew must not break
// startup), but the unknown keys must not leak into the stable id seed or the
// export. This keeps only the template's keys, in the template's order.
export function pickKnown<T extends object>(template: T, value: unknown): T {
  const source: Record<string, unknown> = isObject(value) ? value : {};
  const out = {} as T;
  const target = out as Record<string, unknown>;
  for (const k of Object.keys(template)) {
    target[k] = source[k];
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
// `profileOwnerIds` optionally overrides the owner set for the address link
// check (PBI-117 review): the import passes the union of storage and file
// profile ids so a partial file (addresses only) keeps its link when the owner
// profile lives in storage. Without it the file's profiles alone decided, and
// merging the unlinked result over the stored addresses silently dropped valid
// links. loadData keeps calling without the override.
export function migrateData(
  stored: LegacyStoredData | undefined, profileOwnerIds?: Set<string>,
): StoredData {
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
    // The seed carries the template's known keys only (pickKnown): unknown
    // keys must not change the minted id, or identical no-id content would
    // resolve to different mig- ids depending on hand-edit junk (PBI-35).
    const id = clean.id
      || stableMigratedId(
        'profile',
        JSON.stringify({ ...pickKnown(EMPTY_PROFILE, clean), id: '', label }),
        index,
        usedProfileIds,
      );
    return { ...clean, id, label };
  });
  const profileIds = profileOwnerIds ?? new Set(profiles.map((p) => p.id));
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
      || stableMigratedId(
        'address',
        JSON.stringify({ ...pickKnown(EMPTY_ADDRESS, clean), id: '', profileId }),
        index,
        usedAddressIds,
      );
    return { ...clean, id, profileId };
  });
  return { profiles, addresses };
}

export async function loadData(): Promise<StoredData> {
  const result = await chrome.storage.local.get(KEY);
  return migrateData(result[KEY] as LegacyStoredData | undefined);
}

// Serializes the in-memory lists back into the versioned envelope (WHY): an
// older build editing one field must not downgrade the store, so a newer
// version stamp is kept and any top-level keys this build does not know ride
// along. The legacy single-profile key has already been folded into profiles
// by migrateData, so it is dropped instead of carried forward.
function envelopePayload(data: StoredData, raw: unknown): Record<string, unknown> {
  const extra: Record<string, unknown> = isObject(raw) ? { ...(raw as Record<string, unknown>) } : {};
  delete extra.version;
  delete extra.profile;
  delete extra.profiles;
  delete extra.addresses;
  const stored = storedFormatVersion(raw);
  return {
    ...extra,
    version: stored > FORMAT_VERSION ? stored : FORMAT_VERSION,
    profiles: data.profiles,
    addresses: data.addresses,
  };
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

// Exported for the transfer import (PBI-117): the import projects the merged
// result to check the collection cap before saving. The merge behavior itself
// (id-unit, incoming wins, additive) is unchanged.
export function mergeStoredData(latest: StoredData, incoming: StoredData): StoredData {
  return {
    profiles: mergeById(latest.profiles, incoming.profiles),
    addresses: mergeById(latest.addresses, incoming.addresses),
  };
}

export async function saveData(data: StoredData): Promise<void> {
  let latest: StoredData | undefined;
  let raw: unknown;
  try {
    raw = (await chrome.storage.local.get(KEY))[KEY];
    latest = migrateData(raw as LegacyStoredData | undefined);
  } catch {
    latest = undefined;
  }
  const payload = latest ? mergeStoredData(latest, data) : data;
  try {
    await chrome.storage.local.set({ [KEY]: envelopePayload(payload, raw) });
  } catch (err) {
    throw new StorageSaveError('プロファイルの保存に失敗しました', err);
  }
}

// Dedicated import seam (PBI-117 review): the plain saveData falls back to a
// full-replacement payload when its internal re-read fails and has no cap
// check, so an import through it could wipe the stored data or land an
// unchecked entry count. This seam keeps read → merge → cap check → write in
// one place, closed over a single read: a failed read throws instead of
// degrading to a replacement, and `capCheck` runs on the pre-write merge
// result right before the write, so nothing uncounted can slip in between
// check and write. Normal saves keep using saveData.
export async function saveImported(
  data: StoredData,
  capCheck: (payload: StoredData) => void,
): Promise<void> {
  let latest: StoredData;
  let raw: unknown;
  try {
    raw = (await chrome.storage.local.get(KEY))[KEY];
    latest = migrateData(raw as LegacyStoredData | undefined);
  } catch (err) {
    throw new StorageReadError('プロファイルの読み取りに失敗しました', err);
  }
  const payload = mergeStoredData(latest, data);
  capCheck(payload);
  try {
    await chrome.storage.local.set({ [KEY]: envelopePayload(payload, raw) });
  } catch (err) {
    throw new StorageSaveError('プロファイルの保存に失敗しました', err);
  }
}

export const isReady = (data: StoredData): boolean =>
  data.profiles.some((p) => validateProfile(p).length === 0) && data.addresses.length > 0;
