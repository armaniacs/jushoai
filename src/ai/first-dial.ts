import { readKv, upsertKv, type KvSpec } from '../kv-store';
import { originOf } from './key-reentry';

// First-dial confirmation (trust-on-first-use) for user-configured cloud endpoints.
//
// The egress gate resolves the endpoint through the pinned DoH origin, but the
// dial itself re-resolves through the platform resolver — a check-to-use gap the
// gate cannot close within one attempt (MV3 fetch cannot pin an IP). The
// first-dial gate adds the layer MV3 can enforce: nothing dials a cloud origin
// until the user has explicitly confirmed it in the settings page, where the
// DoH-confirmed address set is shown before approval.
//
// The record is chrome.storage.local, which only this extension writes (MV3
// isolates storage.local), so the confirmation survives service-worker restarts
// and cannot be forged by a page.

export const CONFIRMED_ORIGINS_KEY = 'jushoai:ai-confirmed-origins';

export interface ConfirmedOrigin {
  origin: string;
  addresses: string[];
  confirmedAt: number;
}

export type FirstDialVerdict = { ok: true } | { ok: false; reason: 'unconfirmed' };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function isConfirmedOrigin(v: unknown): v is ConfirmedOrigin {
  return (
    isRecord(v) && typeof v.origin === 'string' && v.origin !== '' &&
    Array.isArray(v.addresses) && v.addresses.every((a) => typeof a === 'string') &&
    typeof v.confirmedAt === 'number'
  );
}

// The confirmed-origin record is a small chrome.storage-backed store, so it
// goes through kv-store (PBI-153): kv-store owns the storage round trips and
// the typed error mode. No cap: the record grows only through the user's
// explicit approval in the settings page (VULN-001), so capping here would
// change the security fix's behavior.
const CONFIRMED_ORIGINS_SPEC: KvSpec<ConfirmedOrigin[]> = {
  key: CONFIRMED_ORIGINS_KEY,
  parse: (raw) => (Array.isArray(raw) ? raw.filter(isConfirmedOrigin) : []),
};

export async function loadConfirmedOrigins(): Promise<ConfirmedOrigin[]> {
  return readKv(CONFIRMED_ORIGINS_SPEC);
}

// Upsert the confirmation for one origin: the record is keyed by normalized
// origin (scheme://host[:port]), so a re-save of the same endpoint replaces it.
export async function confirmOrigin(origin: string, addresses: string[]): Promise<void> {
  await upsertKv(CONFIRMED_ORIGINS_SPEC, (current) => [
    ...current.filter((c) => c.origin !== origin),
    { origin, addresses: [...addresses], confirmedAt: Date.now() },
  ]);
}

export async function isOriginConfirmed(origin: string): Promise<boolean> {
  return (await loadConfirmedOrigins()).some((c) => c.origin === origin);
}

// Sole production gate: classify/test dial a cloud origin only after this says ok.
// The origin is normalized the same way as the key re-entry check (full origin,
// port included), so a port change counts as a new origin to confirm.
export function createFirstDialGate(
  deps: { load?: typeof loadConfirmedOrigins } = {},
): (origin: string) => Promise<FirstDialVerdict> {
  const load = deps.load ?? loadConfirmedOrigins;
  return async (origin: string): Promise<FirstDialVerdict> => {
    if (originOf(origin) === null) return { ok: false, reason: 'unconfirmed' };
    const confirmed = await load();
    return confirmed.some((c) => c.origin === originOf(origin)) ? { ok: true } : { ok: false, reason: 'unconfirmed' };
  };
}
