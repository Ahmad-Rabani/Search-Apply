# Search & Apply

AI-powered job hunting agent across discovery, CV matching, apply assist, scheduled agent mode, notifications, and dashboard analytics.

## Run

```bash
npm install
copy .env.example apps\api\.env
npm run dev:api
npm run dev:web
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

## Phases

1. **Discovery + CV match** — multi-board sync, search/platform filters, tailored CV/PDF  
2. **Apply assist + tracker** — human-in-the-loop fill + screenshots + status notes  
3. **Agent mode** — daily hunt, min score, auto-tailor for review  
4. **Insights + alerts** — Dashboard, in-app notification bell, optional SMTP email on agent runs  
5. **Interview prep** — company/role brief, likely questions, STAR stories, questions to ask  
6. **Optimize** — paste any JD + upload CV (or use Profile) → ATS-optimized resume PDF  

Matched CVs now prioritize **required technologies** from the job description (skills section + summary), without inventing skills you don’t have.

## Job boards

Synced on **Jobs → Sync** (no key required unless noted):

| Source | Notes |
|--------|--------|
| RemoteOK | Remote tech |
| Remotive | Curated remote |
| Arbeitnow | EU + remote |
| Jobicy | Remote careers |
| Himalayas | Remote search (software/frontend/react queries) |
| We Work Remotely | Programming / DevOps / FE / BE RSS |
| Working Nomads | Nomad-friendly remote (tech-filtered) |
| Adzuna | Optional — needs `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` |

## Optional email

Add SMTP vars to `apps/api/.env` (see `.env.example`). Agent setting **notifyEmail** sends run summaries when SMTP is configured.

## AdSense (monetization)

Public pages for review crawlers (no login):

- `/` landing  
- `/privacy` `/terms` `/contact`  
- `/guides/ats-cv` `/guides/job-search`  

1. Deploy the site on a real domain  
2. Apply at [Google AdSense](https://www.google.com/adsense/)  
3. After approval, copy `apps/web/.env.example` → `apps/web/.env` and set `VITE_ADSENSE_CLIENT` + slot IDs  
4. Restart the web app — placeholders become live ads  

Until keys are set, dashed **Ad placeholder** boxes show where units will appear.
