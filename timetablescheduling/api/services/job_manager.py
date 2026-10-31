"""Job state, ordered event log and WebSocket subscriptions (pure Python + asyncio; no FastAPI).

DEPLOYMENT NOTE: this is a single-process, in-memory implementation.  It requires ONE Uvicorn worker and all job
history is lost on restart.  Storage sits behind ``JobRepository`` so it can later be replaced (Redis / PostgreSQL)
without touching ``JobManager`` or the routes.

Threading model: the solver runs on a worker thread and calls ``JobManager.emit`` (cheap: lock + list append +
``loop.call_soon_threadsafe``).  The WebSocket handler runs on the event loop, waits on a ``Subscription`` and reads
events with ``events_after(job_id, seq)``.  Replay (``after_seq``) and live streaming therefore use the same code path.
"""
import asyncio
import copy
import threading
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Job lifecycle
QUEUED, RUNNING, COMPLETED, FAILED = "QUEUED", "RUNNING", "COMPLETED", "FAILED"
JOB_TERMINAL = (COMPLETED, FAILED)
# Proposal lifecycle (what happens to the result)
P_NONE, P_PENDING, P_BLOCKED = "NONE", "PENDING_REVIEW", "BLOCKED"
P_APPROVED, P_REJECTED, P_STALE = "APPROVED", "REJECTED", "STALE"
# After one of these events the WebSocket stream ends (the job has nothing more to say until a human acts).
STREAM_END_EVENTS = ("proposal_ready", "job_failed")


def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


@dataclass
class Job:
    job_id: str
    requested_by: str
    mode: str
    base_version: str
    changes: List[Dict[str, Any]]                       # snapshot of the proposed input changes
    params: Dict[str, Any]                              # time_limit_seconds, workers, team, seed
    status: str = QUEUED
    stage: Optional[str] = None
    proposal_status: str = P_NONE
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    solver_statuses: Dict[str, str] = field(default_factory=dict)
    summary: Dict[str, Any] = field(default_factory=dict)
    approvable: bool = False
    blocking_reasons: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    error: Optional[str] = None                         # safe, user-facing
    log_ref: Optional[str] = None                       # points at the server-side log entry (never a path)
    proposal: Optional[Dict[str, Any]] = None           # {'schedule','data_after','report','diff'} - NEVER sent by WS


class JobRepository(ABC):
    """Persistence seam for jobs and their event history."""

    @abstractmethod
    def add(self, job: Job) -> None: ...

    @abstractmethod
    def get(self, job_id: str) -> Optional[Job]: ...

    @abstractmethod
    def all(self) -> List[Job]: ...

    @abstractmethod
    def delete(self, job_id: str) -> None: ...

    @abstractmethod
    def append_event(self, job_id: str, event: Dict[str, Any]) -> None: ...

    @abstractmethod
    def events_after(self, job_id: str, seq: int) -> List[Dict[str, Any]]: ...

    @abstractmethod
    def latest_seq(self, job_id: str) -> int: ...


class InMemoryJobRepository(JobRepository):
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._events: Dict[str, List[Dict[str, Any]]] = {}

    def add(self, job):
        self._jobs[job.job_id] = job
        self._events[job.job_id] = []

    def get(self, job_id):
        return self._jobs.get(job_id)

    def all(self):
        return list(self._jobs.values())

    def delete(self, job_id):
        self._jobs.pop(job_id, None)
        self._events.pop(job_id, None)

    def append_event(self, job_id, event):
        self._events[job_id].append(event)

    def events_after(self, job_id, seq):
        return [e for e in self._events.get(job_id, []) if e["seq"] > seq]

    def latest_seq(self, job_id):
        ev = self._events.get(job_id)
        return ev[-1]["seq"] if ev else 0


class Subscription:
    """Wakes an async consumer when a job gets a new event.  ``notify`` may be called from ANY thread."""

    def __init__(self, loop):
        self._loop = loop
        self._event = asyncio.Event()
        self.closed = False

    def notify(self):
        if self.closed:
            return
        try:
            self._loop.call_soon_threadsafe(self._event.set)
        except RuntimeError:                            # the loop is gone (client left / server stopping)
            self.closed = True

    async def wait(self, timeout=1.0):
        """Wait for a notification (or the timeout), then clear.  Read events AFTER this returns."""
        try:
            await asyncio.wait_for(self._event.wait(), timeout)
        except asyncio.TimeoutError:
            pass
        self._event.clear()


