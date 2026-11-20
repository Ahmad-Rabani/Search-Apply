# Search & Apply

AI-powered job search assistant: sync remote jobs, score relevance, generate ATS-tailored CVs + cover letters, export PDF, and track applications.

## Stack

- **Web:** React + Vite + Tailwind CSS
- **API:** Node.js + Express + TypeScript + MongoDB
- **AI:** Anthropic Claude
- **PDF:** Puppeteer

## Quick start

### 1. Prerequisites

- Node.js 20+
- MongoDB running locally **or** a MongoDB Atlas URI
- Gemini API key (free tier) — or Anthropic as optional fallback

### 2. Install

```bash
npm install
```

### 3. Configure

Copy env example into the API:

```bash
copy .env.example apps\api\.env
```

Edit `apps/api/.env`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/search-and-apply
JWT_SECRET=your-long-secret
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
```

### 4. Run

> **Windows note:** this folder name contains `&`, which breaks some `.bin` shims. Prefer the commands below (or rename the folder to `SearchApply`).

From the repo root:

```bash
npm run dev:api
npm run dev:web
```

Or from each app folder:

```bash
cd apps/api
node ../../node_modules/tsx/dist/cli.mjs watch src/index.ts

cd apps/web
node ../../node_modules/vite/bin/vite.js
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

## Phase 1 flow

1. Register / log in
2. **Profile** → upload CV (PDF/DOCX/TXT) → review auto-filled fields → Save
3. On **Jobs**, click **Sync RemoteOK**
4. Open a job → **Generate matched CV** (ATS keywords from JD)
5. Download matched PDF → open apply page (or use **Match → PDF → Open apply**)
6. Track status on **Tracker**

CV parse + tailor use **Gemini** by default (`GEMINI_API_KEY`). Anthropic is optional fallback.

## Notes

- Auto-apply browser automation is intentionally **not** in Phase 1 (ToS / account risk).
- Without `ANTHROPIC_API_KEY`, job sync + tracker still work; tailor will return an error until you add a key.
