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

Matched CVs now prioritize **required technologies** from the job description (skills section + summary), without inventing skills you don’t have.

## Optional email

Add SMTP vars to `apps/api/.env` (see `.env.example`). Agent setting **notifyEmail** sends run summaries when SMTP is configured.
