import { summarizeText } from './summarizer.js';

const $ = (id) => document.getElementById(id);

const summarizeBtn = $('summarizeBtn');
const statusEl = $('status');
const resultEl = $('result');
const lengthSel = $('length');
const apiKeyWarning = $('apiKeyWarning');

const openOptionsLinks = ['openOptions', 'openOptions2'];
openOptionsLinks.forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

async function getApiKey() {
  const { apiKey, apiBase, model } = await chrome.storage.sync.get({ apiKey: '', apiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini' });
  return { apiKey, apiBase, model };
}

async function ensureApiKey() {
  const { apiKey } = await getApiKey();
  const has = !!apiKey;
  apiKeyWarning.hidden = has;
  return has;
}

async function runExtraction(tabId) {
  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractTranscriptOrCaptions,
    args: [],
    world: 'MAIN'
  });
  return result;
}

// This function is serialized & executed in the page context
function extractTranscriptOrCaptions() {
  function gatherFromYouTubeTranscript() {
    // Try YouTube transcript renderer if present
    const transcriptEls = document.querySelectorAll('ytd-transcript-renderer, ytd-transcript-segment-renderer');
    if (transcriptEls && transcriptEls.length) {
      const segments = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'))
        .map(el => el.innerText.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (segments.length) return segments.join(' ');
    }

    // Transcript panel might be closed; try to open it via button text if available
    const buttons = Array.from(document.querySelectorAll('button, tp-yt-paper-item'));
    const transcriptButton = buttons.find(b => /transcript/i.test(b.textContent || ''));
    if (transcriptButton) {
      transcriptButton.click();
      // Give panel a moment (this function runs synchronously; we can poll quickly)
      const start = performance.now();
      while (performance.now() - start < 800) {
        const segs = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'))
          .map(el => el.innerText.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (segs.length) return segs.join(' ');
      }
    }
    return '';
  }

  function parseVTT(text) {
    // Very small VTT → plain text parser
    return text.split(/\n\n+/).map(block => {
      const lines = block.split(/\n/).filter(Boolean);
      // drop cue id and time line if present
      const content = lines.filter(l => !/^\d+$/.test(l) && !/-->/.test(l) && !/^WEBVTT/.test(l)).join(' ');
      return content.trim();
    }).filter(Boolean).join(' ');
  }

  async function fetchTrackSrc(v) {
    try {
      const track = v.querySelector('track[kind="captions"], track[kind="subtitles"]');
      if (!track) return '';
      const src = track.getAttribute('src');
      if (!src) return '';
      const abs = new URL(src, document.location.href).toString();
      const res = await fetch(abs);
      const txt = await res.text();
      return parseVTT(txt);
    } catch (e) {
      return '';
    }
  }

  function textAroundVideo() {
    const title = document.querySelector('h1, h2, [itemprop="name"], meta[property="og:title"]')?.content || document.title;
    const desc = document.querySelector('meta[name="description"]')?.content || '';
    return [title, desc].filter(Boolean).join(' — ');
  }

  // Prefer YouTube transcript if present
  let transcript = '';
  try { transcript = gatherFromYouTubeTranscript(); } catch {}

  // Else try VTT from <track> on any HTML5 <video>
  if (!transcript) {
    const v = document.querySelector('video');
    if (v) {
      // Can't use await in non-async func; wrap in IIFE and return a promise marker
      return (async () => {
        const vtt = await fetchTrackSrc(v);
        return vtt || textAroundVideo();
      })();
    }
  }

  return transcript || textAroundVideo();
}

function showStatus(msg) { statusEl.textContent = msg; }
function htmlEscape(s) { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function bulletsToHtml(bullets) {
  const li = bullets.map(b => `<li>${htmlEscape(b)}</li>`).join('');
  return `<ul>${li}</ul>`;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function main() {
  const hasKey = await ensureApiKey();
  if (!hasKey) return;

  const tabId = await getActiveTabId();
  if (!tabId) return;

  summarizeBtn.disabled = true; resultEl.innerHTML = '';
  showStatus('Extracting transcript/captions…');

  let extracted;
  try {
    extracted = await runExtraction(tabId);
    if (extracted && typeof extracted.then === 'function') {
      // If page function returned a promise (VTT fetch path)
      extracted = await extracted;
    }
  } catch (e) {
    showStatus(`Extraction failed: ${e.message}`);
    summarizeBtn.disabled = false; return;
  }

  if (!extracted || extracted.trim().length < 30) {
    showStatus('No transcript/captions found. Summarizing visible text instead…');
  } else {
    showStatus('Summarizing…');
  }

  const { apiKey, apiBase, model } = await getApiKey();
  const len = lengthSel.value;

  try {
    const bullets = await summarizeText({ apiKey, apiBase, model, text: String(extracted || ''), length: len });
    resultEl.innerHTML = bulletsToHtml(bullets);
    showStatus('Done');
  } catch (e) {
    showStatus(`Summarization failed: ${e.message}`);
  } finally {
    summarizeBtn.disabled = false;
  }
}

summarizeBtn.addEventListener('click', main);
ensureApiKey();