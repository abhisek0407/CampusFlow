"""Run the OFFICIAL validator.py (unchanged) from Python and summarise the result."""
import importlib.util
from pathlib import Path


def load_validator(validator_path):
    spec = importlib.util.spec_from_file_location("official_validator", str(Path(validator_path)))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_validator(data, schedule, validator_path, baseline=None):
    return load_validator(validator_path).run(data, schedule, baseline)


def timetable_view(report):
    """Only the weekly-timetable part (exams and bookings are separate steps)."""
    tv = [v for v in report["hard_violations"] if v["where"] == "timetable"]
    by = {}
    for v in tv:
        by[v["rule"]] = by.get(v["rule"], 0) + 1
    return {"hard": len(tv), "by_rule": by, "soft_total": report["soft_total"],
            "soft": report["soft_penalties"], "violations": tv}
