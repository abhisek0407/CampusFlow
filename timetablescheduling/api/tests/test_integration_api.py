"""INTEGRATION tests: real FastAPI app, real HTTP + WebSocket, fake (fast) solver unless noted.

Needs:  pip install -r api_requirements.txt          (fastapi, httpx, pydantic v2, uvicorn)
Run from the project root:
    python -m unittest discover -s api/tests -t . -p "test_integration*.py" -v

The last class runs the REAL OR-Tools scheduler through the API.  It is slow (minutes) and therefore opt-in:
    set CIT_RUN_SOLVER_TESTS=1        (PowerShell:  $env:CIT_RUN_SOLVER_TESTS = "1")
"""
import asyncio
import copy
import hashlib
import json
import os
import tempfile
import threading
import unittest
from pathlib import Path

try:
    import fastapi  # noqa: F401
    import pydantic  # noqa: F401
    HAVE_FASTAPI = True
except ImportError:                                                         # pragma: no cover
    HAVE_FASTAPI = False
try:
    from fastapi.testclient import TestClient
    HAVE_CLIENT = HAVE_FASTAPI
except (ImportError, RuntimeError):                                         # httpx missing
    HAVE_CLIENT = False
try:
    import ortools  # noqa: F401
    HAVE_ORTOOLS = True
except ImportError:
    HAVE_ORTOOLS = False

from api.auth import StaticTokenAuthProvider
from api.config import Settings
from api.services.job_manager import JobManager
from api.services.schedule_repository import InMemoryScheduleRepository
from api.tests.helpers import (ADMIN, ADMIN2, DATASET, ROOM_CHANGE, ROOT, SEED_SCHEDULE, SUPER, VIEWER, FakeRunner,
                               wait_until)

TOKENS = {"tok-alice": ADMIN, "tok-bob": ADMIN2, "tok-root": SUPER, "tok-carol": VIEWER}
H_ALICE = {"Authorization": "Bearer tok-alice"}
H_BOB = {"Authorization": "Bearer tok-bob"}
H_ROOT = {"Authorization": "Bearer tok-root"}
H_VIEWER = {"Authorization": "Bearer tok-carol"}
SAMPLE_BODY = {"mode": "repair", "base_version": "schedule-v1", "changes": ROOM_CHANGE, "time_limit_seconds": 30,
               "workers": 2, "team": "test-team"}
PROTECTED = ["validator.py", "data/cit_public.json", "examples/sample_disruption.json", "exports/schedule.json",
             "exports/schedule_after.json"]


def file_hashes():
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in PROTECTED}


class AppHarness:
    """Builds an app around fakes and exposes the pieces the tests need."""

    def __init__(self, runner=None, runner_factory=None, schedule=SEED_SCHEDULE, max_queued=5):
        from api.main import create_app
        self.tmp = tempfile.TemporaryDirectory()
        self.settings = Settings(runtime_dir=Path(self.tmp.name) / "runtime", max_queued_jobs=max_queued,
                                 solution_min_interval=0.0)
        self.repo = InMemoryScheduleRepository(DATASET, schedule, "schedule-v1")
        self.manager = JobManager()
        self.runner = runner or (runner_factory() if runner_factory else FakeRunner())
        self.app = create_app(settings=self.settings, auth_provider=StaticTokenAuthProvider(TOKENS),
                              schedule_repo=self.repo, job_manager=self.manager, runner=self.runner)

    def close(self):
        self.app.state.scheduler_service.shutdown()
        self.tmp.cleanup()


def collect_stream(client, job_id, headers, after_seq=0, limit=500):
    """Read WebSocket events until the server ends the stream."""
    events = []
    with client.websocket_connect(f"/ws/scheduler/jobs/{job_id}?after_seq={after_seq}", headers=headers) as ws:
        for _ in range(limit):
            msg = ws.receive_json()
            events.append(msg)
            if msg["event"] in ("proposal_ready", "job_failed"):
                break
    return events


def wait_job(client, job_id, headers=H_ALICE, timeout=15):
    box = {}

    def done():
        r = client.get(f"/api/scheduler/jobs/{job_id}", headers=headers)
        box["job"] = r.json()
        return r.status_code == 200 and box["job"]["status"] in ("COMPLETED", "FAILED")

    assert wait_until(done, timeout), f"job did not finish: {box}"
    return box["job"]


