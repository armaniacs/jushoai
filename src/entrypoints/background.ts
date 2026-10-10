import { AuditStore } from '../ai/audit-log';
import { autoEgress } from '../ai/http-classifiers';
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
  const audit = new AuditStore();
  const authFailed = new Set<ProviderKind>();
  const compat = new Set<ProviderKind>();
  // One gate per SW lifetime: its DoH TTL cache then spans classify messages instead of
  // being rebuilt (and emptied) per message. autoEgress stays off under vitest so tests
  // keep injecting their own egress fake.
  const egress = autoEgress();
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
    const req = parseRequest(msg);
    if (req?.type === 'open-options') {
      void chrome.runtime.openOptionsPage();
      return false;
    }
    if (req?.type === 'audit-clear') {
      // Same AuditStore instance as record(): one queue serializes record and clear
      // across contexts, so a local options-side store could not interleave here.
      void audit.clear().then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
      return true;
    }
    void handleMessage(msg, {
      lm: getLanguageModel(),
      loadSettings: loadPublicAiSettings,
      loadSecrets,
      hasPermission: (origins) => hasHostPermission(origins),
      fetch: globalThis.fetch.bind(globalThis),
      authFailed,
      compat,
      egress,
      audit,
    }, { pageUrl: sender.tab?.url }).then(sendResponse, () => sendResponse(undefined));
    return true;
  });
});
