"""Shared test helpers: a fake solver runner that emits the same progress events as the real scheduler, and a
factory that wires a service around the REAL dataset / seed schedule (read-only) with temp runtime dirs."""
import copy
import json
import tempfile
import threading
import time
from pathlib import Path

from api.auth import Principal
from api.config import Settings
from api.services.artifacts import JobArtifactStore
from api.services.job_manager import JobManager
from api.services.runner import SchedulerRunner
from api.services.schedule_repository import InMemoryScheduleRepository
from api.services.scheduler_service import SchedulerService
from scheduler.load_data import apply_disruption

ROOT = Path(__file__).resolve().parents[2]
DATASET = json.loads((ROOT / "data" / "cit_public.json").read_text(encoding="utf-8"))
SEED_SCHEDULE = json.loads((ROOT / "exports" / "schedule.json").read_text(encoding="utf-8"))

ADMIN = Principal("alice", frozenset({"admin"}))
ADMIN2 = Principal("bob", frozenset({"admin"}))
SUPER = Principal("root", frozenset({"super_admin"}))
VIEWER = Principal("carol", frozenset({"viewer"}))

ROOM_CHANGE = [{"type": "room_unavailable", "room_id": "CR-102", "days": ["MON"],
                "periods": [1, 2, 3, 4, 5, 6, 7, 8, 9], "reason": "Maintenance"}]


def make_report(hard=0, soft=3, moved=1):
    return {"dataset_id": "cit-public-v1", "hard_violation_count": hard,
            "hard_by_rule": {"H1": hard} if hard else {},
            "hard_violations": [{"rule": "H1", "where": "timetable", "detail": f"violation {i}"}
                                for i in range(hard)],
            "soft_total": soft, "soft_penalties": {"S1": soft}, "exam_soft_penalty": 0, "warnings": [],
            "bookings": {"booking_score": 67.0, "booking_score_max_if_all_approved": 70, "priority_inversions": []},
            "stability": {"sessions_moved": moved, "time_changed": moved, "room_only_changed": 0, "moved_ids": []}}