# ============================================================================================ schemas (pydantic)
@unittest.skipUnless(HAVE_FASTAPI, "fastapi/pydantic not installed")
class TestSchemas(unittest.TestCase):
    def setUp(self):
        from api.schemas import StartJobRequest
        self.Req = StartJobRequest

    def test_valid_requests(self):
        r = self.Req(**SAMPLE_BODY)
        self.assertEqual(r.changes[0].type, "room_unavailable")
        self.assertEqual(self.Req(mode="generate").changes, [])
        dumped = [c.model_dump(exclude_none=True) for c in r.changes]
        self.assertEqual(dumped[0]["room_id"], "CR-102")

    def test_bounds_and_unknown_fields_are_rejected(self):
        from pydantic import ValidationError
        bad = [dict(SAMPLE_BODY, time_limit_seconds=0), dict(SAMPLE_BODY, time_limit_seconds=100000),
               dict(SAMPLE_BODY, workers=0), dict(SAMPLE_BODY, workers=1000), dict(SAMPLE_BODY, mode="delete_all"),
               dict(SAMPLE_BODY, team="../../etc"), dict(SAMPLE_BODY, surprise=1),
               dict(SAMPLE_BODY, changes=[{"type": "room_unavailability", "room_id": "x", "days": ["MON"],
                                           "periods": [1]}]),
               dict(SAMPLE_BODY, changes=[{"type": "room_unavailable", "room_id": "CR-102", "days": [],
                                           "periods": [1]}]),
               dict(SAMPLE_BODY, changes=ROOM_CHANGE * 201)]
        for body in bad:
            with self.assertRaises(ValidationError, msg=str(body)[:80]):
                self.Req(**body)


