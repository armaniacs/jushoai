// Import apply (PBI-127): the normalize/validate step the import draft must
// pass before it becomes a form draft. The draft rides the existing validators
// — a field is taken only when its value introduces no validation error
// beyond the baseline the form already reports (BDD: JushoAIの正規化・
// バリデーションを通った項目だけ下書きになり確定前は保存されない).

import { normalizeAddress, normalizeProfile, validateAddress, validateProfile } from './profile';
import type { Address, Profile } from './types';
import type { ImportDraft } from './import-draft';

export interface ImportApplyResult {
  profile: Profile;
  address: Address;
  // How many draft values became form values, and how many the validators
  // dropped. The messages stay with the caller; the counts keep the display
  // truthful without leaking values.
  taken: number;
  dropped: number;
}

// A field passes when its own errors are a subset of the baseline's AND the
// normalized value is non-empty: the validators are whole-object, but a value
// the normalization erases (a tel of letters → digits → '') must not inflate
// the taken count as a silent no-op.
const passes = (errors: string[], baseline: string[], value: string): boolean =>
  !errors.some((e) => !baseline.includes(e)) && value.trim() !== '';

export function applyImportDraft(
  base: Profile,
  baseAddress: Address,
  draft: ImportDraft,
): ImportApplyResult {
  const normBase = normalizeProfile(base);
  const normBaseAddress = normalizeAddress(baseAddress);
  const baseline = validateProfile(normBase);
  const baselineAddress = validateAddress(normBaseAddress);

  let profile = normBase;
  let address = normBaseAddress;
  let taken = 0;
  let dropped = 0;

  for (const [key, raw] of Object.entries(draft.profile) as [keyof Profile, string][]) {
    const candidate = normalizeProfile({ ...normBase, [key]: raw });
    if (!passes(validateProfile(candidate), baseline, candidate[key])) {
      dropped += 1;
      continue;
    }
    profile = { ...profile, [key]: candidate[key] };
    taken += 1;
  }
  for (const [key, raw] of Object.entries(draft.address) as [keyof Address, string][]) {
    const candidate = normalizeAddress({ ...normBaseAddress, [key]: raw });
    if (!passes(validateAddress(candidate), baselineAddress, candidate[key])) {
      dropped += 1;
      continue;
    }
    address = { ...address, [key]: candidate[key] };
    taken += 1;
  }
  return { profile, address, taken, dropped };
}
