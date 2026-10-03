import { validateAiSettings } from './settings';
import type { AiSettings, AiState, KeyPresence } from './types';

export interface StatusInput {
  settings: AiSettings;
  hasKey: KeyPresence;
  permitted: boolean;
  authFailed: boolean;
}

// Built-in AI availability comes from the Prompt API and is resolved by the caller.
export function computeCloudStatus(i: StatusInput): AiState {
  if (i.settings.provider !== 'openai' && i.settings.provider !== 'gemini') return 'disabled';
  if (validateAiSettings(i.settings, i.hasKey).length > 0) return 'not-configured';
  if (!i.permitted) return 'permission-missing';
  if (i.authFailed) return 'auth-error';
  return 'available';
}
