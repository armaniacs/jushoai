import { needsKeyReentry, resolveOpenAiToSave } from './key-reentry';
import { requestHostPermission, requiredHostOrigins } from './permissions';
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
  | { ok: false; message: string };

// The staged settings-save pipeline: normalize → key re-entry → lexical
// validation → permission → resolved-address gate → persist → presence
// re-read. The order is executable structure, not comments: the permission
// prompt needs the click's user gesture, so it stays the first await, and the
// resolved gate runs after it (a granted origin is harmless because send()
// re-checks the resolved address anyway). Both a confirmed internal resolution
// and an unresolvable endpoint reject the save (fail-closed).
export async function saveSettings(draft: SaveDraft, deps: SaveDeps): Promise<SaveResult> {
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
    return { ok: false, message: 'ベース URL を変更したため、API キーを入力し直してください（保存済みのキーは別のホストに送られません）。' };
  }
  const errors = validateAiSettings(normalized, effective);
  if (errors.length > 0) {
    return { ok: false, message: errors.join(' / ') };
  }
  // The permission prompt needs the click's user gesture, so it must be the first await.
  // The dial-time gate resolves through the pinned DoH origin, so the request covers the
  // connection origin and the resolver origin (requiredHostOrigins).
  const origins = requiredHostOrigins(normalized);
  const granted = origins.length === 0 ? true : await requestHostPermission(origins);
  // Save-time parity with the dial-time gate: a name that resolves into a private range
  // must not reach the store. It runs after the prompt for the gesture reason above; a
  // granted origin is harmless because send() re-checks the resolved address anyway.
  const resolved = await validateAiSettingsResolved(
    normalized,
    effective,
    { fetch: deps.fetch },
  );
  if (resolved.errors.length > 0) {
    return { ok: false, message: resolved.errors.join(' / ') };
  }
  try {
    await saveAiSettings(normalized, update, deps.keyStore);
  } catch {
    return { ok: false, message: '保存に失敗しました。もう一度お試しください。' };
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
    return { ok: false, message: '保存しましたが、保存状態の再読み込みに失敗しました。設定ページを開き直してください。' };
  }
}
