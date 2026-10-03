import { hasHostPermission } from '../ai/permissions';
import { IdbKeyStore } from '../ai/secret-store';
import { AI_SETTINGS_KEY, loadAiSecrets, loadPublicAiSettings } from '../ai/settings-store';
import type { ProviderKind } from '../ai/types';
import { getLanguageModel } from '../llm/availability';
import { handleMessage } from '../llm/handle-message';

export default defineBackground(() => {
  const keyStore = new IdbKeyStore();
  const authFailed = new Set<ProviderKind>();

  // Changing the settings (a new key, another provider) gives a failed provider a fresh start.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && AI_SETTINGS_KEY in changes) authFailed.clear();
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Only this extension's own content scripts and pages may reach the providers.
    if (sender.id !== chrome.runtime.id) return false;
    if ((msg as { type?: unknown } | null)?.type === 'open-options') {
      void chrome.runtime.openOptionsPage();
      return false;
    }
    void handleMessage(msg, {
      lm: getLanguageModel(),
      loadSettings: loadPublicAiSettings,
      loadSecrets: () => loadAiSecrets(keyStore),
      hasPermission: (origins) => hasHostPermission(origins),
      fetch: globalThis.fetch.bind(globalThis),
      authFailed,
    }).then(sendResponse, () => sendResponse(undefined));
    return true;
  });
});
