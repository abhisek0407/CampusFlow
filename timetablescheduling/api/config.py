"""Runtime settings for the API layer.  Everything has a safe default; override with environment variables."""
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _int(name, default):
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass
class Settings:
    project_root: Path = PROJECT_ROOT
    data_path: Path = PROJECT_ROOT / "data" / "cit_public.json"
    # READ-ONLY seed for the active schedule.  The API never writes to exports/.
    seed_schedule_path: Optional[Path] = PROJECT_ROOT / "exports" / "schedule.json"
    validator_path: Path = PROJECT_ROOT / "validator.py"
    # Per-job artifacts go to <runtime_dir>/jobs/<job_id>/.  None disables artifact files.
    runtime_dir: Optional[Path] = PROJECT_ROOT / "runtime"
    initial_version: str = "schedule-v1"
    max_queued_jobs: int = 5             # queued + running; further requests get HTTP 429
    max_stored_jobs: int = 200           # finished jobs beyond this are evicted (oldest first)
    stream_solver_log: bool = False      # forward (throttled) OR-Tools log lines as `solver_log` events
    solution_min_interval: float = 0.25  # seconds between `solution_improved` events
    log_min_interval: float = 0.5        # seconds between `solver_log` batches
    default_seed: int = 1

    @classmethod
    def from_env(cls):
        s = cls()
        if os.environ.get("CIT_API_DATA_PATH"):
            s.data_path = Path(os.environ["CIT_API_DATA_PATH"])
        if os.environ.get("CIT_API_SEED_SCHEDULE"):
            s.seed_schedule_path = Path(os.environ["CIT_API_SEED_SCHEDULE"])
        if os.environ.get("CIT_API_VALIDATOR_PATH"):
            s.validator_path = Path(os.environ["CIT_API_VALIDATOR_PATH"])
        if os.environ.get("CIT_API_RUNTIME_DIR"):
            s.runtime_dir = Path(os.environ["CIT_API_RUNTIME_DIR"])
        s.max_queued_jobs = _int("CIT_API_MAX_QUEUED_JOBS", s.max_queued_jobs)
        s.stream_solver_log = os.environ.get("CIT_API_STREAM_SOLVER_LOG", "0") == "1"
        return s
