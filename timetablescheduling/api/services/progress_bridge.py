"""Turns scheduler progress callbacks into job events.  Runs on the SOLVER thread, so it must stay tiny:
it only filters, throttles and appends an event to the job (lock + list append).  No I/O, no big JSON."""
import time
from collections import deque

# stage name used inside the scheduler -> key shown in ``solver_statuses`` (matches build_submission's keys)
STATUS_KEYS = {"joint_timetable_booking": "timetable+bookings", "exam_scheduling": "exams", "repair_solve": "repair"}
_ALLOWED = (str, int, float, bool)


def _clean(payload, max_str=300):
    out = {}
    for k, v in (payload or {}).items():
        if isinstance(v, _ALLOWED):
            out[str(k)] = v[:max_str] if isinstance(v, str) else v
    return out


class JobProgressReporter:
    """Pass an instance as ``progress_callback``.  ``wants_solver_log`` tells the scheduler whether to forward log lines."""

    def __init__(self, manager, job_id, *, stream_solver_log=False, solution_min_interval=0.25, log_min_interval=0.5,
                 max_log_events=200, clock=time.monotonic):
        self._m, self._job_id, self._clock = manager, job_id, clock
        self.wants_solver_log = bool(stream_solver_log)
        self._sol_gap, self._log_gap, self._max_logs = solution_min_interval, log_min_interval, max_log_events
        self._last_solution = None
        self._last_log_flush = None
        self._log_buf, self._log_stage, self._log_events = deque(maxlen=10), None, 0

    def __call__(self, event, payload):
        p = _clean(payload)
        if event == "solver_log":
            self._on_log(p)
            return
        if event == "solution_improved":
            now = self._clock()
            if self._last_solution is not None and now - self._last_solution < self._sol_gap:
                return
            self._last_solution = now
        if event in ("solver_finished", "stage_completed"):
            self.flush_log()
        stage = p.get("stage")
        if event == "stage_started" and stage:
            self._m.update(self._job_id, stage=stage)
        if event in ("solver_finished", "stage_completed") and stage in STATUS_KEYS and "status" in p:
            self._m.record_solver_status(self._job_id, STATUS_KEYS[stage], p["status"])
        self._m.emit(self._job_id, event, p)

    # -- throttled solver log -------------------------------------------------------------------------------------
    def _on_log(self, p):
        line = p.get("line", "").strip()
        if not line:
            return
        self._log_stage = p.get("stage", self._log_stage)
        self._log_buf.append(line[:200])
        now = self._clock()
        if self._last_log_flush is None or now - self._last_log_flush >= self._log_gap:
            self.flush_log()

    def flush_log(self):
        if not self._log_buf or self._log_events >= self._max_logs:
            self._log_buf.clear()
            return
        self._last_log_flush = self._clock()
        self._log_events += 1
        lines = list(self._log_buf)
        self._log_buf.clear()
        payload = {"lines": "\n".join(lines)}
        if self._log_stage:
            payload["stage"] = self._log_stage
        self._m.emit(self._job_id, "solver_log", payload)
