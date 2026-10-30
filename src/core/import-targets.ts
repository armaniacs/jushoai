// Import target selection (PBI-173): which first card receives a page import.
// Pure — DOM-free and id-free. The caller injects fresh ids (newId is
// non-deterministic, so it stays outside); EMPTY defaults and the '自宅' /
// '新規' labels live here so the options handler is a single call.
// Blankness is a key set, never a slice position: the profile set is the
// options card rows (id/label/gender never render as text rows), and the
// address label is not a form value — a card with only its default label
// still counts as blank, so the import fills it instead of forking.

import { OPTIONS_ADDRESS_FIELDS, OPTIONS_PROFILE_FIELDS } from './field-catalog';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from './types';
import type { Address, Profile } from './types';
import type { ImportTargets } from './import-apply';

export interface ImportTargetIds {
  profileId: string;
  addressId: string;
}

const PROFILE_BLANK_KEYS = OPTIONS_PROFILE_FIELDS.map((f) => f.key);
const ADDRESS_BLANK_KEYS = OPTIONS_ADDRESS_FIELDS.filter((f) => f.key !== 'label').map((f) => f.key);

// Single reference for blankness (PBI-182): the trial fill reuses these keys
// instead of hand-written arrays. Note the prefecture divergence, kept as-is
// pending spec confirmation (do NOT unify by guess): OPTIONS_ADDRESS_FIELDS
// already drops the prefecture select row, so ADDRESS_BLANK_KEYS omits
// prefecture, while the trial fill still covers prefecture (see main.ts).
export { PROFILE_BLANK_KEYS, ADDRESS_BLANK_KEYS };

const isBlankProfile = (p: Profile): boolean =>
  PROFILE_BLANK_KEYS.every((key) => (p[key] ?? '').trim() === '');

const isBlankAddress = (a: Address): boolean =>
  ADDRESS_BLANK_KEYS.every((key) => (a[key] ?? '').trim() === '');

export { isBlankProfile, isBlankAddress };

export function selectImportTargets(
  profiles: readonly Profile[],
  addresses: readonly Address[],
  ids: ImportTargetIds,
): ImportTargets {
  const first = profiles[0];
  const blankProfile = first === undefined || isBlankProfile(first);
  const target = blankProfile
    ? first ?? { ...EMPTY_PROFILE, id: ids.profileId }
    : { ...EMPTY_PROFILE, id: ids.profileId, label: '新規' };
  const firstAddress = addresses[0];
  const blankAddress = firstAddress === undefined || isBlankAddress(firstAddress);
  const targetAddress = blankAddress
    ? firstAddress ?? { ...EMPTY_ADDRESS, id: ids.addressId, label: '自宅' }
    : { ...EMPTY_ADDRESS, id: ids.addressId, label: '新規' };
  return { target, targetAddress, blankProfile, blankAddress };
}
