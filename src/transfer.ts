// Transfer (PBI-117): export the stored profiles and addresses to one JSON
// file and import it back. The file is self-contained (profiles + addresses,
// no last-used state). The import reuses the load-boundary hardening
// (migrateData) and saves through the saveImported seam, which keeps the read,
// merge, cap check, and write closed over one read: a failed read interrupts
// the import instead of degrading storage to a full replacement, and the cap
// is checked against the pre-write merge result (saveData itself stays
// unchanged for normal saves).
import { MAX_ITEMS } from './core/collection';
import {
  normalizeAddress, normalizeProfile, validateAddress, validateProfile,
} from './core/profile';
import {
  EMPTY_ADDRESS, EMPTY_PROFILE, type Address, type Profile, type StoredData,
} from './core/types';
import {
  isQuotaExceededError, loadData, migrateData, pickKnown, saveImported, StorageReadError,
} from './storage';

export const TRANSFER_FILE_NAME = 'jushoai-profiles.json';

// Import size guard: the file is read whole (FileReader + JSON.parse), so a
// pathologically large pick would exhaust memory before any validation runs.
// Exports of 10 profiles + 10 addresses stay far below this.
export const TRANSFER_MAX_FILE_BYTES = 5 * 1024 * 1024;

export type TransferImportResult =
  | {
    ok: true;
    profilesAdded: number;
    profilesUpdated: number;
    addressesAdded: number;
    addressesUpdated: number;
  }
  | { ok: false; errors: string[] };

// The file carries profiles and addresses only: the last-used state is left
// out (a migrated context starts from profiles[0] per the existing
// initializer). Unknown keys are dropped here on purpose (WHY): a hand-edited
// entry's junk must not survive the export/import round trip. The load
// boundary keeps tolerating unknown keys — migrateData still preserves them —
// because startup must not break on version skew; the leniency is load-side
// only, and the export is the round-trip boundary.
export function toTransferJson(data: StoredData): string {
  const profiles = data.profiles.map((p) => pickKnown(EMPTY_PROFILE, p));
  const addresses = data.addresses.map((a) => pickKnown(EMPTY_ADDRESS, a));
  return JSON.stringify({ profiles, addresses }, null, 2);
}

export async function exportTransferFile(): Promise<string> {
  return toTransferJson(await loadData());
}

// Cap violations raised by the saveImported capCheck: they carry the
// user-facing messages and must not be conflated with storage failures.
class TransferCapError extends Error {
  constructor(readonly errors: string[]) {
    super('import would exceed the collection cap');
  }
}

const READ_FAILURE_MESSAGE = '保存済みのデータを読み込めなかったため、取り込みを中止しました';

const rawIds = (entries: unknown[]): string[] =>
  entries.flatMap((entry) => {
    const id = (entry as { id?: unknown } | null)?.id;
    return typeof id === 'string' && id !== '' ? [id] : [];
  });

// Validation order: parse, shape, read gate, defaults + ids (load-boundary
// hardening via migrateData with the storage ∪ file owner set), normalization
// (same shaping as the save path), validate, cap on the pre-write merge via
// the saveImported seam, save. Any violation rejects the whole file: no
// partial import ever lands in storage.
export async function importTransferFile(json: string): Promise<TransferImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['JSON を解析できませんでした。エクスポートしたファイルを選んでください'] };
  }
  const raw = parsed as { profiles?: unknown; addresses?: unknown };
  if (!Array.isArray(raw.profiles) || !Array.isArray(raw.addresses)) {
    return { ok: false, errors: ['JushoAI のエクスポートファイルではありません（profiles と addresses の配列が必要です）'] };
  }
  // Read gate (doubles as the breakdown baseline): a failed read of the stored
  // data interrupts here instead of letting the file pretend storage is empty,
  // which used to bypass the cap against the real contents.
  let latest: StoredData;
  try {
    latest = await loadData();
  } catch {
    return { ok: false, errors: [READ_FAILURE_MESSAGE] };
  }
  // Building a fresh { profiles, addresses } skips the legacy single-profile
  // fallback, so a stray profile key cannot sneak into an import. The owner
  // set is the union of storage and file profile ids: a partial file
  // (addresses only) keeps its link when the owner profile lives in storage.
  const migrated = migrateData(
    {
      profiles: raw.profiles as Partial<Profile>[],
      addresses: raw.addresses as Partial<Address>[],
    },
    new Set([...latest.profiles.map((p) => p.id), ...rawIds(raw.profiles)]),
  );
  const profiles = migrated.profiles.map(normalizeProfile);
  const addresses = migrated.addresses.map(normalizeAddress);
  if (profiles.length === 0 && addresses.length === 0) {
    return { ok: false, errors: ['取り込めるデータがありません（プロファイルと住所が空です）'] };
  }
  const errors: string[] = [];
  profiles.forEach((p, i) => {
    for (const e of validateProfile(p)) errors.push(`${p.label || `プロファイル${i + 1}`}: ${e}`);
  });
  addresses.forEach((a, i) => {
    for (const e of validateAddress(a)) errors.push(`${a.label || `住所${i + 1}`}: ${e}`);
  });
  if (errors.length > 0) return { ok: false, errors };
  // Breakdown for the success message: the file's entries split by whether
  // their id already exists in storage. Computed from the pre-read snapshot,
  // so a concurrent write between here and the save can only skew the labels,
  // never the stored data (the cap is checked authoritatively in the seam).
  const storedProfileIds = new Set(latest.profiles.map((p) => p.id));
  const storedAddressIds = new Set(latest.addresses.map((a) => a.id));
  const profilesAdded = profiles.filter((p) => !storedProfileIds.has(p.id)).length;
  const profilesUpdated = profiles.length - profilesAdded;
  const addressesAdded = addresses.filter((a) => !storedAddressIds.has(a.id)).length;
  const addressesUpdated = addresses.length - addressesAdded;
  // The cap applies to what storage will hold after the merge: the seam checks
  // the pre-write merge result, so a re-import of the same ids at the cap
  // stays legal and unknown ids push it over and are refused before anything
  // is written.
  try {
    await saveImported({ profiles, addresses }, (payload) => {
      const capErrors: string[] = [];
      if (payload.profiles.length > MAX_ITEMS) {
        capErrors.push(`プロファイルは${MAX_ITEMS}件までです（取り込み後 ${payload.profiles.length} 件になります）`);
      }
      if (payload.addresses.length > MAX_ITEMS) {
        capErrors.push(`住所は${MAX_ITEMS}件までです（取り込み後 ${payload.addresses.length} 件になります）`);
      }
      if (capErrors.length > 0) throw new TransferCapError(capErrors);
    });
  } catch (err) {
    if (err instanceof TransferCapError) return { ok: false, errors: err.errors };
    if (err instanceof StorageReadError) return { ok: false, errors: [READ_FAILURE_MESSAGE] };
    return {
      ok: false,
      errors: [isQuotaExceededError(err)
        ? '取り込んだデータの保存に失敗しました。storage の容量が不足しています'
        : '取り込んだデータの保存に失敗しました'],
    };
  }
  return { ok: true, profilesAdded, profilesUpdated, addressesAdded, addressesUpdated };
}
