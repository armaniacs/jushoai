import { IS_FIREFOX } from './browser-target';
import { DOH_PERMISSION_PATTERN, originPattern } from './settings';
import { GEMINI_ORIGIN, type AiSettings } from './types';

export interface PermissionsQuery {
  origins: string[];
  data_collection?: string[];
}

export interface PermissionsApi {
  contains(query: PermissionsQuery): Promise<boolean>;
  request(query: PermissionsQuery): Promise<boolean>;
}

// Firefox MV3 grants the content-script hosts at install, so the origin prompt alone may never show;
// the optional websiteContent data-collection grant is what makes the user consent before field metadata is sent.
function queryFor(origins: string[], isFirefox: boolean): PermissionsQuery {
  return isFirefox ? { origins, data_collection: ['websiteContent'] } : { origins };
}

export function originPatternsFor(s: AiSettings): string[] {
  if (s.provider === 'gemini') return [GEMINI_ORIGIN];
  if (s.provider === 'openai') {
    const pattern = originPattern(s.openai.baseUrl);
    return pattern ? [pattern] : [];
  }
  return [];
}

// The dial-time gate resolves the saved base URL through the pinned DoH origin
// (DOH_ORIGIN / DOH_PERMISSION_PATTERN in settings.ts), so the permissions a cloud
// provider needs are the connection origin plus the resolver origin. Providers that
// use no network (none / built-in) need neither.
export function requiredHostOrigins(s: AiSettings): string[] {
  const provider = originPatternsFor(s);
  return provider.length === 0 ? [] : [...provider, DOH_PERMISSION_PATTERN];
}

export async function hasHostPermission(
  origins: string[],
  api: PermissionsApi = chrome.permissions as PermissionsApi,
  isFirefox: boolean = IS_FIREFOX,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.contains(queryFor(origins, isFirefox));
  } catch {
    return false;
  }
}

// Must be called from a user gesture (the options page save button).
export async function requestHostPermission(
  origins: string[],
  api: PermissionsApi = chrome.permissions as PermissionsApi,
  isFirefox: boolean = IS_FIREFOX,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.request(queryFor(origins, isFirefox));
  } catch {
    return false;
  }
}
