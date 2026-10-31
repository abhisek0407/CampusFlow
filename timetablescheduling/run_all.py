"""Produce the full submission in one go: weekly timetable + fest-week bookings + exams (+ optional repair).

  python run_all.py                                                  # exports/schedule.json
  python run_all.py --disruption examples/sample_disruption.json    # also exports/schedule_after.json
  python run_all.py --time 180 --workers 8 --team my-team
Every solve prints its status by name; anything other than OPTIMAL is flagged.
"""
import argparse, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scheduler.load_data import load_dataset, load_json
from scheduler.pipeline import build_submission
from scheduler.repair import repair_all
from scheduler.export_schedule import write_schedule
from scheduler.validate_output import run_validator

ap = argparse.ArgumentParser()
ap.add_argument("--data", default=str(ROOT / "data" / "cit_public.json"))
ap.add_argument("--out-dir", default=str(ROOT / "exports"))
ap.add_argument("--validator", default=str(ROOT / "validator.py"))
ap.add_argument("--team", default="your-team")
ap.add_argument("--time", type=float, default=180, help="time limit per solve (seconds)")
ap.add_argument("--workers", type=int, default=8)
ap.add_argument("--disruption")
a = ap.parse_args()
out = Path(a.out_dir)


def flag(status):
    return status if status == "OPTIMAL" else f"{status}  <-- NOT proven optimal; raise --time"


def summary(rep):
    bk = rep.get("bookings", {})
    return (f"HARD VIOLATIONS {rep['hard_violation_count']} {rep['hard_by_rule']} | soft {rep['soft_total']} | "
            f"exam soft {rep.get('exam_soft_penalty')} | booking score {bk.get('booking_score')}/"
            f"{bk.get('booking_score_max_if_all_approved')} | inversions {len(bk.get('priority_inversions', []))}")


t0 = time.time()
data = load_dataset(a.data)
res = build_submission(data, team=a.team, time_limit=a.time, workers=a.workers, validator_path=a.validator)
for k, v in res["statuses"].items():
    print(f"status {k}: {flag(v)}")
path = write_schedule(out / "schedule.json", res["schedule"])
print("written", path)
print(summary(res["report"]))

if a.disruption:
    dis = load_json(a.disruption)
    r = repair_all(data, dis, res["schedule"], team=a.team, time_limit=a.time, workers=a.workers)
    if r["after"] is None:
        sys.exit(f"repair failed: {r['rep']['status']}")
    print(f"repair    : {flag(r['rep']['status'])} | forced {len(r['forced'])}")
    if r["dropped"]:
        print("UNPLACEABLE sessions (unavoidable hard violations):", sorted(r["dropped"]))
    p2 = write_schedule(out / "schedule_after.json", r["after"])
    rep2 = run_validator(r["data_full"], r["after"], a.validator, baseline=res["schedule"])
    st = rep2["stability"]
    print("written", p2)
    print(summary(rep2), f"| moved {st['sessions_moved']} ({st['time_changed']} time, {st['room_only_changed']} room only)")
print(f"total {time.time() - t0:.0f}s")
