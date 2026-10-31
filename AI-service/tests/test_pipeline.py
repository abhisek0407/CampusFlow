"""Tests for bookings, exams, repair and the one-call pipeline.  Solves are cached, so the whole file takes a few minutes.
Run:  python -m unittest discover -s tests -v
"""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scheduler.load_data import load_dataset, load_json, apply_disruption       # noqa: E402
from scheduler import bookings as B                                              # noqa: E402
from scheduler.exams import solve_exams                                          # noqa: E402
from scheduler.joint import solve_joint                                          # noqa: E402
from scheduler.pipeline import build_submission                                  # noqa: E402
from scheduler.repair import repair_all, solve_repair, forced_moves              # noqa: E402
from scheduler.export_schedule import build_schedule, read_assignments           # noqa: E402
from scheduler.validate_output import run_validator                              # noqa: E402

REPO_ROOT = ROOT.parent
DATA_PATH = REPO_ROOT / "CrunchWeek_StarterPack" / "data" / "cit_public.json"
VALIDATOR_PATH = REPO_ROOT / "CrunchWeek_StarterPack" / "validator.py"
DATA = load_dataset(DATA_PATH)
VALIDATOR = VALIDATOR_PATH
TL, WK = 120, 8
_cache = {}


def submission():
    if "sub" not in _cache:
        _cache["sub"] = build_submission(DATA, time_limit=TL, workers=WK, validator_path=VALIDATOR, log=lambda *_: None)
    return _cache["sub"]


def decisions():
    return {b["request_id"]: b for b in submission()["schedule"]["fest_week"]["bookings"]}


class TestBookings(unittest.TestCase):
    def test_every_request_has_one_decision(self):
        d = decisions()
        self.assertEqual(set(d), {r["id"] for r in DATA["booking_requests"]})

    def test_cancelled_never_approved(self):
        for c in DATA["cancellations"]:
            self.assertEqual(decisions()[c["request_id"]]["status"], "rejected")

    def test_role_cap(self):
        B.set_dataset(DATA)
        req = {r["id"]: r for r in DATA["booking_requests"]}
        self.assertEqual(B.eff_cat(req["BR-15"]), "club_event")        # a club asked for "institute_event"
        self.assertEqual(B.eff_cat(req["BR-12"]), "club_event")        # a club asked for "guest_lecture"

    def test_impossible_request_rejected_with_reason(self):
        d = decisions()["BR-09"]                                       # 1200 seats, largest suitable room 800
        self.assertEqual(d["status"], "rejected")
        self.assertTrue(d["reason"].strip())

    def test_window_past_last_period_gets_alternative(self):
        self.assertEqual(decisions()["BR-17"]["status"], "alternative_offered")   # window runs to P14

    def test_validator_accepts_everything_and_score_is_best_possible(self):
        rep = submission()["report"]
        self.assertEqual(rep["hard_violation_count"], 0, rep["hard_violations"][:3])
        bk = rep["bookings"]
        self.assertEqual(bk["priority_inversions"], [])
        self.assertGreaterEqual(bk["booking_score"], 67.0)            # proven ceiling on the public data

    def test_lower_category_never_displaces_a_class(self):
        overrides = submission()["schedule"]["fest_week"]["session_overrides"]
        by_req = {r["id"]: r for r in DATA["booking_requests"]}
        B.set_dataset(DATA)
        for o in overrides:
            self.assertLessEqual(B.ORDER.index(B.eff_cat(by_req[o["displaced_by"]])), B.ORDER.index("institute_event"))

    def test_displacement_moves_a_class_for_an_institute_event(self):
        """Force the 360-seat lecture into the auditorium during the inauguration (BR-01, MON P4-5)."""
        assign = dict(read_assignments(submission()["schedule"]))
        forced = copy.deepcopy(assign)
        forced["ID101-ALL-L1"] = ("MON", 4, "AUD")                     # 1-period lecture at P4: inside BR-01's window
        for sid, pos in list(forced.items()):                          # clear anything else sitting in AUD then
            if sid != "ID101-ALL-L1" and pos[0] == "MON" and pos[2] == "AUD":
                s = {x["id"]: x for x in DATA["sessions"]}[sid]
                if not (pos[1] + s["duration"] - 1 < 4 or pos[1] > 4):
                    forced.pop(sid)
        book, overrides = B.plan_bookings(DATA, forced)
        d = {b["request_id"]: b for b in book}
        self.assertEqual(d["BR-01"]["status"], "approved")
        self.assertIn("ID101-ALL-L1", [o["session_id"] for o in overrides])
        moved = next(o for o in overrides if o["session_id"] == "ID101-ALL-L1")
        self.assertNotEqual((moved["day"], moved["start_period"], moved["room_id"]), ("MON", 4, "AUD"))


