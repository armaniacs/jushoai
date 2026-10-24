// Guest profile (PBI-144): a one-shot profile/address built from the typed
// values for a fill the user does not want to save (代理入力・一時利用). The
// guest REPLACES the stored data for that fill — stored and guest values never
// mix, so a partially typed guest leaves the omitted rows empty and the
// preview shows exactly what will fill. The overlay never writes back:
// chrome.storage is never touched, and the values die with the tab.

import { EMPTY_ADDRESS, EMPTY_PROFILE } from './types';
import type { Address, Profile } from './types';

export interface GuestValues {
  profile: Partial<Record<keyof Profile, string>>;
  address: Partial<Record<keyof Address, string>>;
}

const GUEST_ID = 'guest';

function overlay<T extends Profile | Address>(base: T, values: Partial<Record<keyof T, string>>): T {
  const out = { ...base };
  for (const [key, raw] of Object.entries(values)) {
    const value = raw.trim();
    if (value) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function guestProfile(guest: GuestValues): Profile {
  return overlay({ ...EMPTY_PROFILE, id: GUEST_ID, label: 'ゲスト' }, guest.profile);
}

export function guestAddress(guest: GuestValues): Address {
  return overlay({ ...EMPTY_ADDRESS, id: GUEST_ID, label: 'ゲスト', profileId: GUEST_ID }, guest.address);
}
