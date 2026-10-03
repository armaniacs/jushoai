import { originPattern } from './settings';
import { GEMINI_ORIGIN, type AiSettings } from './types';

export interface PermissionsApi {
  contains(query: { origins: string[] }): Promise<boolean>;
  request(query: { origins: string[] }): Promise<boolean>;
}

export function originPatternsFor(s: AiSettings): string[] {
  if (s.provider === 'gemini') return [GEMINI_ORIGIN];
  if (s.provider === 'openai') {
    const pattern = originPattern(s.openai.baseUrl);
    return pattern ? [pattern] : [];
  }
  return [];
}

export async function hasHostPermission(
  origins: string[],
  api: PermissionsApi = chrome.permissions,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.contains({ origins });
  } catch {
    return false;
  }
}

// Must be called from a user gesture (the options page save button).
export async function requestHostPermission(
  origins: string[],
  api: PermissionsApi = chrome.permissions,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.request({ origins });
  } catch {
    return false;
  }
}
