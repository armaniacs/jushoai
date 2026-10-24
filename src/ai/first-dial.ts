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

export async function loadConfirmedOrigins(): Promise<ConfirmedOrigin[]> {
  const result = await chrome.storage.local.get(CONFIRMED_ORIGINS_KEY);
  const raw = result[CONFIRMED_ORIGINS_KEY] as unknown;
  return Array.isArray(raw) ? raw.filter(isConfirmedOrigin) : [];
}

// Upsert the confirmation for one origin: the record is keyed by normalized
// origin (scheme://host[:port]), so a re-save of the same endpoint replaces it.
export async function confirmOrigin(origin: string, addresses: string[]): Promise<void> {
  const current = await loadConfirmedOrigins();
  const next = [
    ...current.filter((c) => c.origin !== origin),
    { origin, addresses: [...addresses], confirmedAt: Date.now() },
  ];
  await chrome.storage.local.set({ [CONFIRMED_ORIGINS_KEY]: next });
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