# ============================================================================================ HTTP + WebSocket
@unittest.skipUnless(HAVE_CLIENT, "fastapi + httpx not installed (pip install -r api_requirements.txt)")
class TestHttpAndWebSocket(unittest.TestCase):
    def start(self, **kw):
        self.h = AppHarness(**kw)
        self.addCleanup(self.h.close)
        self.client = TestClient(self.h.app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)
        return self.client

    # ---- security ---------------------------------------------------------------------------------------------
    def test_every_route_requires_authentication_and_the_admin_role(self):
        c = self.start()
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        wait_job(c, job)
        routes = [("post", "/api/scheduler/jobs", SAMPLE_BODY), ("get", "/api/scheduler/active", None),
                  ("get", f"/api/scheduler/jobs/{job}", None), ("get", f"/api/scheduler/jobs/{job}/result", None),
                  ("post", f"/api/scheduler/jobs/{job}/approve", None),
                  ("post", f"/api/scheduler/jobs/{job}/reject", None)]
        for method, url, body in routes:
            kw = {"json": body} if body else {}
            self.assertEqual(getattr(c, method)(url, **kw).status_code, 401, url)                      # no token
            self.assertEqual(getattr(c, method)(url, headers={"Authorization": "Bearer nope"}, **kw).status_code, 401)
            self.assertEqual(getattr(c, method)(url, headers=H_VIEWER, **kw).status_code, 403, url)    # not an admin
        self.assertEqual(c.get(f"/api/scheduler/jobs/{job}", headers=H_BOB).status_code, 404)          # not their job
        self.assertEqual(c.post(f"/api/scheduler/jobs/{job}/approve", headers=H_BOB).status_code, 404)
        self.assertEqual(c.get(f"/api/scheduler/jobs/{job}", headers=H_ROOT).status_code, 200)         # super admin
        self.assertEqual(self.h.repo.active_version(), "schedule-v1")

    def test_websocket_requires_a_valid_token_and_access_to_that_job(self):
        c = self.start()
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        wait_job(c, job)
        for headers in ({}, {"Authorization": "Bearer nope"}, H_VIEWER, H_BOB):
            with self.assertRaises(Exception):                                  # handshake refused
                with c.websocket_connect(f"/ws/scheduler/jobs/{job}", headers=headers):
                    pass
        with self.assertRaises(Exception):
            with c.websocket_connect(f"/ws/scheduler/jobs/{'0' * 32}", headers=H_ALICE):
                pass
        with c.websocket_connect(f"/ws/scheduler/jobs/{job}?token=tok-alice") as ws:    # browser-style token
            self.assertEqual(ws.receive_json()["event"], "job_queued")

    def test_health_is_public_and_docs_are_served(self):
        c = self.start()
        self.assertEqual(c.get("/health").json(), {"status": "ok"})
        self.assertEqual(c.get("/docs").status_code, 200)

    # ---- request validation ------------------------------------------------------------------------------------
    def test_invalid_payloads_get_422_and_start_no_job(self):
        c = self.start()
        bad_bodies = [dict(SAMPLE_BODY, workers=99), dict(SAMPLE_BODY, time_limit_seconds=0),
                      dict(SAMPLE_BODY, mode="nope"), dict(SAMPLE_BODY, changes=[]),
                      dict(SAMPLE_BODY, changes=[{"type": "room_unavailable", "room_id": "NO-SUCH-ROOM",
                                                  "days": ["MON"], "periods": [1]}]),
                      dict(SAMPLE_BODY, changes=[{"type": "drop_database"}])]
        for body in bad_bodies:
            self.assertEqual(c.post("/api/scheduler/jobs", json=body, headers=H_ALICE).status_code, 422, body)
        self.assertEqual(self.h.runner.calls, [])
        self.assertEqual(self.h.manager.active_count(), 0)

    def test_stale_base_version_is_a_409(self):
        c = self.start()
        r = c.post("/api/scheduler/jobs", json=dict(SAMPLE_BODY, base_version="schedule-v7"), headers=H_ALICE)
        self.assertEqual(r.status_code, 409)

    # ---- the main flow ---------------------------------------------------------------------------------------------
    def test_post_returns_202_promptly_while_the_solver_is_still_running(self):
        gate = threading.Event()
        c = self.start(runner=FakeRunner(hold=gate))
        r = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE)
        self.assertEqual(r.status_code, 202)
        body = r.json()
        self.assertEqual(body["status"], "QUEUED")
        self.assertEqual(body["websocket_url"], f"/ws/scheduler/jobs/{body['job_id']}")
        self.assertTrue(self.h.runner.started.wait(5))
        self.assertEqual(c.get(f"/api/scheduler/jobs/{body['job_id']}", headers=H_ALICE).json()["status"], "RUNNING")
        self.assertEqual(c.get(f"/api/scheduler/jobs/{body['job_id']}/result", headers=H_ALICE).status_code, 409)
        gate.set()
        wait_job(c, body["job_id"])

    def test_job_can_run_against_a_caller_owned_mongodb_snapshot(self):
        snapshot = copy.deepcopy(DATASET)
        snapshot["institute"] = "CampusFlow Mongo snapshot"
        c = self.start()
        r = c.post("/api/scheduler/jobs", json={"mode": "generate", "dataset_snapshot": snapshot},
                   headers=H_ALICE)
        self.assertEqual(r.status_code, 202, r.text)
        job_id = r.json()["job_id"]
        wait_job(c, job_id)
        self.assertEqual(self.h.runner.data_seen[0]["institute"], "CampusFlow Mongo snapshot")
        result = c.get(f"/api/scheduler/jobs/{job_id}/result", headers=H_ALICE)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["dataset_after"]["institute"], "CampusFlow Mongo snapshot")

    def test_official_validator_accepts_a_caller_owned_mongodb_snapshot(self):
        c = self.start()
        response = c.post("/api/scheduler/validate", json={
            "dataset_snapshot": DATASET,
            "schedule": SEED_SCHEDULE,
        }, headers=H_ALICE)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["validator"]["hard_violation_count"], 0)
        self.assertEqual(self.h.runner.validated[-1][0], DATASET["dataset_id"])

    def test_websocket_streams_ordered_events_live_until_the_proposal_is_ready(self):
        gate = threading.Event()
        c = self.start(runner=FakeRunner(hold=gate))
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        self.assertTrue(self.h.runner.started.wait(5))
        threading.Timer(0.3, gate.set).start()                                  # finish while the socket is open
        events = collect_stream(c, job, H_ALICE)
        seqs = [e["seq"] for e in events]
        self.assertEqual(seqs, list(range(1, len(seqs) + 1)))                   # strictly increasing, no gaps
        names = [e["event"] for e in events]
        self.assertEqual(names[0], "job_queued")
        self.assertEqual(names[-1], "proposal_ready")
        for needed in ("job_started", "stage_started", "solver_started", "solution_improved", "solver_finished",
                       "stage_completed", "validation_completed"):
            self.assertIn(needed, names)
        for e in events:
            self.assertEqual(set(e), {"job_id", "seq", "event", "timestamp", "payload"})
            self.assertEqual(e["job_id"], job)
        finished = next(e for e in events if e["event"] == "solver_finished")
        self.assertEqual(finished["payload"]["status"], "OPTIMAL")

    def test_job_runs_to_completion_with_no_websocket_and_missed_events_can_be_replayed(self):
        c = self.start()
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        view = wait_job(c, job)                                                 # nobody was connected
        self.assertEqual(view["status"], "COMPLETED")
        full = collect_stream(c, job, H_ALICE)
        self.assertEqual(full[0]["event"], "job_queued")
        self.assertEqual(full[-1]["event"], "proposal_ready")
        cut = full[3]["seq"]
        resumed = collect_stream(c, job, H_ALICE, after_seq=cut)
        self.assertEqual([e["seq"] for e in resumed], [e["seq"] for e in full if e["seq"] > cut])
        self.assertEqual(view["latest_seq"], full[-1]["seq"])

    def test_disconnecting_the_browser_does_not_stop_the_scheduler(self):
        gate = threading.Event()
        c = self.start(runner=FakeRunner(hold=gate))
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        self.assertTrue(self.h.runner.started.wait(5))
        with c.websocket_connect(f"/ws/scheduler/jobs/{job}", headers=H_ALICE) as ws:
            self.assertEqual(ws.receive_json()["event"], "job_queued")
        # socket closed here (browser gone) while the solver is still blocked
        self.assertEqual(c.get(f"/api/scheduler/jobs/{job}", headers=H_ALICE).json()["status"], "RUNNING")
        gate.set()
        self.assertEqual(wait_job(c, job)["status"], "COMPLETED")

    def test_result_has_proposal_statuses_and_validator_report(self):
        c = self.start()
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        wait_job(c, job)
        res = c.get(f"/api/scheduler/jobs/{job}/result", headers=H_ALICE)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["solver_statuses"], {"repair": "OPTIMAL"})
        self.assertEqual(body["validator"]["hard_violation_count"], 0)
        self.assertTrue(body["approvable"])
        self.assertEqual(len(body["schedule"]["sessions"]), len(SEED_SCHEDULE["sessions"]))
        self.assertGreaterEqual(len(body["changes_vs_active"]), 1)
        self.assertNotIn("Traceback", res.text)
        self.assertNotIn(str(ROOT), res.text)                                   # no local paths leak to the browser

    def test_preview_never_touches_active_state_or_files(self):
        before = file_hashes()
        c = self.start()
        active_before = self.h.repo.get_active()
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        wait_job(c, job)
        active_after = self.h.repo.get_active()
        self.assertEqual((active_before.version, active_before.dataset, active_before.schedule),
                         (active_after.version, active_after.dataset, active_after.schedule))
        self.assertEqual(before, file_hashes())
        self.assertTrue((Path(self.h.settings.runtime_dir) / "jobs" / job / "proposal_schedule.json").is_file())

    def test_reject_then_approve_flow_and_stale_protection(self):
        c = self.start()
        active = c.get("/api/scheduler/active", headers=H_ALICE).json()
        self.assertEqual(active["version"], "schedule-v1")
        a = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        b = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        d = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        for j in (a, b, d):
            wait_job(c, j)
        # reject leaves everything unchanged
        r = c.post(f"/api/scheduler/jobs/{d}/reject", headers=H_ALICE)
        self.assertEqual((r.status_code, r.json()["proposal_status"]), (200, "REJECTED"))
        self.assertEqual(c.get("/api/scheduler/active", headers=H_ALICE).json()["version"], "schedule-v1")
        self.assertEqual(c.post(f"/api/scheduler/jobs/{d}/approve", headers=H_ALICE).status_code, 409)
        # approve a -> new version, b becomes stale
        r = c.post(f"/api/scheduler/jobs/{a}/approve", headers=H_ALICE)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["active_version"], "schedule-v2")
        self.assertEqual(c.get("/api/scheduler/active", headers=H_ALICE).json()["version"], "schedule-v2")
        self.assertEqual(c.get(f"/api/scheduler/jobs/{b}", headers=H_ALICE).json()["proposal_status"], "STALE")
        r = c.post(f"/api/scheduler/jobs/{b}/approve", headers=H_ALICE)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.h.repo.active_version(), "schedule-v2")
        self.assertEqual(c.post(f"/api/scheduler/jobs/{a}/approve", headers=H_ALICE).status_code, 409)   # not twice
        # a new job must now be based on v2; the old base_version is refused
        self.assertEqual(c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).status_code, 409)
        # the stale event is replayable
        names = [e["event"] for e in self.h.manager.events_after(b, 0)]
        self.assertEqual(names[-1], "proposal_stale")

    def test_unclean_results_cannot_be_approved(self):
        for runner in (FakeRunner(hard=3), FakeRunner(dropped={"ID101-ALL-L1": {"x": 1}})):
            c = self.start(runner=runner)
            job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
            wait_job(c, job)
            body = c.get(f"/api/scheduler/jobs/{job}/result", headers=H_ALICE).json()
            self.assertFalse(body["approvable"])
            self.assertTrue(body["blocking_reasons"])
            r = c.post(f"/api/scheduler/jobs/{job}/approve", headers=H_ALICE)
            self.assertEqual(r.status_code, 422)
            self.assertTrue(r.json()["errors"])
            self.assertEqual(self.h.repo.active_version(), "schedule-v1")

    def test_infeasible_unknown_and_model_invalid_never_become_proposals(self):
        for status in ("INFEASIBLE", "UNKNOWN", "MODEL_INVALID"):
            c = self.start(runner=FakeRunner(status=status))
            job = c.post("/api/scheduler/jobs", json={"mode": "generate"}, headers=H_ALICE).json()["job_id"]
            view = wait_job(c, job)
            self.assertEqual(view["status"], "FAILED")
            self.assertEqual(view["solver_statuses"].get("timetable+bookings"), status)
            self.assertEqual(c.get(f"/api/scheduler/jobs/{job}/result", headers=H_ALICE).status_code, 409)
            self.assertEqual(c.post(f"/api/scheduler/jobs/{job}/approve", headers=H_ALICE).status_code, 409)

    def test_solver_exception_gives_failed_job_and_a_safe_error_event(self):
        c = self.start(runner=FakeRunner(raise_exc=ValueError("C:\\secret\\path boom")))
        job = c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"]
        view = wait_job(c, job)
        self.assertEqual(view["status"], "FAILED")
        events = collect_stream(c, job, H_ALICE)
        self.assertEqual(events[-1]["event"], "job_failed")
        self.assertNotIn("secret", str(events) + str(view))
        self.assertTrue(events[-1]["payload"]["log_ref"])

    def test_only_one_solve_at_a_time_and_a_full_queue_is_rejected_with_429(self):
        gate = threading.Event()
        c = self.start(runner=FakeRunner(hold=gate), max_queued=2)
        ids = [c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).json()["job_id"] for _ in range(2)]
        self.assertTrue(self.h.runner.started.wait(5))
        self.assertEqual(c.post("/api/scheduler/jobs", json=SAMPLE_BODY, headers=H_ALICE).status_code, 429)
        statuses = sorted(c.get(f"/api/scheduler/jobs/{i}", headers=H_ALICE).json()["status"] for i in ids)
        self.assertEqual(statuses, ["QUEUED", "RUNNING"])
        gate.set()
        for i in ids:
            wait_job(c, i)
        self.assertEqual(self.h.runner.max_concurrent, 1)


