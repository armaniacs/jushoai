import type { Address } from './types';

// Session selection resolvers shared by storage-backed callers and the
// fill session. This module must stay pure: no DOM, no LLM, no chrome API.
// (Moved verbatim from src/storage.ts by PBI-90 so that content-session can
// depend on selection logic without importing the chrome.storage module.)

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
