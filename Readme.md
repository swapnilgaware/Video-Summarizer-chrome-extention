# Video to Bullets (Chrome Extension, MV3)

Summarize the current page's video (YouTube or any site with captions) into concise bullet points directly from the toolbar popup.

## Features
- Extracts YouTube transcripts if visible.
- Falls back to parsing WebVTT `<track kind="captions">` from any HTML5 `<video>`.
- If no captions exist, uses page title/description as a weak fallback.
- Sends extracted text to an LLM (configurable API base/model) and renders clean bullets.

## Setup
1. Create a folder and copy all files from this repo into it.
2. Open **chrome://extensions** → Enable **Developer mode**.
3. Click **Load unpacked** → select the folder.
4. Open the extension **Options** and set:
   - **API Base**: e.g. `https://api.openai.com/v1`
   - **Model**: e.g. `gpt-4o-mini` (or any chat-completions model your API supports)
   - **API Key**: your key
5. Go to a YouTube page (or a site with video + captions), click the extension icon, then **Summarize Current Video**.

## Notes
- YouTube sometimes hides transcripts; opening the transcript panel helps.
- For non-YouTube sites, ensure the video has a captions `<track>`.
- API costs apply according to your provider. Your key is stored in Chrome sync storage.
- This MVP uses `chat/completions`. If your provider only supports `responses`, adapt `summarizer.js` accordingly.

## Privacy
- Transcript/caption text is extracted locally and sent only to your configured LLM endpoint when you click summarize.
- No analytics. No third-party calls besides your configured API base.

## Roadmap
- Auto-detect and summarize on page load.
- Chunk long transcripts & map-reduce summaries.
- Per-site extractors (YouTube, Coursera, Udemy, etc.).
- Export to Markdown / copy to clipboard.