# ============================================================================================ WebSocket handler
class FakeWebSocket:
    """Just enough of Starlette's WebSocket to drive ``job_events`` directly (no network)."""

    def __init__(self, app, headers=None, query=None, fail_after=None):
        self.app, self.headers, self.query_params = app, headers or {}, query or {}
        self.sent, self.accepted, self.closed_code, self.fail_after = [], False, None, fail_after

    async def accept(self):
        self.accepted = True

    async def send_json(self, data):
        from fastapi import WebSocketDisconnect
        if self.fail_after is not None and len(self.sent) >= self.fail_after:
            raise WebSocketDisconnect(1001)
        self.sent.append(data)

    async def close(self, code=1000):
        self.closed_code = code


@unittest.skipUnless(HAVE_FASTAPI, "fastapi not installed")
class TestWebSocketHandler(unittest.TestCase):
    def setUp(self):
        from api.routes.scheduler import job_events
        self.handler = job_events

    def harness(self, **kw):
        h = AppHarness(**kw)
        self.addCleanup(h.close)
        return h

    def run_handler(self, ws, job_id, after_seq=0):
        asyncio.run(self.handler(ws, job_id, after_seq))

    def submit(self, h, principal=ADMIN):
        job = h.app.state.scheduler_service.submit(principal, mode="repair", changes=ROOM_CHANGE)
        return job.job_id

    def test_rejects_missing_wrong_and_foreign_credentials_before_accepting(self):
        h = self.harness()
        job = self.submit(h)
        cases = [({}, 4401), ({"authorization": "Bearer nope"}, 4401), ({"authorization": "Bearer tok-carol"}, 4403),
                 ({"authorization": "Bearer tok-bob"}, 4404)]
        for headers, code in cases:
            ws = FakeWebSocket(h.app, headers=headers)
            self.run_handler(ws, job)
            self.assertFalse(ws.accepted, headers)
            self.assertEqual(ws.closed_code, code, headers)
        ws = FakeWebSocket(h.app, headers={"authorization": "Bearer tok-alice"})
        self.run_handler(ws, "f" * 32)
        self.assertEqual(ws.closed_code, 4404)
        self.assertTrue(wait_until(lambda: h.manager.snapshot(job).status == "COMPLETED"),
                        "the submitted job must finish before its temporary artifact directory is removed")

    def test_full_stream_and_replay_with_after_seq(self):
        h = self.harness()
        job = self.submit(h)
        wait_until(lambda: h.manager.snapshot(job).status == "COMPLETED")
        ws = FakeWebSocket(h.app, query={"token": "tok-alice"})
        self.run_handler(ws, job)
        self.assertTrue(ws.accepted)
        seqs = [e["seq"] for e in ws.sent]
        self.assertEqual(seqs, list(range(1, len(seqs) + 1)))
        self.assertEqual(ws.sent[-1]["event"], "proposal_ready")
        ws2 = FakeWebSocket(h.app, headers={"authorization": "Bearer tok-alice"})
        self.run_handler(ws2, job, after_seq=seqs[-3])
        self.assertEqual([e["seq"] for e in ws2.sent], seqs[-2:])
        ws3 = FakeWebSocket(h.app, headers={"authorization": "Bearer tok-alice"})   # nothing new: closes, no hang
        self.run_handler(ws3, job, after_seq=seqs[-1])
        self.assertEqual(ws3.sent, [])

    def test_live_events_arrive_while_the_solver_runs(self):
        gate = threading.Event()
        h = self.harness(runner=FakeRunner(hold=gate))
        job = self.submit(h)
        self.assertTrue(h.runner.started.wait(5))
        threading.Timer(0.3, gate.set).start()
        ws = FakeWebSocket(h.app, headers={"authorization": "Bearer tok-alice"})
        self.run_handler(ws, job)
        names = [e["event"] for e in ws.sent]
        self.assertEqual(names[0], "job_queued")
        self.assertEqual(names[-1], "proposal_ready")
        self.assertIn("solution_improved", names)

    def test_client_disconnect_removes_the_subscription_and_never_cancels_the_job(self):
        gate = threading.Event()
        h = self.harness(runner=FakeRunner(hold=gate))
        job = self.submit(h)
        self.assertTrue(h.runner.started.wait(5))
        ws = FakeWebSocket(h.app, headers={"authorization": "Bearer tok-alice"}, fail_after=1)
        self.run_handler(ws, job)                                            # the "browser" dies after one event
        self.assertEqual(len(ws.sent), 1)
        self.assertEqual(h.manager._subs.get(job), [])                       # no leaked subscriber
        self.assertEqual(h.manager.snapshot(job).status, "RUNNING")
        gate.set()
        self.assertTrue(wait_until(lambda: h.manager.snapshot(job).status == "COMPLETED"))

    def test_failed_job_stream_ends_with_job_failed(self):
        h = self.harness(runner=FakeRunner(raise_exc=ValueError("boom")))
        job = self.submit(h)
        wait_until(lambda: h.manager.snapshot(job).status == "FAILED")
        ws = FakeWebSocket(h.app, headers={"authorization": "Bearer tok-alice"})
        self.run_handler(ws, job)
        self.assertEqual(ws.sent[-1]["event"], "job_failed")


