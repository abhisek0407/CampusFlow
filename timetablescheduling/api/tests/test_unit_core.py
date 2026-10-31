"""UNIT tests for the API core.  Needs only the standard library: no FastAPI, no OR-Tools, no real solve.

Run from the project root:
    python -m unittest discover -s api/tests -t . -p "test_unit*.py" -v
"""
import ast
import asyncio
import copy
import hashlib
import json
import logging
import threading
import unittest
from pathlib import Path

from api.auth import Principal, StaticTokenAuthProvider, can_access_job
from api.errors import Conflict, Forbidden, NotApprovable, NotFound, QueueFull, StaleVersion, ValidationFailed
from api.services.approval_policy import evaluate_proposal, summarize_report
from api.services.changes import validate_changes
from api.services.job_manager import COMPLETED, FAILED, JobManager, QUEUED, RUNNING
from api.services.progress_bridge import JobProgressReporter
from api.services.schedule_repository import InMemoryScheduleRepository
from api.tests.helpers import (ADMIN, ADMIN2, DATASET, ROOM_CHANGE, ROOT, SEED_SCHEDULE, SUPER, VIEWER, FakeRunner,
                               make_report, make_service, wait_status, wait_until)

SAMPLE = json.loads((ROOT / "examples" / "sample_disruption.json").read_text(encoding="utf-8"))


def setUpModule():
    logging.disable(logging.CRITICAL)             # expected server-side error logs would only add noise here


def tearDownModule():
    logging.disable(logging.NOTSET)


# Preservation guard: files the brief says must never be edited.
PROTECTED_SHA256 = {
    "validator.py": "f02733b382fa111e89cd6bb261e185ae57da6e41795f094b96cab1575d6ee144",
    "data/cit_public.json": "8351362143097f1a0d80ce91f31bd1f2d77bd7e738f8701d48ad28fdf64ba8dd",
    "examples/sample_disruption.json": "57a31a10e5862f37850c42a7906ea96ff095cbcf07e6ca8d3dc30e9ba1c6e3c6",
}


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


# ===================================================================================================== change checks
class TestChanges(unittest.TestCase):
    def test_sample_disruption_is_valid_and_normalized(self):
        out = validate_changes(SAMPLE["changes"], DATASET)
        self.assertEqual([c["type"] for c in out], ["faculty_unavailable", "room_unavailable", "add_session"])
        self.assertEqual(out[2]["session"]["basket_slot"], None)

    def test_unknown_ids_and_values_are_rejected_with_every_problem_listed(self):
        bad = [{"type": "room_unavailable", "room_id": "NOPE", "days": ["XXX"], "periods": [99]},
               {"type": "faculty_unavailable", "faculty_id": "F999", "days": ["MON"], "periods": [1]},
               {"type": "remove_session", "session_id": "NOT-A-SESSION"}]
        with self.assertRaises(ValidationFailed) as cm:
            validate_changes(bad, DATASET)
        text = " ".join(cm.exception.details)
        for needle in ("NOPE", "'days'", "'periods'", "F999", "NOT-A-SESSION"):
            self.assertIn(needle, text)

    def test_unsupported_type_is_rejected(self):
        with self.assertRaises(ValidationFailed) as cm:
            validate_changes([{"type": "room_unavailability", "room_id": "CR-102"}], DATASET)  # old spelling
        self.assertIn("unsupported change type", cm.exception.details[0])

    def test_empty_and_oversized_lists_rejected(self):
        with self.assertRaises(ValidationFailed):
            validate_changes([], DATASET)
        with self.assertRaises(ValidationFailed):
            validate_changes(ROOM_CHANGE * 201, DATASET)

    def test_duplicate_session_and_bad_references(self):
        s = copy.deepcopy(SAMPLE["changes"][2]["session"])
        s["id"] = DATASET["sessions"][0]["id"]
        s["groups"] = ["NO-GROUP"]
        s["room_types"] = ["swimming_pool"]
        with self.assertRaises(ValidationFailed) as cm:
            validate_changes([{"type": "add_session", "session": s}], DATASET)
        text = " ".join(cm.exception.details)
        self.assertIn("already exists", text)
        self.assertIn("groups", text)
        self.assertIn("room_types", text)

    def test_changes_in_one_batch_may_refer_to_each_other(self):
        new_fac = {"id": "F900", "name": "New Faculty", "department": "CSE", "max_hours_per_day": 4}
        s = copy.deepcopy(SAMPLE["changes"][2]["session"])
        s.update(id="CS202-T9", faculty_id="F900")
        out = validate_changes([{"type": "add_faculty", "faculty": new_fac},
                                {"type": "add_session", "session": s},
                                {"type": "remove_session", "session_id": "CS202-T9"}], DATASET)
        self.assertEqual(out[0]["faculty"]["unavailable"], [])           # default added so apply_disruption works

    def test_validation_does_not_mutate_input(self):
        before = copy.deepcopy(SAMPLE["changes"])
        validate_changes(SAMPLE["changes"], DATASET)
        self.assertEqual(before, SAMPLE["changes"])


