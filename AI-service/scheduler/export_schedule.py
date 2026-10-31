"""Build and write schedule.json in the starter pack's format."""
import json
from pathlib import Path


def build_schedule(assign, dataset_id, team="your-team", bookings=None, overrides=None, exams=None):
    """assign: {session_id: (day, start_period, room_id)}.
    bookings / overrides / exams are added only when given (they come from later steps)."""
    sched = {
        "team": team,
        "dataset_id": dataset_id,
        "sessions": [{"session_id": sid, "day": d, "start_period": int(st), "room_id": r}
                     for sid, (d, st, r) in sorted(assign.items())],
    }
    if bookings is not None or overrides is not None:
        sched["fest_week"] = {"bookings": bookings or [], "session_overrides": overrides or []}
    if exams is not None:
        sched["exams"] = exams
    return sched


def write_schedule(path, schedule):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2, ensure_ascii=False)
    return p


def read_assignments(schedule):
    return {e["session_id"]: (e["day"], e["start_period"], e["room_id"]) for e in schedule["sessions"]}
