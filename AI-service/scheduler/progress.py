"""Optional progress reporting for the solvers.  Pure Python: no FastAPI, WebSocket or database dependency.

A progress callback is any callable ``cb(event: str, payload: dict) -> None``.  Every solver / pipeline function takes
``progress_callback=None``; with ``None`` nothing in this module runs and behaviour is exactly as before.

Rules (see the implementation brief):
  * callbacks must do almost no work (the receiver only enqueues a small event),
  * a failing callback must never break a solve (exceptions are swallowed here),
  * only real values are reported; unavailable metrics are omitted, never invented,
  * no percentages: CP-SAT has no reliable "percent of search done".
"""
import logging
import time

_log = logging.getLogger(__name__)


def emit(cb, event, **payload):
    """Send one event to ``cb`` (if any).  ``None`` values are dropped so unavailable metrics are simply omitted."""
    if cb is None:
        return
    try:
        cb(event, {k: v for k, v in payload.items() if v is not None})
    except Exception:                                    # progress must never break scheduling
        _log.debug("progress callback failed for event %s", event, exc_info=True)


def _read(obj, *names):
    """Read a metric that is a method in some OR-Tools versions and a property in others."""
    for name in names:
        attr = getattr(obj, name, None)
        if attr is None:
            continue
        try:
            return float(attr() if callable(attr) else attr)
        except Exception:
            continue
    return None


def make_solution_callback(cp_model, cb, stage, min_interval=0.25):
    """A CpSolverSolutionCallback that reports every NEW incumbent solution (throttled) with the real objective,
    best bound and solver wall time.  ``cp_model`` is passed in so this module never imports OR-Tools itself."""

    class _SolutionProgress(cp_model.CpSolverSolutionCallback):
        def __init__(self):
            super().__init__()
            self._count = 0
            self._last = 0.0

        def on_solution_callback(self):
            self._count += 1
            now = time.monotonic()
            if now - self._last < min_interval:           # throttle: the solver can find many solutions per second
                return
            self._last = now
            emit(cb, "solution_improved", stage=stage, solution_count=self._count,
                 objective=_read(self, "objective_value", "ObjectiveValue"),
                 best_bound=_read(self, "best_objective_bound", "BestObjectiveBound"),
                 elapsed_seconds=_read(self, "wall_time", "WallTime"))

    return _SolutionProgress()


def attach_solver_log(solver, cb, stage):
    """Forward real OR-Tools log lines to ``cb`` as ``solver_log`` events, but ONLY when the receiver asks for it
    (``cb.wants_solver_log`` is true).  The receiver throttles and truncates.  Silently does nothing if this
    OR-Tools version has no ``log_callback``."""
    if cb is None or not getattr(cb, "wants_solver_log", False):
        return

    def _line(text):
        emit(cb, "solver_log", stage=stage, line=str(text).rstrip())

    try:
        solver.log_callback = _line
        solver.parameters.log_search_progress = True      # only after the callback was accepted (no stdout spam)
    except Exception:
        _log.debug("solver log callback not supported by this OR-Tools version", exc_info=True)
