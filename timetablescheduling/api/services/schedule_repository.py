"""The ACTIVE dataset + schedule, versioned.  A proposal becomes active only through ``commit``.

``commit`` is atomic (dataset and schedule are replaced together under one lock) and uses optimistic concurrency: it
succeeds only if the caller's ``expected_version`` is still the active version.  Previous versions are kept for
audit / rollback.  This in-memory implementation sits behind ``ScheduleRepository`` so a database-backed one (a single
transaction) can replace it.  Restarting the process resets the active state to the seed files, which are only READ.
"""
import copy
import json
import re
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..errors import StaleVersion


@dataclass(frozen=True)
class ActiveState:
    version: str
    dataset: Dict[str, Any]
    schedule: Optional[Dict[str, Any]]


class ScheduleRepository(ABC):
    @abstractmethod
    def get_active(self) -> ActiveState:
        """A private deep copy: callers may not mutate the active state through it."""

    @abstractmethod
    def active_version(self) -> str: ...

    @abstractmethod
    def commit(self, expected_version: str, dataset: Dict[str, Any], schedule: Dict[str, Any],
               meta: Optional[Dict[str, Any]] = None) -> str:
        """Atomically make (dataset, schedule) the new active version; raise ``StaleVersion`` if the active version
        is no longer ``expected_version``.  Returns the new version id."""

    @abstractmethod
    def history(self) -> List[Dict[str, Any]]: ...


class InMemoryScheduleRepository(ScheduleRepository):
    def __init__(self, dataset, schedule=None, version="schedule-v1"):
        self._lock = threading.RLock()
        m = re.match(r"^(.*?)(\d+)$", version)                  # "schedule-v1" -> prefix "schedule-v", counter 1
        self._prefix, self._counter = (m.group(1), int(m.group(2))) if m else (version + "-v", 1)
        self._active = ActiveState(version, copy.deepcopy(dataset), copy.deepcopy(schedule))
        self._history = [self._record(self._active, {"source": "seed"})]

    @staticmethod
    def _record(state, meta):
        return {"version": state.version, "committed_at": datetime.now(timezone.utc).isoformat(),
                "meta": dict(meta or {}), "state": state}

    def get_active(self):
        with self._lock:
            a = self._active
            return ActiveState(a.version, copy.deepcopy(a.dataset), copy.deepcopy(a.schedule))

    def active_version(self):
        with self._lock:
            return self._active.version

    def commit(self, expected_version, dataset, schedule, meta=None):
        with self._lock:
            if self._active.version != expected_version:
                raise StaleVersion(
                    f"The active schedule is now {self._active.version}, but this proposal was generated from "
                    f"{expected_version}. Run a new preview.")
            self._counter += 1
            new = ActiveState(f"{self._prefix}{self._counter}", copy.deepcopy(dataset), copy.deepcopy(schedule))
            self._active = new                               # one assignment = dataset + schedule change together
            self._history.append(self._record(new, meta))
            return new.version

    def history(self):
        with self._lock:
            return [{"version": h["version"], "committed_at": h["committed_at"], "meta": dict(h["meta"])}
                    for h in self._history]


def load_seed_repository(settings):
    """Build the active state from the checked-in files (read-only)."""
    with open(Path(settings.data_path), encoding="utf-8") as f:
        dataset = json.load(f)
    schedule = None
    p = settings.seed_schedule_path
    if p and Path(p).is_file():
        with open(Path(p), encoding="utf-8") as f:
            schedule = json.load(f)
    return InMemoryScheduleRepository(dataset, schedule, settings.initial_version)
