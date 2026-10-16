import { needsKeyReentry, resolveOpenAiToSave } from './key-reentry';
import { hasHostPermission, removeHostPermission, requestHostPermission, requiredHostOrigins } from './permissions';
import type { IdbKeyStore } from './secret-store';
import { loadPublicAiSettings, saveAiSettings, type KeyUpdate } from './settings-store';
import { normalizeAiSettings, validateAiSettings, validateAiSettingsResolved } from './settings';
import type { AiSettings, KeyPresence } from './types';

const KEYED = ['openai', 'gemini'] as const;
type KeyedProvider = (typeof KEYED)[number];

// Everything the save ceremony reads from the settings form. Only presence
// (KeyPresence) travels here; key bodies stay in KeyUpdate/saveAiSettings.
export interface SaveDraft {
  settings: AiSettings;
  hasKey: KeyPresence;
  keyInput: Record<KeyedProvider, string>;
  removeKey: Record<KeyedProvider, boolean>;
  savedOpenAi: { baseUrl: string; model: string };
}

export interface SaveDeps {
  keyStore: IdbKeyStore;
  fetch: typeof fetch;
}

export type SaveResult =
  | {
    ok: true;
    settings: AiSettings;
    savedOpenAi: { baseUrl: string; model: string };
    hasKey: KeyPresence;
    permissionGranted: boolean;
  }
  | { ok: false; message: string; rolledBack: boolean };

// The staged settings-save pipeline: normalize → key re-entry → lexical
// validation → permission → resolved-address gate → persist → presence
// re-read. The order is executable structure, not comments: the permission
// prompt needs the click's user gesture, so it stays the first await, and the
// resolved gate runs after it (a granted origin is harmless because send()
// re-checks the resolved address anyway). Both a confirmed internal resolution
// and an unresolvable endpoint reject the save (fail-closed).
//
// The gesture/completion split below makes the order a type fact: completing
// without the gesture stage does not typecheck (PermissionGrant is branded and
// only requestSavePermission mints it), and rollback observability rides the
// failure result instead of console.warn alone.
export interface SavePlan {
  normalized: AiSettings;
  update: KeyUpdate;
  effective: KeyPresence;
}

// Pure prefix of the pipeline: normalize → key re-entry → lexical validation.
// Returns the plan or the user-facing rejection; no I/O, no permission prompt.
export function planSave(draft: SaveDraft): SavePlan | { message: string } {
  const update: KeyUpdate = {};
  for (const p of KEYED) {
    if (draft.removeKey[p]) update[p] = '';
    else if (draft.keyInput[p] !== '') update[p] = draft.keyInput[p];
  }
  const effective: KeyPresence = {
    openai: !draft.removeKey.openai && (draft.hasKey.openai || draft.keyInput.openai !== ''),
    gemini: !draft.removeKey.gemini && (draft.hasKey.gemini || draft.keyInput.gemini !== ''),
  };
  const normalized = normalizeAiSettings({
    ...draft.settings,
    openai: resolveOpenAiToSave(draft.settings.provider, draft.settings.openai, draft.savedOpenAi),
  });
  if (
    normalized.provider === 'openai' &&
    needsKeyReentry({
      savedBaseUrl: draft.savedOpenAi.baseUrl,
      newBaseUrl: normalized.openai.baseUrl,
      hadKey: draft.hasKey.openai,
      typedKey: draft.keyInput.openai,
      removing: draft.removeKey.openai,
    })
  ) {
    return { message: 'ベース URL を変更したため、API キーを入力し直してください（保存済みのキーは別のホストに送られません）。' };
  }
  const errors = validateAiSettings(normalized, effective);
  if (errors.length > 0) {
    return { message: errors.join(' / ') };
  }
  return { normalized, update, effective };
}

const grantBrand: unique symbol = Symbol('PermissionGrant');

// Proof that the gesture stage ran: only requestSavePermission mints it, so
// completing without prompting does not typecheck (fabricating one needs a
// deliberate cast).
export interface PermissionGrant {
  readonly origins: string[];
  readonly granted: boolean;
  readonly alreadyGranted: boolean;
  readonly [grantBrand]: true;
}

// Gesture stage. Must run inside the click's user gesture: the permission
// prompt needs it, so this stays the first await of the pipeline.
export async function requestSavePermission(plan: SavePlan): Promise<PermissionGrant> {
  // The dial-time gate resolves through the pinned DoH origin, so the request covers the
  // connection origin and the resolver origin (requiredHostOrigins).
  const origins = requiredHostOrigins(plan.normalized);
  const alreadyGranted = await hasHostPermission(origins);
  const granted = origins.length === 0 ? true : await requestHostPermission(origins);
  return { origins, granted, alreadyGranted, [grantBrand]: true as const };
}

// Completion stage: resolved-address gate → persist → presence re-read.
// Rolls back only what this save granted and reports it on failure.
export async function completeSave(plan: SavePlan, grant: PermissionGrant, deps: SaveDeps): Promise<SaveResult> {
  const { normalized, update, effective } = plan;
  const { origins, granted, alreadyGranted } = grant;
  // Only roll back what this save granted: a failed save must never strip a
  // working setup's pre-existing permission. The outcome rides the failure
  // result; a failed removal is additionally warned, so a lingering rejected
  // origin stays detectable instead of silent.
  const rollback = async (): Promise<boolean> => {
    // Nothing was ever requested, so there is nothing to take back (and no
    // warning to raise).
    if (origins.length === 0 || alreadyGranted) return false;
    try {
      if (await removeHostPermission(origins)) return true;
    } catch { /* a hostile permissions api must not change the rejected outcome */ }
    console.warn('[JushoAI] permission rollback failed for', origins);
    return false;
  };
  // Save-time parity with the dial-time gate: a name that resolves into a private range
  // must not reach the store. It runs after the prompt for the gesture reason above; a
  // granted origin is harmless because send() re-checks the resolved address anyway.
  const resolved = await validateAiSettingsResolved(
    normalized,
    effective,
    { fetch: deps.fetch },
  );
  if (resolved.errors.length > 0) {
    // The permission above was already granted: roll it back so a rejected
    // origin does not linger in optional_host_permissions.
    const rolledBack = await rollback();
    return { ok: false, message: resolved.errors.join(' / '), rolledBack };
  }
  try {
    await saveAiSettings(normalized, update, deps.keyStore);
  } catch {
    const rolledBack = await rollback();
    return { ok: false, message: '保存に失敗しました。もう一度お試しください。', rolledBack };
  }
  // The store drops a kept key when the origin changed, so presence is re-read instead of assumed.
  try {
    const hasKey = (await loadPublicAiSettings()).hasKey;
    return {
      ok: true,
      settings: normalized,
      savedOpenAi: { ...normalized.openai },
      hasKey,
      permissionGranted: granted,
    };
  } catch {
    return { ok: false, message: '保存しましたが、保存状態の再読み込みに失敗しました。設定ページを開き直してください。', rolledBack: false };
  }
}

export async function saveSettings(draft: SaveDraft, deps: SaveDeps): Promise<SaveResult> {
  // Sole production entry: keeps existing callers (options page) and their
  // tests untouched. The token seam above exists for future callers; nothing
  // here bypasses the gesture stage.
  const planned = planSave(draft);
  if ('message' in planned) return { ok: false, ...planned, rolledBack: false };
  const grant = await requestSavePermission(planned);
  return completeSave(planned, grant, deps);
}
