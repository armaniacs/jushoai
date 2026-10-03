export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'open-options') void chrome.runtime.openOptionsPage();
  });
});
