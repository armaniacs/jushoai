import { validateAddress, validateProfile } from '../../core/profile';
import type { Address, Profile } from '../../core/types';

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