# ===================================================================================================== approval policy
class TestApprovalPolicy(unittest.TestCase):
    OK = {"timetable+bookings": "OPTIMAL", "exams": "OPTIMAL"}

    def test_clean_optimal_is_approvable(self):
        v = evaluate_proposal({"sessions": []}, make_report(), self.OK)
        self.assertTrue(v["approvable"])
        self.assertEqual(v["warnings"], [])

    def test_feasible_is_approvable_with_a_warning(self):
        v = evaluate_proposal({"sessions": []}, make_report(), {"exams": "OPTIMAL", "timetable+bookings": "FEASIBLE"})
        self.assertTrue(v["approvable"])
        self.assertIn("optimality is NOT proven", v["warnings"][0])

    def test_blockers(self):
        for status in ("INFEASIBLE", "UNKNOWN", "MODEL_INVALID", "SOMETHING_ELSE"):
            v = evaluate_proposal({"sessions": []}, make_report(), {"repair": status})
            self.assertFalse(v["approvable"], status)
            self.assertIn(status, v["blocking_reasons"][0])
        self.assertFalse(evaluate_proposal({"s": 1}, make_report(hard=2), self.OK)["approvable"])
        self.assertFalse(evaluate_proposal({"s": 1}, make_report(), self.OK, dropped={"S1": {}})["approvable"])
        self.assertFalse(evaluate_proposal(None, make_report(), self.OK)["approvable"])
        self.assertFalse(evaluate_proposal({"s": 1}, None, self.OK)["approvable"])
        self.assertFalse(evaluate_proposal({"s": 1}, make_report(), {})["approvable"])

    def test_relaxed_room_use_is_only_a_warning(self):
        v = evaluate_proposal({"s": 1}, make_report(), self.OK, relaxed_uses=["A-1"])
        self.assertTrue(v["approvable"])
        self.assertIn("allowed use", v["warnings"][0])

    def test_summary_is_small_and_complete(self):
        s = summarize_report(make_report(hard=3))
        self.assertEqual(s["hard_violation_count"], 3)
        self.assertEqual(len(s["hard_violations"]), 3)
        self.assertEqual(s["booking_score"], 67.0)
        self.assertEqual(s["stability"]["sessions_moved"], 1)
        self.assertIsNone(summarize_report(None))


