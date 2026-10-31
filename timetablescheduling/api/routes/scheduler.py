"""HTTP + WebSocket routes.  Thin on purpose: authentication, then one call into ``SchedulerService``.

Module-level handler functions (not closures) so they can be unit-tested directly.  The service, job manager and auth
provider live on ``app.state`` (set in ``api.main.create_app``).
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect

from ..auth import Principal
from ..errors import ApiError, Forbidden
from ..schemas import (ActiveInfoResponse, DecisionResponse, JobCreatedResponse, JobStatusResponse,
                       StartJobRequest, ValidateSnapshotRequest)
from ..services.job_manager import JOB_TERMINAL, STREAM_END_EVENTS

router = APIRouter()

WS_UNAUTHENTICATED, WS_FORBIDDEN, WS_NOT_FOUND = 4401, 4403, 4404


def _bearer(headers) -> Optional[str]:
    scheme, _, token = (headers.get("authorization") or "").partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def current_admin(request: Request) -> Principal:
    principal = request.app.state.auth_provider.authenticate(_bearer(request.headers))
    if principal is None:
        raise HTTPException(status_code=401, detail="Authentication required.",
                            headers={"WWW-Authenticate": "Bearer"})
    if not principal.is_admin:
        raise HTTPException(status_code=403, detail="Admin role required.")
    return principal


def _service(request: Request):
    return request.app.state.scheduler_service


@router.post("/api/scheduler/jobs", status_code=202, response_model=JobCreatedResponse)
def start_job(body: StartJobRequest, request: Request, principal: Principal = Depends(current_admin)):
    """Queue a scheduling job and return immediately; the solve runs on a background worker."""
    job = _service(request).submit(
        principal, mode=body.mode, changes=[c.model_dump(exclude_none=True) for c in body.changes],
        base_version=body.base_version, time_limit_seconds=body.time_limit_seconds, workers=body.workers,
        team=body.team, dataset_snapshot=body.dataset_snapshot, baseline_schedule=body.baseline_schedule)
    return {"job_id": job.job_id, "status": job.status, "websocket_url": f"/ws/scheduler/jobs/{job.job_id}"}


@router.get("/api/scheduler/active", response_model=ActiveInfoResponse)
def get_active(request: Request, principal: Principal = Depends(current_admin)):
    """Version of the active schedule (use it as ``base_version`` when starting a job)."""
    return _service(request).active_info(principal)


@router.post("/api/scheduler/validate")
def validate_snapshot(body: ValidateSnapshotRequest, request: Request, principal: Principal = Depends(current_admin)):
    """Validate the caller's current MongoDB snapshot with the unchanged official validator."""
    report = _service(request).runner.validate(body.dataset_snapshot, body.schedule,
                                               _service(request).settings.validator_path,
                                               baseline=body.baseline_schedule)
    from ..services.approval_policy import summarize_report
    return {"success": True, "validator": summarize_report(report)}


@router.get("/api/scheduler/jobs/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str, request: Request, principal: Principal = Depends(current_admin)):
    return _service(request).get_job(principal, job_id)


@router.get("/api/scheduler/jobs/{job_id}/result", response_model=None)
def get_result(job_id: str, request: Request, principal: Principal = Depends(current_admin)):
    """The proposal schedule + summarized validator report.  Large: fetch it once over HTTP, not over WebSocket."""
    return _service(request).get_result(principal, job_id)


@router.post("/api/scheduler/jobs/{job_id}/approve", response_model=DecisionResponse)
def approve_job(job_id: str, request: Request, principal: Principal = Depends(current_admin)):
    return _service(request).approve(principal, job_id)


@router.post("/api/scheduler/jobs/{job_id}/reject", response_model=DecisionResponse)
def reject_job(job_id: str, request: Request, principal: Principal = Depends(current_admin)):
    return _service(request).reject(principal, job_id)


@router.websocket("/ws/scheduler/jobs/{job_id}")
async def job_events(websocket: WebSocket, job_id: str, after_seq: int = Query(default=0, ge=0)):
    """Stream this job's events in order.  Reconnect with ``?after_seq=<last seq seen>`` to replay what was missed.

    Auth: ``Authorization: Bearer <token>`` header, or ``?token=<token>`` for browsers (which cannot set headers on
    WebSockets; use a short-lived token because query strings can end up in logs).  The stream ends after
    ``proposal_ready`` or ``job_failed``.  Closing the socket never affects the job.
    """
    state = websocket.app.state
    principal = state.auth_provider.authenticate(_bearer(websocket.headers) or websocket.query_params.get("token"))
    if principal is None:
        await websocket.close(code=WS_UNAUTHENTICATED)
        return
    try:
        state.scheduler_service.authorize_job(principal, job_id)
    except ApiError as e:
        await websocket.close(code=WS_FORBIDDEN if isinstance(e, Forbidden) else WS_NOT_FOUND)
        return

    await websocket.accept()
    manager = state.job_manager
    sub = manager.subscribe(job_id, asyncio.get_running_loop())
    last = after_seq
    try:
        while True:
            events = manager.events_after(job_id, last)          # replay and live use the same read
            ended = False
            for ev in events:
                await websocket.send_json(ev)
                last = ev["seq"]
                ended = ended or ev["event"] in STREAM_END_EVENTS
            if ended:
                break
            job = manager.get(job_id)
            if job is None or (job.status in JOB_TERMINAL and not events):
                break                                             # nothing more will come (e.g. reconnect after end)
            await sub.wait(1.0)
    except (WebSocketDisconnect, RuntimeError):
        pass                                                      # client left; the job keeps running
    finally:
        manager.unsubscribe(job_id, sub)
    try:
        await websocket.close()
    except Exception:
        pass
