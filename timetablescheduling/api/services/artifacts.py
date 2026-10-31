"""Optional per-job artifact files under ``<runtime_dir>/jobs/<job_id>/``.  Never touches ``exports/`` or ``data/``."""
import json
import logging
import os
import re
from pathlib import Path

_log = logging.getLogger(__name__)
_JOB_ID = re.compile(r"^[0-9a-f]{32}$")
_NAME = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")


class JobArtifactStore:
    def __init__(self, runtime_dir):
        self._base = Path(runtime_dir) / "jobs" if runtime_dir else None

    @property
    def enabled(self):
        return self._base is not None

    def save_json(self, job_id, name, obj):
        """Best-effort atomic write.  Returns True on success; failures are logged, never raised."""
        if not self.enabled or not _JOB_ID.match(job_id or "") or not _NAME.match(name or ""):
            return False
        try:
            d = self._base / job_id
            d.mkdir(parents=True, exist_ok=True)
            tmp = d / (name + ".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(obj, f, indent=2, ensure_ascii=False)
            os.replace(tmp, d / name)
            return True
        except OSError:
            _log.warning("could not write artifact %s for job %s", name, job_id, exc_info=True)
            return False