class FakeRunner(SchedulerRunner):
    """Stands in for build_submission / repair_all.  Emits real-looking progress events via ``progress_callback``."""

    def __init__(self, status="OPTIMAL", exam_status="OPTIMAL", hard=0, dropped=None, raise_exc=None, hold=None,
                 after_none=False, relaxed=None, solutions=3):
        self.status, self.exam_status, self.hard = status, exam_status, hard
        self.dropped, self.raise_exc, self.hold, self.after_none = dropped or {}, raise_exc, hold, after_none
        self.relaxed, self.solutions = relaxed or [], solutions
        self.calls, self.data_seen, self.validated = [], [], []
        self._lock = threading.Lock()
        self._running = 0
        self.max_concurrent = 0
        self.started = threading.Event()

    def _enter(self, kind, data):
        with self._lock:
            self._running += 1
            self.max_concurrent = max(self.max_concurrent, self._running)
            self.calls.append(kind)
            self.data_seen.append(data)
        self.started.set()
        if self.hold is not None:
            assert self.hold.wait(20), "test never released the fake solver"
        if self.raise_exc:
            raise self.raise_exc

    def _leave(self):
        with self._lock:
            self._running -= 1

    def _solve_events(self, cb, stage, status):
        cb("solver_started", {"stage": stage, "time_limit_seconds": 5.0, "workers": 2})
        for i in range(self.solutions):
            cb("solution_improved", {"stage": stage, "solution_count": i + 1, "objective": 100.0 - i,
                                     "best_bound": 90.0, "elapsed_seconds": 0.1 * (i + 1)})
            time.sleep(0.001)
        cb("solver_finished", {"stage": stage, "status": status, "wall_seconds": 0.5, "objective": 98.0,
                               "best_bound": 90.0})

    def generate(self, data, *, team, time_limit, workers, seed, validator_path, progress_callback, log):
        self._enter("generate", copy.deepcopy(data))
        try:
            cb = progress_callback
            cb("stage_started", {"stage": "joint_timetable_booking",
                                 "message": "Running timetable and in-window booking optimization"})
            self._solve_events(cb, "joint_timetable_booking", self.status)
            cb("stage_completed", {"stage": "joint_timetable_booking", "status": self.status})
            if self.status not in ("OPTIMAL", "FEASIBLE"):
                raise RuntimeError(f"no timetable: {self.status} ")
            cb("stage_started", {"stage": "booking_planning", "message": "Processing remaining booking decisions"})
            cb("stage_completed", {"stage": "booking_planning"})
            cb("stage_started", {"stage": "exam_scheduling", "message": "Scheduling exams"})
            self._solve_events(cb, "exam_scheduling", self.exam_status)
            cb("stage_completed", {"stage": "exam_scheduling", "status": self.exam_status})
            cb("stage_started", {"stage": "official_validation", "message": "Running the official validator"})
            cb("stage_completed", {"stage": "official_validation"})
            sched = copy.deepcopy(SEED_SCHEDULE)
            sched["team"] = team
            return {"schedule": sched, "statuses": {"timetable+bookings": self.status, "exams": self.exam_status},
                    "report": make_report(self.hard, moved=0)}
        finally:
            self._leave()

    def repair(self, data, disruption, baseline, *, team, time_limit, workers, progress_callback):
        self._enter("repair", copy.deepcopy(data))
        try:
            cb = progress_callback
            cb("stage_started", {"stage": "apply_disruption", "message": "Applying the disruption"})
            data_full = apply_disruption(data, disruption)
            cb("stage_completed", {"stage": "apply_disruption", "forced_moves": 1})
            cb("stage_started", {"stage": "repair_solve", "message": "Solving the repair model"})
            self._solve_events(cb, "repair_solve", self.status)
            cb("stage_completed", {"stage": "repair_solve", "status": self.status,
                                   "dropped_sessions": len(self.dropped)})
            if self.after_none:
                return {"data_full": data_full, "rep": {"status": self.status, "relaxed_uses": []}, "forced": [],
                        "after": None, "dropped": {}}
            cb("stage_started", {"stage": "booking_replan", "message": "Re-planning fest-week bookings"})
            cb("stage_completed", {"stage": "booking_replan"})
            after = copy.deepcopy(baseline)
            after["team"] = team
            first = after["sessions"][0]
            first["room_id"] = "ROOM-MOVED"                      # one visible change vs the active timetable
            return {"data_full": data_full, "rep": {"status": self.status, "relaxed_uses": list(self.relaxed)},
                    "forced": [first["session_id"]], "after": after, "dropped": dict(self.dropped)}
        finally:
            self._leave()

    def validate(self, data, schedule, validator_path, baseline=None):
        self.validated.append((data.get("dataset_id"), validator_path))
        return make_report(self.hard, moved=1)


def make_service(runner=None, *, schedule=SEED_SCHEDULE, max_queued=5, runtime=True, stream_log=False):
    tmp = tempfile.TemporaryDirectory()
    settings = Settings(runtime_dir=Path(tmp.name) / "runtime" if runtime else None, max_queued_jobs=max_queued,
                        stream_solver_log=stream_log, solution_min_interval=0.0, log_min_interval=0.0)
    repo = InMemoryScheduleRepository(DATASET, schedule, "schedule-v1")
    manager = JobManager(max_stored_jobs=50)
    runner = runner or FakeRunner()
    svc = SchedulerService(settings, repo, manager, runner, artifacts=JobArtifactStore(settings.runtime_dir))
    svc._tmp = tmp                                               # keep the temp dir alive with the service
    return svc, repo, manager, runner, settings


def wait_until(predicate, timeout=10.0, interval=0.01):
    end = time.time() + timeout
    while time.time() < end:
        if predicate():
            return True
        time.sleep(interval)
    return False


def wait_status(manager, job_id, statuses=("COMPLETED", "FAILED"), timeout=10.0):
    ok = wait_until(lambda: manager.snapshot(job_id).status in statuses, timeout)
    assert ok, f"job {job_id} stuck in {manager.snapshot(job_id).status}"
    return manager.snapshot(job_id)