# ===================================================================================================== schedule repository
class TestScheduleRepository(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryScheduleRepository({"d": 1}, {"s": 1}, "schedule-v1")

    def test_commit_changes_dataset_and_schedule_together_and_bumps_version(self):
        v = self.repo.commit("schedule-v1", {"d": 2}, {"s": 2}, {"by": "alice"})
        self.assertEqual(v, "schedule-v2")
        a = self.repo.get_active()
        self.assertEqual((a.version, a.dataset, a.schedule), ("schedule-v2", {"d": 2}, {"s": 2}))
        self.assertEqual([h["version"] for h in self.repo.history()], ["schedule-v1", "schedule-v2"])

    def test_stale_commit_is_refused_and_changes_nothing(self):
        self.repo.commit("schedule-v1", {"d": 2}, {"s": 2})
        with self.assertRaises(StaleVersion):
            self.repo.commit("schedule-v1", {"d": 3}, {"s": 3})
        a = self.repo.get_active()
        self.assertEqual((a.version, a.dataset), ("schedule-v2", {"d": 2}))

    def test_returned_state_is_a_private_copy(self):
        a = self.repo.get_active()
        a.dataset["d"] = 999
        self.assertEqual(self.repo.get_active().dataset, {"d": 1})

    def test_only_one_of_many_concurrent_commits_wins(self):
        results = []

        def go(i):
            try:
                results.append(self.repo.commit("schedule-v1", {"d": i}, {"s": i}))
            except StaleVersion:
                results.append("stale")

        ts = [threading.Thread(target=go, args=(i,)) for i in range(8)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        self.assertEqual(results.count("stale"), 7)
        self.assertEqual(self.repo.active_version(), "schedule-v2")


# ===================================================================================================== job manager
class TestJobManager(unittest.TestCase):
    def setUp(self):
        self.m = JobManager(max_stored_jobs=3)
        self.job = self.m.create_job("alice", "generate", "schedule-v1", [], {"workers": 1})

    def test_sequence_numbers_are_strictly_increasing_and_envelope_is_complete(self):
        for i in range(5):
            self.m.emit(self.job.job_id, "stage_started", {"stage": f"s{i}"})
        ev = self.m.events_after(self.job.job_id, 0)
        self.assertEqual([e["seq"] for e in ev], [1, 2, 3, 4, 5])
        self.assertEqual(set(ev[0]), {"job_id", "seq", "event", "timestamp", "payload"})
        self.assertTrue(ev[0]["timestamp"].endswith("Z"))

    def test_replay_after_seq(self):
        for i in range(5):
            self.m.emit(self.job.job_id, "x", {"i": i})
        self.assertEqual([e["seq"] for e in self.m.events_after(self.job.job_id, 3)], [4, 5])
        self.assertEqual(self.m.events_after(self.job.job_id, 5), [])
        self.assertEqual(self.m.latest_seq(self.job.job_id), 5)

    def test_events_from_many_threads_get_unique_ordered_seq(self):
        ts = [threading.Thread(target=lambda: [self.m.emit(self.job.job_id, "x") for _ in range(50)])
              for _ in range(4)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        seqs = [e["seq"] for e in self.m.events_after(self.job.job_id, 0)]
        self.assertEqual(seqs, list(range(1, 201)))

    def test_update_and_emit_is_one_step(self):
        self.m.update_and_emit(self.job.job_id, "job_failed", {"message": "boom"}, status=FAILED, error="boom")
        self.assertEqual(self.m.snapshot(self.job.job_id).status, FAILED)
        self.assertEqual(self.m.events_after(self.job.job_id, 0)[-1]["event"], "job_failed")

    def test_unknown_field_is_rejected(self):
        with self.assertRaises(AttributeError):
            self.m.update(self.job.job_id, not_a_field=1)

    def test_eviction_only_drops_finished_jobs(self):
        ids = [self.job.job_id] + [self.m.create_job("a", "generate", "v", [], {}).job_id for _ in range(2)]
        self.m.update(ids[0], status=COMPLETED)
        self.m.update(ids[1], status=RUNNING)
        self.m.create_job("a", "generate", "v", [], {})            # 4th job -> evict the finished one
        self.assertIsNone(self.m.get(ids[0]))
        self.assertIsNotNone(self.m.get(ids[1]))

    def test_subscription_wakes_from_another_thread(self):
        async def scenario():
            sub = self.m.subscribe(self.job.job_id, asyncio.get_running_loop())
            threading.Timer(0.05, lambda: self.m.emit(self.job.job_id, "x")).start()
            loop = asyncio.get_running_loop()
            t0 = loop.time()
            await sub.wait(timeout=3.0)
            self.m.unsubscribe(self.job.job_id, sub)
            return loop.time() - t0

        waited = asyncio.run(scenario())
        self.assertLess(waited, 1.5)                                  # woken by the event, not by the timeout
        self.assertEqual(self.m.latest_seq(self.job.job_id), 1)

    def test_notify_after_loop_closed_is_harmless(self):
        loop = asyncio.new_event_loop()
        sub = self.m.subscribe(self.job.job_id, loop)
        loop.close()
        self.m.emit(self.job.job_id, "x")                             # must not raise inside a solver callback
        self.assertTrue(sub.closed)


# ===================================================================================================== progress bridge
class TestProgressReporter(unittest.TestCase):
    def setUp(self):
        self.m = JobManager()
        self.job = self.m.create_job("alice", "generate", "v1", [], {})
        self.now = [0.0]

    def reporter(self, **kw):
        return JobProgressReporter(self.m, self.job.job_id, clock=lambda: self.now[0], **kw)

    def names(self):
        return [e["event"] for e in self.m.events_after(self.job.job_id, 0)]

    def test_stage_and_status_tracking(self):
        r = self.reporter()
        r("stage_started", {"stage": "joint_timetable_booking"})
        self.assertEqual(self.m.snapshot(self.job.job_id).stage, "joint_timetable_booking")
        r("solver_finished", {"stage": "joint_timetable_booking", "status": "FEASIBLE"})
        r("stage_completed", {"stage": "exam_scheduling", "status": "OPTIMAL"})
        self.assertEqual(self.m.snapshot(self.job.job_id).solver_statuses,
                         {"timetable+bookings": "FEASIBLE", "exams": "OPTIMAL"})

    def test_solution_events_are_throttled(self):
        r = self.reporter(solution_min_interval=0.5)
        for i in range(10):
            r("solution_improved", {"objective": 100 - i})
            self.now[0] += 0.1                                         # 10 solutions in 1 second
        self.assertEqual(self.names().count("solution_improved"), 2)

    def test_solver_log_is_off_by_default(self):
        r = self.reporter()
        self.assertFalse(r.wants_solver_log)

    def test_solver_log_is_batched_truncated_and_capped(self):
        r = self.reporter(stream_solver_log=True, log_min_interval=1.0, max_log_events=2)
        self.assertTrue(r.wants_solver_log)
        r("solver_log", {"stage": "exam_scheduling", "line": "A" * 1000})   # first line flushes immediately
        for i in range(5):
            r("solver_log", {"line": f"line {i}"})                          # batched until the interval passes
        self.assertEqual(self.names().count("solver_log"), 1)
        self.now[0] += 2.0
        r("solver_log", {"line": "late"})
        self.assertEqual(self.names().count("solver_log"), 2)
        first = self.m.events_after(self.job.job_id, 0)[0]["payload"]["lines"]
        self.assertLessEqual(len(first), 200)
        self.now[0] += 2.0
        r("solver_log", {"line": "over the cap"})
        self.assertEqual(self.names().count("solver_log"), 2)

    def test_only_small_scalar_values_pass(self):
        r = self.reporter()
        r("stage_started", {"stage": "x", "evil": {"nested": "dict"}, "big": ["a"] * 1000, "message": "m" * 5000})
        p = self.m.events_after(self.job.job_id, 0)[0]["payload"]
        self.assertNotIn("evil", p)
        self.assertNotIn("big", p)
        self.assertEqual(len(p["message"]), 300)


# ===================================================================================================== auth
class TestAuth(unittest.TestCase):
    def test_roles(self):
        self.assertTrue(ADMIN.is_admin and not ADMIN.is_super_admin)
        self.assertTrue(SUPER.is_admin and SUPER.is_super_admin)
        self.assertFalse(VIEWER.is_admin)

    def test_job_access_rule(self):
        self.assertTrue(can_access_job(ADMIN, "alice"))
        self.assertFalse(can_access_job(ADMIN2, "alice"))
        self.assertTrue(can_access_job(SUPER, "alice"))
        self.assertFalse(can_access_job(VIEWER, "carol"))
        self.assertFalse(can_access_job(None, "alice"))

    def test_static_provider(self):
        p = StaticTokenAuthProvider({"tok": Principal("u", frozenset({"admin"}))})
        self.assertEqual(p.authenticate("tok").user_id, "u")
        for bad in (None, "", "tok ", "TOK", "other"):
            self.assertIsNone(p.authenticate(bad))

    def test_from_env_parsing_and_secure_default(self):
        import os
        old = os.environ.get("CIT_TEST_TOKENS")
        try:
            os.environ["CIT_TEST_TOKENS"] = "t1:alice:admin, t2:bob:admin|super_admin, broken, :x:y"
            p = StaticTokenAuthProvider.from_env("CIT_TEST_TOKENS")
            self.assertEqual(p.authenticate("t1").user_id, "alice")
            self.assertTrue(p.authenticate("t2").is_super_admin)
            os.environ["CIT_TEST_TOKENS"] = ""
            self.assertIsNone(StaticTokenAuthProvider.from_env("CIT_TEST_TOKENS").authenticate("anything"))
        finally:
            if old is None:
                os.environ.pop("CIT_TEST_TOKENS", None)
            else:
                os.environ["CIT_TEST_TOKENS"] = old


# ===================================================================================================== service
def event_names(manager, job_id):
    return [e["event"] for e in manager.events_after(job_id, 0)]


class TestSchedulerService(unittest.TestCase):
    def tearDown(self):
        if hasattr(self, "svc"):
            self.svc.shutdown()
            self.svc._tmp.cleanup()

    def build(self, **kw):
        self.svc, self.repo, self.mgr, self.runner, self.settings = make_service(**kw)
        return self.svc

    # ---- submit / queue -------------------------------------------------------------------------------------
    def test_submit_returns_immediately_while_the_solver_is_still_running(self):
        gate = threading.Event()
        svc = self.build(runner=FakeRunner(hold=gate))
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE, base_version="schedule-v1")
        self.assertEqual(job.status, QUEUED)                              # returned before the worker finished
        self.assertTrue(self.runner.started.wait(5))
        self.assertEqual(self.mgr.snapshot(job.job_id).status, RUNNING)
        with self.assertRaises(Conflict):
            svc.get_result(ADMIN, job.job_id)                             # not ready yet
        gate.set()
        wait_status(self.mgr, job.job_id)

    def test_only_one_solver_runs_at_a_time_and_others_queue(self):
        gate = threading.Event()
        svc = self.build(runner=FakeRunner(hold=gate))
        jobs = [svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE) for _ in range(3)]
        self.assertTrue(self.runner.started.wait(5))
        self.assertTrue(wait_until(lambda: self.mgr.snapshot(jobs[0].job_id).status == RUNNING))
        self.assertEqual([self.mgr.snapshot(j.job_id).status for j in jobs[1:]], [QUEUED, QUEUED])
        gate.set()
        for j in jobs:
            wait_status(self.mgr, j.job_id)
        self.assertEqual(self.runner.max_concurrent, 1)

    def test_queue_limit_rejects_extra_jobs_clearly(self):
        gate = threading.Event()
        svc = self.build(runner=FakeRunner(hold=gate), max_queued=2)
        svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        with self.assertRaises(QueueFull):
            svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        gate.set()

    def test_bounds_and_validation_happen_before_any_solver_time_is_spent(self):
        svc = self.build()
        for kw in ({"time_limit_seconds": 0}, {"time_limit_seconds": 10_000}, {"workers": 0}, {"workers": 99}):
            with self.assertRaises(ValidationFailed):
                svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE, **kw)
        with self.assertRaises(ValidationFailed):
            svc.submit(ADMIN, mode="repair", changes=[{"type": "room_unavailable", "room_id": "NOPE",
                                                       "days": ["MON"], "periods": [1]}])
        with self.assertRaises(ValidationFailed):
            svc.submit(ADMIN, mode="repair", changes=[])
        with self.assertRaises(ValidationFailed):
            svc.submit(ADMIN, mode="bogus")
        self.assertEqual(self.runner.calls, [])

    def test_base_version_must_match_the_active_version(self):
        svc = self.build()
        with self.assertRaises(StaleVersion):
            svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE, base_version="schedule-v0")

    def test_repair_needs_an_active_schedule(self):
        svc = self.build(schedule=None)
        with self.assertRaises(Conflict):
            svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        job = svc.submit(ADMIN, mode="generate")                          # generate does not need one
        self.assertEqual(wait_status(self.mgr, job.job_id).status, COMPLETED)

    # ---- events / result --------------------------------------------------------------------------------------
    def test_event_stream_is_ordered_and_reflects_real_stages(self):
        svc = self.build()
        job = svc.submit(ADMIN, mode="generate")
        wait_status(self.mgr, job.job_id)
        events = self.mgr.events_after(job.job_id, 0)
        seqs = [e["seq"] for e in events]
        self.assertEqual(seqs, sorted(set(seqs)))
        self.assertEqual(seqs, list(range(1, len(seqs) + 1)))
        names = [e["event"] for e in events]
        self.assertEqual(names[0], "job_queued")
        self.assertEqual(names[1], "job_started")
        self.assertEqual(names[-1], "proposal_ready")
        for needed in ("stage_started", "stage_completed", "solver_started", "solution_improved", "solver_finished",
                       "validation_completed"):
            self.assertIn(needed, names)
        self.assertLess(names.index("validation_completed"), names.index("proposal_ready"))
        started = next(e for e in events if e["event"] == "solver_started")["payload"]
        self.assertEqual((started["time_limit_seconds"], started["workers"]), (5.0, 2))
        finished = next(e for e in events if e["event"] == "solver_finished")["payload"]
        self.assertEqual(finished["status"], "OPTIMAL")
        self.assertNotIn("percent", json.dumps(events).lower())           # no fabricated percentages

    def test_result_contains_proposal_statuses_and_validator_report(self):
        svc = self.build()
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        wait_status(self.mgr, job.job_id)
        res = svc.get_result(ADMIN, job.job_id)
        self.assertEqual(res["solver_statuses"], {"repair": "OPTIMAL"})
        self.assertEqual(res["validator"]["hard_violation_count"], 0)
        self.assertTrue(res["approvable"])
        self.assertEqual(res["proposal_status"], "PENDING_REVIEW")
        self.assertEqual(len(res["schedule"]["sessions"]), len(SEED_SCHEDULE["sessions"]))
        self.assertEqual(res["changes_vs_active"][0]["to"]["room_id"], "ROOM-MOVED")   # compare with the timetable
        self.assertEqual(self.runner.validated[0][0], "cit-public-v1")                 # validator ran on the data
        view = svc.get_job(ADMIN, job.job_id)
        self.assertTrue(view["result_available"])
        self.assertEqual(view["latest_seq"], self.mgr.latest_seq(job.job_id))

    def test_generate_mode_applies_optional_changes_to_the_snapshot_only(self):
        svc = self.build()
        job = svc.submit(ADMIN, mode="generate", changes=ROOM_CHANGE)
        wait_status(self.mgr, job.job_id)
        seen = self.runner.data_seen[0]
        self.assertEqual(len(seen["room_unavailability"]), len(DATASET["room_unavailability"]) + 1)
        self.assertEqual(self.repo.get_active().dataset, DATASET)         # the active dataset is untouched

    # ---- failure handling -------------------------------------------------------------------------------------
    def test_solver_exception_ends_in_failed_with_a_safe_message(self):
        svc = self.build(runner=FakeRunner(raise_exc=ValueError("secret C:\\path\\to\\file.py line 42")))
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        j = wait_status(self.mgr, job.job_id)
        self.assertEqual(j.status, FAILED)
        failed = self.mgr.events_after(job.job_id, 0)[-1]
        self.assertEqual(failed["event"], "job_failed")
        blob = json.dumps(failed) + str(j.error)
        self.assertNotIn("secret", blob)
        self.assertNotIn("Traceback", blob)
        self.assertIsNotNone(failed["payload"]["log_ref"])
        with self.assertRaises(Conflict):
            svc.get_result(ADMIN, job.job_id)

    def test_infeasible_generate_fails_and_keeps_the_exact_status(self):
        for status in ("INFEASIBLE", "UNKNOWN", "MODEL_INVALID"):
            svc = self.build(runner=FakeRunner(status=status))
            job = svc.submit(ADMIN, mode="generate")
            j = wait_status(self.mgr, job.job_id)
            self.assertEqual(j.status, FAILED)
            self.assertIn(status, j.error)
            self.assertEqual(j.solver_statuses.get("timetable+bookings"), status)
            self.assertEqual(j.proposal_status, "NONE")
            svc.shutdown()
            svc._tmp.cleanup()

    def test_repair_without_a_schedule_is_a_failure_not_a_proposal(self):
        svc = self.build(runner=FakeRunner(status="UNKNOWN", after_none=True))
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        j = wait_status(self.mgr, job.job_id)
        self.assertEqual(j.status, FAILED)
        self.assertIn("UNKNOWN", j.error)
        with self.assertRaises(Conflict):
            svc.approve(ADMIN, job.job_id)                                      # nothing to approve

    def test_a_job_never_stays_stuck_even_if_the_worker_dies_with_a_base_exception(self):
        class Boom(BaseException):                                               # not an Exception: skips except blocks
            pass

        svc = self.build(runner=FakeRunner(raise_exc=Boom()))
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        j = wait_status(self.mgr, job.job_id)                                    # the `finally` block ends it
        self.assertEqual(j.status, FAILED)
        self.assertEqual(event_names(self.mgr, job.job_id).count("job_failed"), 1)

    def test_failing_twice_emits_only_one_terminal_event(self):
        svc = self.build()
        job = self.mgr.create_job("alice", "repair", "schedule-v1", [], {})
        self.mgr.update(job.job_id, status=RUNNING)
        svc._fail(job.job_id, "x", None)
        svc._fail(job.job_id, "again", None)
        self.assertEqual(self.mgr.snapshot(job.job_id).status, FAILED)
        self.assertEqual(event_names(self.mgr, job.job_id).count("job_failed"), 1)

    # ---- preview must not touch anything ---------------------------------------------------------------------
    def test_preview_does_not_mutate_active_state_source_files_or_exports(self):
        before_files = {p: sha(p) for p in list(PROTECTED_SHA256) + ["exports/schedule.json",
                                                                      "exports/schedule_after.json"]}
        svc = self.build()
        before = self.repo.get_active()
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        wait_status(self.mgr, job.job_id)
        after = self.repo.get_active()
        self.assertEqual((before.version, before.dataset, before.schedule),
                         (after.version, after.dataset, after.schedule))
        self.assertEqual(before_files, {p: sha(p) for p in before_files})
        runtime = Path(self.settings.runtime_dir) / "jobs" / job.job_id         # artifacts live in the job dir only
        self.assertTrue((runtime / "proposal_schedule.json").is_file())
        self.assertEqual(self.repo.history()[-1]["version"], "schedule-v1")

    # ---- approve / reject / stale ----------------------------------------------------------------------------
    def finished_job(self, svc, **kw):
        job = svc.submit(ADMIN, mode=kw.pop("mode", "repair"), changes=kw.pop("changes", ROOM_CHANGE), **kw)
        wait_status(self.mgr, job.job_id)
        return job

    def test_approve_swaps_dataset_and_schedule_together_and_keeps_history(self):
        svc = self.build()
        job = self.finished_job(svc)
        res = svc.approve(ADMIN, job.job_id)
        self.assertEqual(res["active_version"], "schedule-v2")
        active = self.repo.get_active()
        self.assertEqual(active.version, "schedule-v2")
        self.assertEqual(active.schedule["sessions"][0]["room_id"], "ROOM-MOVED")
        self.assertEqual(len(active.dataset["room_unavailability"]), len(DATASET["room_unavailability"]) + 1)
        self.assertEqual([h["version"] for h in self.repo.history()], ["schedule-v1", "schedule-v2"])
        self.assertEqual(self.mgr.snapshot(job.job_id).proposal_status, "APPROVED")
        self.assertEqual(event_names(self.mgr, job.job_id)[-1], "proposal_approved")
        with self.assertRaises(Conflict):
            svc.approve(ADMIN, job.job_id)                                      # no double approval
        with self.assertRaises(Conflict):
            svc.reject(ADMIN, job.job_id)

    def test_reject_leaves_everything_unchanged(self):
        svc = self.build()
        job = self.finished_job(svc)
        before = self.repo.get_active()
        res = svc.reject(ADMIN, job.job_id)
        after = self.repo.get_active()
        self.assertEqual(res["proposal_status"], "REJECTED")
        self.assertEqual((before.version, before.dataset, before.schedule),
                         (after.version, after.dataset, after.schedule))
        self.assertEqual(event_names(self.mgr, job.job_id)[-1], "proposal_rejected")
        with self.assertRaises(Conflict):
            svc.approve(ADMIN, job.job_id)

    def test_stale_proposal_cannot_overwrite_a_newer_version(self):
        svc = self.build()
        a, b = self.finished_job(svc), self.finished_job(svc)                    # both generated from schedule-v1
        svc.approve(ADMIN, a.job_id)
        self.assertEqual(self.mgr.snapshot(b.job_id).proposal_status, "STALE")   # flagged as soon as v2 exists
        self.assertEqual(event_names(self.mgr, b.job_id)[-1], "proposal_stale")
        with self.assertRaises(StaleVersion):
            svc.approve(ADMIN, b.job_id)
        self.assertEqual(self.repo.active_version(), "schedule-v2")
        self.assertEqual(len(self.repo.history()), 2)

    def test_commit_race_detected_at_approval_time_marks_the_proposal_stale(self):
        svc = self.build()
        job = self.finished_job(svc)
        self.repo.commit("schedule-v1", DATASET, SEED_SCHEDULE, {"source": "someone else"})   # out-of-band change
        with self.assertRaises(StaleVersion):
            svc.approve(ADMIN, job.job_id)
        self.assertEqual(self.mgr.snapshot(job.job_id).proposal_status, "STALE")
        self.assertEqual(event_names(self.mgr, job.job_id)[-1], "proposal_stale")

    def test_hard_violations_block_approval_and_show_the_reason(self):
        svc = self.build(runner=FakeRunner(hard=2))
        job = self.finished_job(svc)
        res = svc.get_result(ADMIN, job.job_id)
        self.assertFalse(res["approvable"])
        self.assertEqual(res["proposal_status"], "BLOCKED")
        self.assertIn("2 hard violation", res["blocking_reasons"][0])
        with self.assertRaises(NotApprovable) as cm:
            svc.approve(ADMIN, job.job_id)
        self.assertIn("hard violation", cm.exception.details[0])
        self.assertEqual(self.repo.active_version(), "schedule-v1")

    def test_dropped_sessions_block_approval(self):
        svc = self.build(runner=FakeRunner(dropped={"ID101-ALL-L1": {"no room": 1}}))
        job = self.finished_job(svc)
        with self.assertRaises(NotApprovable):
            svc.approve(ADMIN, job.job_id)
        self.assertIn("could not be placed", svc.get_result(ADMIN, job.job_id)["blocking_reasons"][0])

    def test_feasible_is_previewable_and_approvable_with_a_warning(self):
        svc = self.build(runner=FakeRunner(status="FEASIBLE"))
        job = self.finished_job(svc)
        res = svc.get_result(ADMIN, job.job_id)
        self.assertTrue(res["approvable"])
        self.assertEqual(res["solver_statuses"], {"repair": "FEASIBLE"})
        self.assertIn("NOT proven", res["warnings"][0])

    # ---- authorization ----------------------------------------------------------------------------------------
    def test_only_admins_may_submit_and_only_the_owner_or_a_super_admin_may_read(self):
        svc = self.build()
        with self.assertRaises(Forbidden):
            svc.submit(VIEWER, mode="repair", changes=ROOM_CHANGE)
        with self.assertRaises(Forbidden):
            svc.submit(None, mode="repair", changes=ROOM_CHANGE)
        job = self.finished_job(svc)
        for call in (svc.get_job, svc.get_result, svc.approve, svc.reject, svc.authorize_job):
            with self.assertRaises(NotFound):
                call(ADMIN2, job.job_id)                                         # another admin: same as "missing"
            with self.assertRaises(Forbidden):
                call(VIEWER, job.job_id)
            with self.assertRaises(NotFound):
                call(ADMIN, "0" * 32)
        self.assertEqual(svc.get_job(SUPER, job.job_id)["job_id"], job.job_id)
        self.assertEqual(self.repo.active_version(), "schedule-v1")              # the refused approvals changed nothing

    # ---- disconnect / replay ----------------------------------------------------------------------------------
    def test_subscriber_leaving_midway_does_not_stop_the_job_and_events_can_be_replayed(self):
        gate = threading.Event()
        svc = self.build(runner=FakeRunner(hold=gate))
        job = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        self.assertTrue(self.runner.started.wait(5))

        async def watch_then_leave():
            sub = self.mgr.subscribe(job.job_id, asyncio.get_running_loop())
            seen = self.mgr.latest_seq(job.job_id)
            self.mgr.unsubscribe(job.job_id, sub)                                # "browser closed"
            return seen

        seen = asyncio.run(watch_then_leave())
        gate.set()
        j = wait_status(self.mgr, job.job_id)
        self.assertEqual(j.status, COMPLETED)
        missed = self.mgr.events_after(job.job_id, seen)
        self.assertGreater(len(missed), 0)
        self.assertEqual(missed[0]["seq"], seen + 1)
        self.assertEqual(missed[-1]["event"], "proposal_ready")

    def test_shutdown_ends_queued_jobs_instead_of_leaving_them_stuck(self):
        gate = threading.Event()
        svc = self.build(runner=FakeRunner(hold=gate))
        running = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        self.assertTrue(self.runner.started.wait(5))
        queued = svc.submit(ADMIN, mode="repair", changes=ROOM_CHANGE)
        svc.shutdown()
        self.assertEqual(self.mgr.snapshot(queued.job_id).status, FAILED)
        gate.set()
        wait_status(self.mgr, running.job_id)


