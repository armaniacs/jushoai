import { validateAddress, validateProfile } from '../../core/profile';
import type { Address, Profile } from '../../core/types';
import { ADDRESSES_SECTION_ID, PROFILES_SECTION_ID } from './nav';

export function hasValidProfile(profiles: readonly Profile[]): boolean {
  return profiles.some((p) => validateProfile(p).length === 0);
}

export function hasValidAddress(addresses: readonly Address[]): boolean {
  return addresses.some((a) => validateAddress(a).length === 0);
}

export function profileErrorsFor(profiles: readonly Profile[]): string[] {
  return profiles.flatMap((p, i) =>
    validateProfile(p).map((e) => `${p.label || `プロファイル${i + 1}`}: ${e}`));
}

export function addressErrorsFor(addresses: readonly Address[]): string[] {
  return addresses.flatMap((a) =>
    validateAddress(a).map((e) => `${a.label || '住所'}: ${e}`));
}

export function trialToastText(p: Profile, a: Address): string {
  return `架空の名前として${p.lastName} ${p.firstName}さん（${a.prefecture}${a.city}在住）を作りました`;
}

// Which sides still need a valid entry (inputs must be normalized first,
// like the other helpers here). Drives guide visibility and the trial
// button selection: 'none' hides the guide.
export type TrialMode = 'both' | 'profile' | 'address' | 'none';

export function guideTrialMode(profiles: readonly Profile[], addresses: readonly Address[]): TrialMode {
  const okProfile = hasValidProfile(profiles);
  const okAddress = hasValidAddress(addresses);
  if (okProfile && okAddress) return 'none';
  if (!okProfile && !okAddress) return 'both';
  return !okProfile ? 'profile' : 'address';
}

// Single owner of guide visibility: trial mode plus the page/dismissed gates.
// Inputs must be normalized first, like guideTrialMode.
export interface GuideState {
  visible: boolean;
  mode: TrialMode;
}

export function guideState(
  profiles: readonly Profile[],
  addresses: readonly Address[],
  page: string,
  dismissed: boolean,
): GuideState {
  const mode = guideTrialMode(profiles, addresses);
  const relevant = page === PROFILES_SECTION_ID || page === ADDRESSES_SECTION_ID;
  return { visible: !dismissed && relevant && mode !== 'none', mode };
}
