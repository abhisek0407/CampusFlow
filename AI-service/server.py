"""HTTP wrapper around the CP-SAT scheduling bridge (api_entry.py).

Lets the Node backend call the solver over HTTP instead of spawning Python locally,
so the solver can run as its own Render service.

Endpoints (all POST, JSON body, header X-Service-Secret when AI_SERVICE_SECRET is set):
    /repair         body = payload for api_entry.handle_repair
    /check_booking  body = payload for api_entry.handle_check_booking
    /validate       body = {schedule, disruption?, baseline?}  -> {exitCode, stdout, stderr, report}
    GET /health
"""
import json
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

import api_entry  # same folder; also puts scheduler/ on sys.path

SECRET = os.getenv("AI_SERVICE_SECRET", "")
# CP-SAT is CPU/RAM heavy: queue solves instead of running them in parallel on a small instance.
_solve_slots = threading.Semaphore(int(os.getenv("MAX_CONCURRENT_SOLVES", "1")))

app = FastAPI(title="CampusFlow AI service")


def _check(secret: Optional[str]):
    if SECRET and secret != SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Service-Secret")


def _run_handler(fn, payload):
    with _solve_slots:
        return fn(payload)


@app.get("/health")
def health():
    return {"ok": True, "service": "ai-service"}


@app.post("/repair")
async def repair(payload: dict, x_service_secret: Optional[str] = Header(None)):
    _check(x_service_secret)
    try:
        return await run_in_threadpool(_run_handler, api_entry.handle_repair, payload)
    except Exception as e:  # same contract as the CLI: {"error": "..."}
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/check_booking")
async def check_booking(payload: dict, x_service_secret: Optional[str] = Header(None)):
    _check(x_service_secret)
    try:
        return await run_in_threadpool(_run_handler, api_entry.handle_check_booking, payload)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


def _validate_sync(body: dict):
    data_path, validator_path = api_entry.get_dataset_paths()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        sched = tmp / "schedule.json"
        report = tmp / "report.json"
        sched.write_text(json.dumps(body.get("schedule") or {}), encoding="utf-8")
        args = [sys.executable, validator_path, "--data", data_path,
                "--schedule", str(sched), "--json", str(report)]
        if body.get("disruption"):
            p = tmp / "disruption.json"
            p.write_text(json.dumps(body["disruption"]), encoding="utf-8")
            args += ["--disruption", str(p)]
        if body.get("baseline"):
            p = tmp / "baseline.json"
            p.write_text(json.dumps(body["baseline"]), encoding="utf-8")
            args += ["--baseline", str(p)]
        proc = subprocess.run(args, capture_output=True, text=True, timeout=120)
        rep = None
        if report.exists():
            rep = json.loads(report.read_text(encoding="utf-8"))
        return {
            "exitCode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "report": rep or {"raw_output": proc.stdout},
        }


@app.post("/validate")
async def validate(body: dict, x_service_secret: Optional[str] = Header(None)):
    _check(x_service_secret)
    try:
        return await run_in_threadpool(_validate_sync, body)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
