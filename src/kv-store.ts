// The one store module for the small chrome.storage-backed stores (PBI-153):
// it owns key -> load/save/upsert/parse/cap and the typed error mode. The
// learning stores (approval/assignment/mapping/exclusions) are adapters that
// supply key, cap, and parse; none of them touches chrome.storage itself.

// Typed save failure (PBI-153): the adapters used to surface raw chrome.storage
// rejections that callers could neither identify nor report. Same reasoning as
// the PBI-23 precedent in src/storage.ts (StorageSaveError / StorageReadError);
// a distinct name so a learning-state write failure never reads as a profile
// save failure.
export class KvStoreSaveError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'KvStoreSaveError';
    this.cause = cause;
  }
}

// Typed read failure, distinct from the save failure so a log can tell the two
// apart. A failed read must be identifiable by the caller, never a raw
// rejection.
export class KvStoreReadError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'KvStoreReadError';
    this.cause = cause;
  }
}

// The store configuration an adapter supplies: which key the value lives
// under, how a raw stored value is parsed at the load boundary, and the
// optional cap applied before every write.
export interface KvSpec<T> {
  key: string;
  parse: (raw: unknown) => T;
  cap?: (value: T) => T;
}

// Keeps the last max keys (insertion order): the most recent entries survive
// the cap. Shared by the Record-shaped learning stores.
export function capKeys<T>(value: Record<string, T>, max: number): Record<string, T> {
  const keys = Object.keys(value);
  const trimmed = keys.length > max ? keys.slice(keys.length - max) : keys;
  const out: Record<string, T> = {};
  for (const k of trimmed) out[k] = value[k]!;
  return out;
}

// Keeps the last max entries in order. Shared by the list-shaped stores.
export function capTail<T>(entries: readonly T[], max: number): T[] {
  return entries.length > max ? entries.slice(entries.length - max) : [...entries];
}

// Read is wrapped in the typed read error. Parsing stays outside the try so a
// parser bug is not misreported as a storage failure; a missing, corrupted or
// hand-edited value reads as whatever parse decides (an empty value) — a
// broken store never keeps the feature from working.
export async function readKv<T>(spec: KvSpec<T>): Promise<T> {
  let raw: unknown;
  try {
    const result = await chrome.storage.local.get(spec.key);
    raw = result[spec.key];
  } catch (err) {
    throw new KvStoreReadError(`ストアの読み取りに失敗しました: ${spec.key}`, err);
  }
  return spec.parse(raw);
}

// The single write point: the cap runs before the write, so no path can grow
// the store past its cap. Raw chrome.storage rejections surface as
// KvStoreSaveError with the original failure as the cause.
export async function writeKv<T>(spec: KvSpec<T>, value: T): Promise<void> {
  const payload = spec.cap ? spec.cap(value) : value;
  try {
    await chrome.storage.local.set({ [spec.key]: payload });
  } catch (err) {
    throw new KvStoreSaveError(`ストアの保存に失敗しました: ${spec.key}`, err);
  }
}

// The single load-merge-write seam for the learning stores.
//
// Known limit (PBI-148): the load-merge-write window is not serialized across
// tabs. chrome.storage has no transactions, so two concurrent applies on the
// same key are last-writer-wins — one record can be lost. Acceptable for a
// single-user local extension; a competing writer would merge on
// `storage.onChanged` instead. (Consolidated here from the approval, assignment
// and mapping adapters, which used to carry one copy each.)
export async function upsertKv<T>(spec: KvSpec<T>, merge: (current: T) => T): Promise<void> {
  await writeKv(spec, merge(await readKv(spec)));
}
