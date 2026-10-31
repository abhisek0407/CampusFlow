# CIT Scheduler API (FastAPI + WebSocket)

This is an API and observability layer around the existing CP-SAT scheduler. It calls the existing generation, repair, and official validation functions. The solver model, validator, CLI, dataset JSON and shared CLI exports remain independent of this API.

## Run standalone

Use a single Uvicorn worker. CampusFlow sends the current MongoDB snapshot with each job, so the API seed schedule is only needed for standalone clients that omit snapshots.

```powershell
cd timetablescheduling
D:\mlenv\Scripts\python.exe -m pip install -r requirements.txt -r api_requirements.txt
$env:CIT_API_TOKENS = "<shared-private-token>:campusflow:admin"
D:\mlenv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Swagger UI: <http://127.0.0.1:8000/docs>. With no tokens configured every protected request is rejected. Keep the service token private; the CampusFlow server is the only browser-facing gateway.

CampusFlow environment (server-side only): `CIT_SCHEDULER_API_URL` (default `http://127.0.0.1:8000`) and `CIT_SCHEDULER_API_TOKEN`. Configure the same token in `CIT_API_TOKENS`. Never expose either setting through `NEXT_PUBLIC_*` variables.

Optional API variables: `CIT_API_DATA_PATH`, `CIT_API_SEED_SCHEDULE`, `CIT_API_VALIDATOR_PATH`, `CIT_API_RUNTIME_DIR`, `CIT_API_MAX_QUEUED_JOBS` (default 5), `CIT_API_STREAM_SOLVER_LOG=1` (throttled OR-Tools search log).

## Endpoints (Admin-only except health)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/scheduler/jobs` | Queue a `generate` or `repair` preview (202) |
| GET | `/api/scheduler/active` | Active API snapshot version |
| GET | `/api/scheduler/jobs/{id}` | Job status |
| GET | `/api/scheduler/jobs/{id}/result` | Schedule proposal and validator summary |
| WS | `/ws/scheduler/jobs/{id}?after_seq=N` | Authenticated event stream with replay |
| POST | `/api/scheduler/jobs/{id}/approve` | Standalone API repository approval |
| POST | `/api/scheduler/jobs/{id}/reject` | Reject standalone proposal |
| POST | `/api/scheduler/validate` | Validate supplied dataset/schedule snapshot |
| GET | `/health` | Liveness |

CampusFlow uses the validation endpoint for Mongo-backed schedule validation and performs final approval/commit in Mongo. It supplies `dataset_snapshot` and `baseline_schedule` on job creation; FastAPI copies these into job-scoped state and returns the proposed `dataset_after` with the result. Jobs remain previews and do not write shared `exports/` files.

## Events and statuses

Events have `{job_id, seq, event, timestamp, payload}`. Reconnect with `after_seq` to replay subsequent events. Stage and solver events report actual stage names, incumbent objectives, bounds, elapsed time, and exact OR-Tools status where available; the API does not invent percentages. The CampusFlow browser connects only to its own `/ws/scheduler/jobs/{id}` gateway, which checks a short-lived ticket and Mongo Admin/job ownership before relaying to this service.

Solver statuses remain `OPTIMAL`, `FEASIBLE`, `INFEASIBLE`, `UNKNOWN`, or `MODEL_INVALID`. Only a schedule with acceptable solver status, no dropped sessions, and zero official hard violations can be approved. `FEASIBLE` is approvable with an optimality warning. CampusFlow additionally compares the current Mongo snapshot to the proposal's base version and rejects stale approval.

Errors use 401 for missing/invalid credentials, 403 for non-admin access, 404 for unknown/inaccessible jobs, 409 for conflict/stale/not-ready, 422 for invalid or unapprovable results, and 429 when the queue is full.

## Tests

```powershell
D:\mlenv\Scripts\python.exe -m unittest discover -s tests -v
D:\mlenv\Scripts\python.exe run_all.py --time 180 --workers 8
D:\mlenv\Scripts\python.exe run_all.py --disruption examples/sample_disruption.json --time 180
D:\mlenv\Scripts\python.exe -m unittest discover -s api/tests -t . -p "test_integration*.py" -v
$env:CIT_RUN_SOLVER_TESTS = "1"
D:\mlenv\Scripts\python.exe -m unittest api.tests.test_integration_api.TestRealSolverThroughApi -v
```

Run the official validator on each generated CLI export as described by `run_all.py` output / `scheduler.validate_output.run_validator`.

## Deployment limits

FastAPI job/event registry is in-memory and requires **one Uvicorn worker**; restart loses FastAPI job history and in-flight jobs. MongoDB must support transactions for CampusFlow's atomic approval. The Next custom server is required for the CampusFlow WebSocket gateway; do not deploy using `next start` directly. Replace in-memory FastAPI persistence with shared storage before multi-instance deployment.