# ============================================================================================ REAL solver (opt-in)
@unittest.skipUnless(HAVE_CLIENT and HAVE_ORTOOLS and os.environ.get("CIT_RUN_SOLVER_TESTS") == "1",
                     "slow: set CIT_RUN_SOLVER_TESTS=1 (needs fastapi, httpx, ortools)")
class TestRealSolverThroughApi(unittest.TestCase):
    """Runs the genuine CP-SAT scheduler + official validator behind the API.  Takes a few minutes."""

    TL, WORKERS = 120, 8

    @classmethod
    def setUpClass(cls):
        from api.services.runner import RealSchedulerRunner
        cls.h = AppHarness(runner=RealSchedulerRunner())
        cls.h.app.state.scheduler_service.settings.validator_path = ROOT / "validator.py"
        cls.client = TestClient(cls.h.app)
        cls.client.__enter__()
        cls.hashes = file_hashes()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        cls.h.close()

    def stream(self, body):
        r = self.client.post("/api/scheduler/jobs", json=body, headers=H_ALICE)
        self.assertEqual(r.status_code, 202, r.text)
        job = r.json()["job_id"]
        return job, collect_stream(self.client, job, H_ALICE, limit=20000)

    def check_stream(self, events, stages):
        seqs = [e["seq"] for e in events]
        self.assertEqual(seqs, list(range(1, len(seqs) + 1)))
        names = [e["event"] for e in events]
        self.assertEqual(names[-1], "proposal_ready")
        started = [e for e in events if e["event"] == "solver_started"]
        self.assertGreaterEqual(len(started), len(stages))
        self.assertEqual(started[0]["payload"]["time_limit_seconds"], float(self.TL))
        self.assertEqual(started[0]["payload"]["workers"], self.WORKERS)
        improved = [e["payload"] for e in events if e["event"] == "solution_improved"]
        self.assertGreaterEqual(len(improved), 1, "CP-SAT should report at least one incumbent solution")
        for p in improved:
            self.assertIsInstance(p["objective"], float)                     # genuine values, not percentages
            self.assertNotIn("percent", p)
        finished = {e["payload"]["stage"]: e["payload"]["status"] for e in events if e["event"] == "solver_finished"}
        for st in stages:
            self.assertIn(finished[st], ("OPTIMAL", "FEASIBLE"))

    def test_generate_preview_with_real_solver(self):
        body = {"mode": "generate", "time_limit_seconds": self.TL, "workers": self.WORKERS, "team": "api-test"}
        job, events = self.stream(body)
        self.check_stream(events, ["joint_timetable_booking", "exam_scheduling"])
        res = self.client.get(f"/api/scheduler/jobs/{job}/result", headers=H_ALICE).json()
        self.assertEqual(res["validator"]["hard_violation_count"], 0, res["validator"]["hard_violations"][:3])
        self.assertGreaterEqual(res["validator"]["booking_score"], 67.0)       # proven ceiling on the public data
        self.assertEqual(set(res["solver_statuses"]), {"timetable+bookings", "exams"})
        self.assertEqual(file_hashes(), self.hashes)                            # exports/ and data untouched

    def test_repair_preview_with_real_solver_and_sample_disruption(self):
        dis = json.loads((ROOT / "examples" / "sample_disruption.json").read_text(encoding="utf-8"))
        body = {"mode": "repair", "changes": dis["changes"], "time_limit_seconds": self.TL,
                "workers": self.WORKERS}
        job, events = self.stream(body)
        self.check_stream(events, ["repair_solve"])
        res = self.client.get(f"/api/scheduler/jobs/{job}/result", headers=H_ALICE).json()
        self.assertEqual(res["validator"]["hard_violation_count"], 0, res["validator"]["hard_violations"][:3])
        moved = res["validator"]["stability"]["sessions_moved"]
        self.assertGreaterEqual(moved, res["summary"]["forced_moves"])         # forced moves are a lower bound
        self.assertLessEqual(moved, res["summary"]["forced_moves"] + 2)
        self.assertEqual(file_hashes(), self.hashes)


if __name__ == "__main__":
    unittest.main()
