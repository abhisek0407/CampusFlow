# CI: test first, then merge to main

## What runs on every pull request into `main`

| Job | What it checks |
|---|---|
| Frontend build | `npm ci` + `npm run build` in `frontend/` (lint runs too but is informational) |
| AI service tests | `pytest AI-service/tests` (14 tests: bookings, exams, repair, pipeline) |
| Backend and agent tests | Starts a MongoDB, seeds it, starts the backend, then runs `backend/tests/smoke.sh`, `backend/tests/smoke.py` and `agent-service/test_mocked_llm.py` |
| **CI passed** | Green only if the three jobs above are green. This is the one check main requires. |

Informational (shown as a warning, never blocks): lint, `test_e2e_mock_runner.py`, `test_auth_full.mjs`.

## Setup (once, on GitHub)

1. Copy `.github/` into the repo root, commit, push.
2. Open a first PR so the workflow runs once (GitHub only lists a check after it has run).
3. **Settings -> Branches -> Add branch protection rule** for `main`:
   - Require a pull request before merging
   - Require status checks to pass before merging -> search and select **CI passed**
   - Require branches to be up to date before merging
4. For automatic merging: **Settings -> General -> Pull Requests -> Allow auto-merge** ON.
   `auto-merge.yml` then switches on auto-merge for each PR, and GitHub merges it by itself the moment CI passed is green. If CI fails the PR stays open. To merge by hand instead, delete `auto-merge.yml`.

## Daily flow

```
git checkout -b my-change
# edit, commit, push
# open a PR into main  ->  CI runs  ->  green: merged automatically / red: fix and push again
```
Nobody can push straight to main once the rule is on.

## Deploy after merge

Render and Vercel redeploy from `main` by default, so a merge ships. To deploy only when checks pass, set the service's auto-deploy option in the Render dashboard to wait for CI checks, so a red build never reaches production.

## Notes

- The backend test job does not set `AI_SERVICE_URL`, so the backend runs the solver locally as in development. `AGENT_URL` points at nothing on purpose: smoke test 9 checks the "agent down" fallback.
- The CI database and secrets are throwaway values in the workflow file; no real secrets are needed.