class TestExams(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.res = solve_exams(DATA, time_limit=TL, workers=WK)

    def test_status_and_count(self):
        self.assertIn(self.res["status"], ("OPTIMAL", "FEASIBLE"))
        self.assertEqual(len(self.res["exams"]), len(DATA["exams"]))

    def test_seats_at_half_capacity(self):
        cap = {r["id"]: r["capacity"] // 2 for r in DATA["rooms"]}
        size = {e["id"]: e["size"] for e in DATA["exams"]}
        for e in self.res["exams"]:
            self.assertGreaterEqual(sum(cap[r] for r in e["rooms"]), size[e["exam_id"]])

    def test_validator_accepts_exams(self):
        rep = submission()["report"]
        self.assertEqual([v for v in rep["hard_violations"] if v["where"] == "exams"], [])
        self.assertEqual(rep["exam_soft_penalty"], self.res["day_penalty"])


class TestRepair(unittest.TestCase):
    def test_sample_disruption_moves_only_forced_sessions(self):
        dis = load_json(ROOT / "examples" / "sample_disruption.json")
        r = repair_all(DATA, dis, submission()["schedule"], time_limit=TL, workers=WK)
        self.assertEqual(r["dropped"], {})
        rep = run_validator(r["data_full"], r["after"], VALIDATOR, baseline=submission()["schedule"])
        self.assertEqual(rep["hard_violation_count"], 0, rep["hard_violations"][:3])
        moved = rep["stability"]["sessions_moved"]
        self.assertGreaterEqual(moved, len(r["forced"]))               # forced moves are a lower bound
        self.assertLessEqual(moved, len(r["forced"]) + 2)              # and we stay close to it

    def test_forced_moves_lower_bound(self):
        dis = {"id": "t", "changes": [{"type": "room_unavailable", "room_id": "CR-102",
                                       "days": ["MON", "TUE", "WED", "THU", "FRI"], "periods": list(range(1, 10))}]}
        base = read_assignments(submission()["schedule"])
        full = apply_disruption(DATA, dis)
        in_room = [s for s, (d, st, rm) in base.items() if rm == "CR-102"]
        self.assertEqual(forced_moves(full, base), sorted(in_room))

    def test_unplaceable_session_is_reported_not_a_crash(self):
        """Closing CIVIL-LAB Mon-Thu leaves 2 lab slots for 3 three-hour labs: one session cannot be placed."""
        dis = {"id": "t", "changes": [{"type": "room_unavailable", "room_id": "CIVIL-LAB",
                                       "days": ["MON", "TUE", "WED", "THU"], "periods": list(range(1, 10))}]}
        r = repair_all(DATA, dis, submission()["schedule"], time_limit=TL, workers=WK)
        self.assertIsNotNone(r["after"], r["rep"]["status"])
        self.assertEqual(len(r["dropped"]), 1)
        rep = run_validator(r["data_full"], r["after"], VALIDATOR, baseline=submission()["schedule"])
        self.assertEqual([v["detail"] for v in rep["hard_violations"]],
                         [f"Session {s} is not scheduled" for s in r["dropped"]])


if __name__ == "__main__":
    unittest.main()
