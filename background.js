// MV3 service worker placeholder (not strictly required for this MVP)
chrome.runtime.onInstalled.addListener(() => {
  // Initialize defaults
  chrome.storage.sync.set({ apiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini' });
});