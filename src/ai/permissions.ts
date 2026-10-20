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
  // Optional so existing fakes (contains/request only) keep typechecking;
  // removeHostPermission treats a missing implementation as a no-op.
  remove?(query: PermissionsQuery): Promise<boolean>;
}

// Firefox MV3 grants the content-script hosts at install, so the origin prompt alone may never show;
// the optional websiteContent data-collection grant is what makes the user consent before field metadata is sent.
function queryFor(origins: string[], isFirefox: boolean): PermissionsQuery {
  return isFirefox ? { origins, data_collection: ['websiteContent'] } : { origins };
}

// Single owner of the chrome.permissions access (PBI-61): the three callers
// below take this as their default instead of casting inline, so a future
// fake or wrapper only changes this one place.
function permissionsApi(): PermissionsApi {
  return chrome.permissions as PermissionsApi;
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
  api: PermissionsApi = permissionsApi(),
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
  api: PermissionsApi = permissionsApi(),
  isFirefox: boolean = IS_FIREFOX,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.request(queryFor(origins, isFirefox));
  } catch {
    return false;
  }
}

// Best-effort rollback for origins granted during a save that was then
// rejected (resolved-address gate, persist failure). A missing remove
// implementation or a denied removal is a silent no-op; the save already
// failed, so this must never change its outcome.
export async function removeHostPermission(
  origins: string[],
  api: PermissionsApi = permissionsApi(),
  isFirefox: boolean = IS_FIREFOX,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return (await api.remove?.(queryFor(origins, isFirefox))) ?? false;
  } catch {
    return false;
  }
}
