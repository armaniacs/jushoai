import { PROVIDER_KINDS, type ProviderKind } from './types';

// Replaced at build time by WXT. Vitest has no such define, so tests run as the non-Firefox build.
export const IS_FIREFOX = import.meta.env.FIREFOX === true;

// Firefox has no Prompt API (LanguageModel), so the built-in provider can never work there.
export function selectableProviders(isFirefox: boolean = IS_FIREFOX): readonly ProviderKind[] {
  return isFirefox ? PROVIDER_KINDS.filter((p) => p !== 'built-in') : PROVIDER_KINDS;
}
