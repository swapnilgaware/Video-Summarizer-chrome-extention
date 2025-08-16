
const $ = (id) => document.getElementById(id);
const apiBase = $('apiBase');
const model = $('model');
const apiKey = $('apiKey');
const statusEl = $('status');

async function load() {
  const data = await chrome.storage.sync.get({ apiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' });
  apiBase.value = data.apiBase || '';
  model.value = data.model || '';
  apiKey.value = data.apiKey || '';
}

async function save() {
  await chrome.storage.sync.set({ apiBase: apiBase.value.trim(), model: model.value.trim(), apiKey: apiKey.value.trim() });
  statusEl.textContent = 'Saved ✓';
  setTimeout(() => statusEl.textContent = '', 1200);
}

$('save').addEventListener('click', save);
load();