class JobManager:
    def __init__(self, repository: Optional[JobRepository] = None, max_stored_jobs=200):
        self._repo = repository or InMemoryJobRepository()
        self._lock = threading.RLock()
        self._subs: Dict[str, List[Subscription]] = {}
        self._max_stored = max_stored_jobs

    # ---- jobs -------------------------------------------------------------------------------------------------
    def create_job(self, requested_by, mode, base_version, changes, params) -> Job:
        with self._lock:
            job = Job(job_id=uuid.uuid4().hex, requested_by=requested_by, mode=mode, base_version=base_version,
                      changes=copy.deepcopy(changes), params=dict(params))
            self._repo.add(job)
            self._evict()
            return job

    def _evict(self):
        extra = len(self._repo.all()) - self._max_stored
        if extra <= 0:
            return
        done = sorted((j for j in self._repo.all() if j.status in JOB_TERMINAL and j.proposal_status != P_PENDING),
                      key=lambda j: j.created_at)
        for j in done[:extra]:
            self._repo.delete(j.job_id)
            self._subs.pop(j.job_id, None)

    def get(self, job_id) -> Optional[Job]:
        with self._lock:
            return self._repo.get(job_id)

    def snapshot(self, job_id) -> Optional[Job]:
        """Cheap shallow copy: consistent top-level fields; the (immutable-by-convention) proposal is shared."""
        with self._lock:
            j = self._repo.get(job_id)
            if j is None:
                return None
            c = copy.copy(j)
            c.solver_statuses = dict(j.solver_statuses)
            c.blocking_reasons = list(j.blocking_reasons)
            c.warnings = list(j.warnings)
            c.summary = dict(j.summary)
            return c

    def update(self, job_id, **fields) -> Job:
        with self._lock:
            j = self._repo.get(job_id)
            if j is None:
                raise KeyError(job_id)
            for k, v in fields.items():
                if not hasattr(j, k):
                    raise AttributeError(k)
                setattr(j, k, v)
            j.updated_at = utc_now()
            return j

    def update_and_emit(self, job_id, event, payload=None, **fields):
        """Change job fields AND append the matching event in ONE step: a reader can never observe the new state
        without its event (or the event without the state)."""
        with self._lock:
            self.update(job_id, **fields)
            return self.emit(job_id, event, payload)

    def record_solver_status(self, job_id, stage, status):
        with self._lock:
            j = self._repo.get(job_id)
            if j is not None:
                j.solver_statuses[stage] = status
                j.updated_at = utc_now()

    def queued_job_ids(self):
        with self._lock:
            return [j.job_id for j in self._repo.all() if j.status == QUEUED]

    def active_count(self):
        """Jobs that are queued or running (they occupy scheduling capacity)."""
        with self._lock:
            return sum(1 for j in self._repo.all() if j.status in (QUEUED, RUNNING))

    def pending_proposals_for_version(self, base_version, exclude_job_id=None) -> List[Job]:
        with self._lock:
            return [j for j in self._repo.all()
                    if j.proposal_status == P_PENDING and j.base_version == base_version and j.job_id != exclude_job_id]

    # ---- events -----------------------------------------------------------------------------------------------
    def emit(self, job_id, event, payload=None) -> Optional[Dict[str, Any]]:
        """Append one event with the next sequence number.  Cheap and thread-safe (called from solver callbacks)."""
        with self._lock:
            j = self._repo.get(job_id)
            if j is None:
                return None
            env = {"job_id": job_id, "seq": self._repo.latest_seq(job_id) + 1, "event": event,
                   "timestamp": utc_now(), "payload": dict(payload or {})}
            self._repo.append_event(job_id, env)
            j.updated_at = env["timestamp"]
            subs = list(self._subs.get(job_id, ()))
        for s in subs:                                  # outside the lock: only schedules a wake-up
            s.notify()
        return env

    def events_after(self, job_id, seq=0):
        with self._lock:
            return self._repo.events_after(job_id, seq)

    def latest_seq(self, job_id):
        with self._lock:
            return self._repo.latest_seq(job_id)

    def subscribe(self, job_id, loop) -> Subscription:
        sub = Subscription(loop)
        with self._lock:
            self._subs.setdefault(job_id, []).append(sub)
        return sub

    def unsubscribe(self, job_id, sub):
        sub.closed = True
        with self._lock:
            subs = self._subs.get(job_id, [])
            if sub in subs:
                subs.remove(sub)
