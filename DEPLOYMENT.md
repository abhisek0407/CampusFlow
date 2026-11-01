# CampusFlow deployment: Vercel (frontend) + Render (3 backends)

## Architecture

```
Browser
  |  https                                        wss (voice only)
  v                                                  |
Vercel: frontend (Next.js)  -- /api/* rewrite -->  Render: campusflow-backend (Node / Next API + MongoDB)
                                                     |            |
                                          HTTP + secret          HTTP + secret
                                                     v            v
                              Render: campusflow-ai-service     Render: campusflow-agent
                              (Python, OR-Tools CP-SAT,          (Python, Gemini via google-adk,
                               official validator)                Sarvam speech-to-text)
                                                                    |
                                                  calls the backend's /api/* with the user's JWT
```

| # | Where | Service | Folder | Runtime |
|---|-------|---------|--------|---------|
| - | Vercel | Frontend (admin, faculty and club portals are all one Next.js app) | `frontend/` | Node |
| 1 | Render | `campusflow-ai-service` | `AI-service/` (+ `CrunchWeek_StarterPack/` for data and validator) | Python 3.11 |
| 2 | Render | `campusflow-backend` | `backend/` | Node 22 |
| 3 | Render | `campusflow-agent` | `agent-service/` | Python 3.11 |

The agent uses **Gemini only**; there is no Claude/Sonnet call in this codebase, so no Anthropic key is needed.

## Files in this package (copy to the same path in your repo)

- `render.yaml` (repo root): defines all three Render services
- `AI-service/server.py`, `AI-service/requirements.txt`: new HTTP wrapper around the solver (`/repair`, `/check_booking`, `/validate`, `/health`)
- `backend/lib/pythonBridge.js`, `backend/lib/validatorRunner.js`: call the AI service over HTTP when `AI_SERVICE_URL` is set; otherwise unchanged (local dev still spawns Python)
- `*.env.example`: the variables each service needs

Also make sure the earlier disruption fixes (`CampusFlow-fix.zip`) are in the repo you deploy.

## Step 0: before you start

1. Push the whole repo (all folders) to GitHub. Do not commit real `.env` files.
2. MongoDB Atlas: Network Access -> allow `0.0.0.0/0` (Render free instances have no fixed IP).
3. Generate three random secrets (any 32+ char strings): `JWT_SECRET`, `AGENT_SHARED_SECRET`, `AI_SERVICE_SECRET`.
   The code falls back to a hard-coded `AGENT_SHARED_SECRET` if the variable is missing, so always set it.
4. Have your `GOOGLE_API_KEY` (Gemini) and `SARVAM_API_KEY` ready.

## Step 1: Render (deploy in this order)

Render -> **New -> Blueprint** -> select the repo. It reads `render.yaml` and creates the three services.
It asks for every `sync: false` variable; if you do not know a URL yet, put a placeholder and fix it in step 1d.

**1a. campusflow-ai-service** (deploy first)
- Check: open `https://<ai-service>.onrender.com/health` -> `{"ok": true, ...}`
- Env: `AI_SERVICE_SECRET`

**1b. campusflow-agent**
- Env: `GOOGLE_API_KEY`, `GEMINI_MODEL`, `SARVAM_API_KEY`, `AGENT_SHARED_SECRET`, `BACKEND_URL` (the backend URL from 1c)

**1c. campusflow-backend**
- Env: `MONGODB_URI`, `JWT_SECRET`, `AGENT_SHARED_SECRET`, `AI_SERVICE_URL`, `AI_SERVICE_SECRET`, `AGENT_URL`
- First time only: seed the database. In the backend service -> **Shell**: `npm run seed`
  (or run it from your own machine with the production `MONGODB_URI`).

**1d. Wire the URLs together**, then redeploy whichever service changed:

| On service | Variable | Value |
|---|---|---|
| backend | `AI_SERVICE_URL` | AI service URL |
| backend | `AGENT_URL` | agent URL |
| agent | `BACKEND_URL` | backend URL (the Render URL, not Vercel) |
| all three | secrets | same value wherever the same name appears |

No trailing slash on any URL.

## Step 2: Vercel (frontend)

1. Vercel -> **Add New -> Project** -> import the repo.
2. **Root Directory: `frontend`**. Framework preset: Next.js (build command from `package.json`: `next build --webpack`).
3. Environment variables (see `frontend/.env.example`):
   - `BACKEND_URL` = Render backend URL
   - `NEXT_PUBLIC_AGENT_WS_URL` = `wss://<agent>.onrender.com`
4. Deploy. These two are read at build time, so **redeploy after changing them**.

## Step 3: verify

1. Open the Vercel URL, log in as admin.
2. Overview and Timetable Management load data (backend + MongoDB OK).
3. Disruption Management -> **Simulate Sample Disruption** (backend -> AI service OK; takes ~15-30 s).
4. Approve it; the version badge goes up by one.
5. AI Assistant: send a message (agent + Gemini OK). Mic button (agent websocket OK).

## Things to know (not verified on a live deploy)

- **Cold starts.** Free Render services sleep after ~15 min idle; the first request takes 30-60 s, and a request that touches all three can take longer. The backend allows 30 s extra for the AI service to wake up. Use the `starter` plan for a demo day, or ping `/health` of the AI service just before presenting.
- **Solver time vs. proxy limits.** The browser calls Vercel, which proxies `/api/*` to Render. A solve takes ~15-30 s (17 s in my local test). I did not confirm Vercel's proxy time limit for your plan. If the Simulate / propose calls fail with a gateway timeout on Vercel but work when you call the Render backend URL directly, tell me and I will switch the frontend to call the backend directly (needs CORS added to the backend).
- **Memory.** OR-Tools can be heavy on the 512 MB free instance. If the AI service restarts during a solve, move it to `starter` and keep `MAX_CONCURRENT_SOLVES=1`.
- **Local development is unchanged**: leave `AI_SERVICE_URL` unset and the backend spawns Python as before.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend loads, every API call fails | `BACKEND_URL` wrong/missing on Vercel, or not redeployed after setting it |
| "AI service error (HTTP 401)" | `AI_SERVICE_SECRET` differs between backend and AI service |
| "Python bridge ... spawn python ENOENT" | `AI_SERVICE_URL` not set on the backend (it is trying to run Python locally) |
| Assistant replies "agent unavailable" / 503 | `AGENT_URL` wrong, agent still waking up, or `AGENT_SHARED_SECRET` mismatch (401) |
| Agent tools fail (rooms, bookings) | `BACKEND_URL` on the agent points to localhost or to Vercel |
| Mic button errors | `NEXT_PUBLIC_AGENT_WS_URL` missing or uses `ws://` instead of `wss://`; redeploy Vercel |
| Backend 500 on every request | Atlas Network Access blocks Render, or bad `MONGODB_URI` |
