"""The only place the API touches the solver.  ``RealSchedulerRunner`` calls the EXISTING functions directly:

  generate -> scheduler.pipeline.build_submission(...)      (no subprocess, no run_all.py, no shared exports/ files)
  repair   -> scheduler.repair.repair_all(...)
  validate -> scheduler.validate_output.run_validator(...)  (the official validator.py, unchanged)

OR-Tools is imported lazily, so the rest of the API (and its unit tests) can be used without it.  Tests inject a fake
``SchedulerRunner``.  The scheduler keeps module-level lookups (``bookings.set_dataset``), so only ONE job may run at a
time; ``SchedulerService`` guarantees that with a single-worker executor.
"""
import sys
from abc import ABC, abstractmethod
from pathlib import Path


class SchedulerRunner(ABC):
    @abstractmethod
    def generate(self, data, *, team, time_limit, workers, seed, validator_path, progress_callback, log):
        """Return {'schedule', 'statuses', 'report'} exactly like build_submission."""

    @abstractmethod
    def repair(self, data, disruption, baseline, *, team, time_limit, workers, progress_callback):
        """Return the dict of repair_all: data_full, rep, forced, after, dropped."""

    @abstractmethod
    def validate(self, data, schedule, validator_path, baseline=None):
        """Return the official validator report."""


class RealSchedulerRunner(SchedulerRunner):
    def __init__(self):
        root = str(Path(__file__).resolve().parents[2])
        if root not in sys.path:
            sys.path.insert(0, root)

    def generate(self, data, *, team, time_limit, workers, seed, validator_path, progress_callback, log):
        from scheduler.pipeline import build_submission
        return build_submission(data, team=team, time_limit=time_limit, workers=workers, seed=seed,
                                validator_path=str(validator_path), log=log, progress_callback=progress_callback)

    def repair(self, data, disruption, baseline, *, team, time_limit, workers, progress_callback):
        from scheduler.repair import repair_all
        return repair_all(data, disruption, baseline, team=team, time_limit=time_limit, workers=workers,
                          progress_callback=progress_callback)

    def validate(self, data, schedule, validator_path, baseline=None):
        from scheduler.validate_output import run_validator
        return run_validator(data, schedule, str(validator_path), baseline=baseline)
