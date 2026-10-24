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

// Batch read (PBI-159): one chrome.storage.local.get([keys...]) call for N
// specs. The single reads it replaces each paid their own IPC round trip, so a
// flow that needs several stores paid N calls and hand-assembled the bundle at
// the entry point. Parsing stays per spec at the load boundary (the readKv
// policy), and one failed get is ONE typed read failure for the whole bundle —
// never a raw rejection. Tuple overloads keep the parsed shapes inferred per
// position, so callers destructure typed values.
export async function readKvBatch<A>(specs: readonly [KvSpec<A>]): Promise<[A]>;
export async function readKvBatch<A, B>(specs: readonly [KvSpec<A>, KvSpec<B>]): Promise<[A, B]>;
export async function readKvBatch<A, B, C>(
  specs: readonly [KvSpec<A>, KvSpec<B>, KvSpec<C>],
): Promise<[A, B, C]>;
export async function readKvBatch<A, B, C, D>(
  specs: readonly [KvSpec<A>, KvSpec<B>, KvSpec<C>, KvSpec<D>],
): Promise<[A, B, C, D]>;
export async function readKvBatch<A, B, C, D, E>(
  specs: readonly [KvSpec<A>, KvSpec<B>, KvSpec<C>, KvSpec<D>, KvSpec<E>],
): Promise<[A, B, C, D, E]>;
export async function readKvBatch(specs: readonly KvSpec<unknown>[]): Promise<unknown[]> {
  const keys = specs.map((spec) => spec.key);
  let result: Record<string, unknown>;
  try {
    result = await chrome.storage.local.get(keys);
  } catch (err) {
    throw new KvStoreReadError(`ストアの一括読み取りに失敗しました: ${keys.join(', ')}`, err);
  }
  return specs.map((spec) => spec.parse(result[spec.key]));
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
