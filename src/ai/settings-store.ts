import {
  decryptSecret, encryptSecret, isEnvelope, type Envelope, type KeyStore,
} from './secret-store';
import { normalizeAiSettings } from './settings';
import type { AiSettings, PublicAiSettings } from './types';

export const AI_SETTINGS_KEY = 'jushoai:ai-settings';

const KEYED = ['openai', 'gemini'] as const;
type Keyed = (typeof KEYED)[number];

// undefined keeps the stored key, an empty string deletes it, anything else replaces it.
export type KeyUpdate = Partial<Record<Keyed, string>>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

async function readStored(): Promise<{ settings: AiSettings; keys: Partial<Record<Keyed, Envelope>> }> {
  const result = await chrome.storage.local.get(AI_SETTINGS_KEY);
  const raw = result[AI_SETTINGS_KEY] as unknown;
  const rec = isRecord(raw) ? raw : {};
  const keys: Partial<Record<Keyed, Envelope>> = {};
  for (const p of KEYED) {
    const section = rec[p];
    if (isRecord(section) && isEnvelope(section.apiKey)) keys[p] = section.apiKey;
  }
  return { settings: normalizeAiSettings(raw), keys };
}

export async function loadPublicAiSettings(): Promise<PublicAiSettings> {
  const { settings, keys } = await readStored();
  return { ...settings, hasKey: { openai: keys.openai !== undefined, gemini: keys.gemini !== undefined } };
}

export async function loadAiSecrets(ks: KeyStore): Promise<Partial<Record<Keyed, string>>> {
  const { keys } = await readStored();
  const out: Partial<Record<Keyed, string>> = {};
  for (const p of KEYED) {
    const env = keys[p];
    if (!env) continue;
    try {
      out[p] = await decryptSecret(env, ks);
    } catch {
      // A key that can no longer be decrypted counts as unset so the user is asked to re-enter it.
    }
  }
  return out;
}

export async function saveAiSettings(settings: AiSettings, update: KeyUpdate, ks: KeyStore): Promise<void> {
  const normalized = normalizeAiSettings(settings);
  const { keys } = await readStored();
  const next = { ...keys };
  for (const p of KEYED) {
    const u = update[p];
    if (u === undefined) continue;
    if (u === '') delete next[p];
    else next[p] = await encryptSecret(u, ks);
  }
  await chrome.storage.local.set({
    [AI_SETTINGS_KEY]: {
      provider: normalized.provider,
      openai: { ...normalized.openai, ...(next.openai ? { apiKey: next.openai } : {}) },
      gemini: { ...normalized.gemini, ...(next.gemini ? { apiKey: next.gemini } : {}) },
    },
  });
}
