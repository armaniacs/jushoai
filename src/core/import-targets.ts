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

// Blank key sets (PBI-182): the single reference for blankness, shared by the
// page import and the trial fill. ADDRESS_BLANK_KEYS derives from
// OPTIONS_ADDRESS_FIELDS, which drops the prefecture select row (a select, not
// a plain-text row), so the set omits prefecture; the label row is filtered
// out because a card with only its default label still counts as blank.
export { PROFILE_BLANK_KEYS, ADDRESS_BLANK_KEYS };

// Whether prefecture counts toward blankness is a required caller choice
// (PBI-220), not a default: the import path passes
// { includePrefecture: false } (selectImportTargets below) and the trial fill
// passes { includePrefecture: true } (applyTrialSampleToAddress in
// options/main.ts). Unifying the two is out of scope pending a separate
// user-judged PBI: this type only moves the branch location from comments
// into the signature, behavior is unchanged.
export interface BlankAddressOptions {
  includePrefecture: boolean;
}

// Single-field prefecture blankness (PBI-220 follow-up): the trial fill checks
// only this field, so it calls this helper directly instead of synthesizing a
// mostly-blank card for isBlankAddress. isBlankAddress with
// { includePrefecture: true } delegates here, so both stay one definition.
export const isPrefectureBlank = (prefecture: string): boolean =>
  (prefecture ?? '').trim() === '';

const isBlankProfile = (p: Profile): boolean =>
  PROFILE_BLANK_KEYS.every((key) => (p[key] ?? '').trim() === '');

// isBlankProfile takes no options: the profile side has no select-row
// divergence, so the asymmetry with isBlankAddress is intended.
const isBlankAddress = (a: Address, opts: BlankAddressOptions): boolean => {
  if (!ADDRESS_BLANK_KEYS.every((key) => (a[key] ?? '').trim() === '')) {
    return false;
  }
  return opts.includePrefecture ? isPrefectureBlank(a.prefecture) : true;
};

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
  // The page import does not count prefecture toward blankness
  // ({ includePrefecture: false }); the trial fill chooses true at its own
  // call site. Kept divergent pending a separate user-judged spec PBI
  // (do NOT unify by guess).
  const blankAddress = firstAddress === undefined || isBlankAddress(firstAddress, { includePrefecture: false });
  const targetAddress = blankAddress
    ? firstAddress ?? { ...EMPTY_ADDRESS, id: ids.addressId, label: '自宅' }
    : { ...EMPTY_ADDRESS, id: ids.addressId, label: '新規' };
  return { target, targetAddress, blankProfile, blankAddress };
}
