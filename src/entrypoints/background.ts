import { hasHostPermission } from '../ai/permissions';
import { IdbKeyStore, type KeyStore } from '../ai/secret-store';
import { AI_SETTINGS_KEY, loadAiSecrets, loadPublicAiSettings } from '../ai/settings-store';
import type { ProviderKind } from '../ai/types';
import { getLanguageModel } from '../llm/availability';
import { handleMessage } from '../llm/handle-message';
import { parseRequest } from '../messages';

export default defineBackground(() => {
  const keyStore = new IdbKeyStore();
  // The KEK never changes after creation, so the IndexedDB round-trip is cached per SW lifetime.
  const cachedKeyStore: KeyStore = {
    getKey: (() => {
      let key: Promise<CryptoKey> | null = null;
      return () => (key ??= keyStore.getKey());
    })(),
  };
  const authFailed = new Set<ProviderKind>();
  const compat = new Set<ProviderKind>();
  let secretsPromise: Promise<{ openai?: string; gemini?: string }> | null = null;
  const loadSecrets = () => (secretsPromise ??= loadAiSecrets(cachedKeyStore));

  // Changing the settings (a new key, another provider) gives a failed or compat-mode provider a fresh start.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && AI_SETTINGS_KEY in changes) {
      authFailed.clear();
      compat.clear();
      secretsPromise = null;
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Only this extension's own content scripts and pages may reach the providers.
    if (sender.id !== chrome.runtime.id) return false;
    if (parseRequest(msg)?.type === 'open-options') {
      void chrome.runtime.openOptionsPage();
      return false;
    }
    void handleMessage(msg, {
      lm: getLanguageModel(),
      loadSettings: loadPublicAiSettings,
      loadSecrets,
      hasPermission: (origins) => hasHostPermission(origins),
      fetch: globalThis.fetch.bind(globalThis),
      authFailed,
      compat,
    }).then(sendResponse, () => sendResponse(undefined));
    return true;
  });
});
