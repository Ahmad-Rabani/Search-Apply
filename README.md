# Search & Apply

AI-powered job search assistant: sync multiple job boards, filter by platform, score relevance, generate ATS-tailored CVs, Apply Assist (human-in-the-loop), and track applications.

## Stack

- **Web:** React + Vite + Tailwind CSS
- **API:** Node.js + Express + TypeScript + MongoDB
- **AI:** Google Gemini (default) / Anthropic Claude (optional)
- **PDF / browser assist:** Puppeteer

## Quick start

### 1. Prerequisites

- Node.js 20+
- MongoDB running locally **or** a MongoDB Atlas URI
- Gemini API key (free tier)

### 2. Install

```bash
npm install
```

### 3. Configure

```bash
copy .env.example apps\api\.env
```

```
MONGODB_URI=mongodb://127.0.0.1:27017/search-and-apply
JWT_SECRET=your-long-secret
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
# Optional Indeed-like board:
# ADZUNA_APP_ID=
# ADZUNA_APP_KEY=
```

### 4. Run

> **Windows note:** folder name `Search&Apply` breaks some `.bin` shims — use the commands below.

```bash
npm run dev:api
npm run dev:web
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

## Phase 1 — Discovery + tailored CV

1. Register / log in
2. **Profile** → upload CV → review → Save
3. **Jobs** → Sync all boards (RemoteOK, Remotive, Arbeitnow, Jobicy, optional Adzuna)
4. Filter by platform + search
5. Generate matched CV → Download PDF

## Phase 2 — Apply assist + tracker

1. On a job page: **Apply Assist** opens the apply URL, auto-fills common fields from your profile, saves a confirmation screenshot, and does **not** auto-submit
2. **Tracker**: filter by status + platform, edit notes, open screenshots
3. Search/platform filters persist in the URL when you go back from a job

## Notes

- Full silent LinkedIn/Indeed auto-login bots are avoided (ToS / ban risk). Apply Assist is supervised.
- Job boards synced without keys: RemoteOK, Remotive, Arbeitnow, Jobicy.