# ===================================================================================================== preservation
class TestPreservation(unittest.TestCase):
    """The brief: add a layer AROUND the scheduler; never change it."""

    def test_protected_files_are_unchanged(self):
        for rel, digest in PROTECTED_SHA256.items():
            self.assertEqual(sha(rel), digest, f"{rel} must not be edited")

    def test_scheduler_functions_only_gained_optional_progress_parameters(self):
        expected = {"pipeline.py": {"build_submission"}, "joint.py": {"solve_joint"}, "exams.py": {"solve_exams"},
                    "repair.py": {"solve_repair", "repair_all", "_attempt"}}
        for fname, funcs in expected.items():
            tree = ast.parse((ROOT / "scheduler" / fname).read_text(encoding="utf-8"))
            found = {n.name: n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name in funcs}
            self.assertEqual(set(found), funcs)
            for name, fn in found.items():
                args = fn.args.args
                defaults = dict(zip([a.arg for a in args][-len(fn.args.defaults):], fn.args.defaults))
                self.assertIn("progress_callback", defaults, f"{fname}:{name}")
                self.assertIsNone(defaults["progress_callback"].value)           # default None = old behaviour
                self.assertEqual(args[-1].arg, "progress_callback")              # appended LAST: positional calls OK

    def test_default_path_still_calls_solve_exactly_as_before(self):
        for fname in ("joint.py", "exams.py", "repair.py"):
            src = (ROOT / "scheduler" / fname).read_text(encoding="utf-8")
            self.assertIn("solver.Solve(m))", src, fname)

    def test_scheduler_package_does_not_depend_on_the_web_layer(self):
        for path in (ROOT / "scheduler").glob("*.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                mods = ([a.name for a in node.names] if isinstance(node, ast.Import) else
                        [node.module or ""] if isinstance(node, ast.ImportFrom) else [])
                for m in mods:
                    self.assertNotRegex(m, r"^(fastapi|starlette|uvicorn|pydantic|api)(\.|$)",
                                        f"{path.name} imports {m}")

    def test_api_code_never_starts_subprocesses(self):
        for path in (ROOT / "api").rglob("*.py"):
            if "tests" in path.parts:
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    names = [a.name for a in node.names] + [getattr(node, "module", "") or ""]
                    self.assertFalse(any(n.split(".")[0] == "subprocess" for n in names), path.name)
                if isinstance(node, ast.Attribute):
                    self.assertNotIn(node.attr, ("Popen", "system"), path.name)


if __name__ == "__main__":
    unittest.main()
