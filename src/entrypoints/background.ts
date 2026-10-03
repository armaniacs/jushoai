import { getLanguageModel } from '../llm/availability';
import { handleMessage } from '../llm/handle-message';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Only this extension's own content scripts may reach the model.
    if (sender.id !== chrome.runtime.id) return false;
    if ((msg as { type?: unknown } | null)?.type === 'open-options') {
      void chrome.runtime.openOptionsPage();
      return false;
    }
    void handleMessage(msg, { lm: getLanguageModel() }).then(sendResponse, () => sendResponse(undefined));
    return true;
  });
});
