# Search & Apply

AI-powered job hunting agent: multi-board sync, platform filters, ATS CV matching, Apply Assist, tracker, and scheduled Agent mode.

## Stack

- **Web:** React + Vite + Tailwind CSS
- **API:** Node.js + Express + TypeScript + MongoDB
- **AI:** Google Gemini (default)
- **Browser assist:** Puppeteer

## Run

```bash
npm install
copy .env.example apps\api\.env
npm run dev:api
npm run dev:web
```

Windows tip: folder name `Search&Apply` breaks `.bin` shims — use `node …/tsx` / `node …/vite` scripts already in package.json.

## Phases

### Phase 1 — Discovery + CV match
Profile upload, multi-board sync, search, tailored CV + PDF.

### Phase 2 — Apply assist + tracker
Human-in-the-loop Apply Assist, screenshots, tracker filters/notes.

### Phase 3 — Agent mode
- Daily scheduled hunt (UTC hour)
- Keep jobs above your min match score
- Auto-tailor CVs into Tracker for review
- Manual **Run agent now**

Open **Agent** in the nav to configure.
