"""Orchestration of scheduling jobs.  Route handlers stay thin and call this class.

Flow of a preview (brief section 3A):
  submit()  : check role, version, capacity, change payload  ->  snapshot the ACTIVE state  ->  create job  ->  queue it
  _run_job(): (single worker thread) call the EXISTING scheduler through a ``SchedulerRunner``, stream real progress
              events, run the official validator, store a PROPOSAL.  The active dataset/schedule is never touched.
  approve() : admin + job access + approvable + version still current  ->  atomic commit of dataset + schedule.
"""
import logging
import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

from scheduler.load_data import apply_disruption

from ..auth import can_access_job
from ..errors import Conflict, Forbidden, NotApprovable, NotFound, QueueFull, StaleVersion, ValidationFailed
from .approval_policy import evaluate_proposal, summarize_report
from .changes import validate_changes
from .job_manager import (COMPLETED, FAILED, JOB_TERMINAL, P_APPROVED, P_BLOCKED, P_NONE, P_PENDING, P_REJECTED,
                          P_STALE, QUEUED, RUNNING, utc_now)
from .progress_bridge import JobProgressReporter

_log = logging.getLogger(__name__)

MODES = ("generate", "repair")
MAX_TIME_LIMIT, MAX_WORKERS = 900, 16
MAX_DIFF_ROWS = 500


class SchedulerFailure(Exception):
    """A failure whose message is already safe to show to the Admin."""


def _placement(entry):
    return {"day": entry["day"], "start_period": entry["start_period"], "room_id": entry["room_id"]}


def diff_schedules(base, new):
    """Sessions whose placement differs between two schedules (compare a proposal with the active timetable)."""
    if not base or not new:
        return []
    a = {e["session_id"]: _placement(e) for e in base.get("sessions", [])}
    b = {e["session_id"]: _placement(e) for e in new.get("sessions", [])}
    rows = []
    for sid in sorted(set(a) | set(b)):
        if a.get(sid) != b.get(sid):
            rows.append({"session_id": sid, "from": a.get(sid), "to": b.get(sid)})
    return rows


class SchedulerService:
    def __init__(self, settings, schedule_repo, job_manager, runner, artifacts=None, executor=None):
        self.settings = settings
        self.repo = schedule_repo
        self.jobs = job_manager
        self.runner = runner
        self.artifacts = artifacts
        # ONE scheduling job at a time: CP-SAT already uses N internal workers, and the scheduler keeps module-level
        # lookups.  Further jobs wait in this executor's queue (bounded by settings.max_queued_jobs).
        self._executor = executor or ThreadPoolExecutor(max_workers=1, thread_name_prefix="scheduler-worker")
        self._submit_lock = Lock()
        self._decision_lock = Lock()

    # ------------------------------------------------------------------------------------------------ access
    def _require_admin(self, principal):
        if principal is None or not principal.is_admin:
            raise Forbidden("Only an Admin may use the scheduler.")

    def _authorized_job(self, principal, job_id):
        self._require_admin(principal)
        job = self.jobs.snapshot(job_id)
        if job is None or not can_access_job(principal, job.requested_by):
            raise NotFound("Job not found.")                       # same answer for "missing" and "not yours"
        return job

    def authorize_job(self, principal, job_id):
        """Used by the WebSocket route: returns a job snapshot or raises Forbidden / NotFound."""
        return self._authorized_job(principal, job_id)

    # ------------------------------------------------------------------------------------------------ submit
    def submit(self, principal, *, mode, changes=None, base_version=None, time_limit_seconds=180, workers=8,
               team="your-team", dataset_snapshot=None, baseline_schedule=None):
        self._require_admin(principal)
        if mode not in MODES:
            raise ValidationFailed("mode must be 'generate' or 'repair'.")
        if not (1 <= float(time_limit_seconds) <= MAX_TIME_LIMIT) or not (1 <= int(workers) <= MAX_WORKERS):
            raise ValidationFailed(f"time_limit_seconds must be 1-{MAX_TIME_LIMIT} and workers 1-{MAX_WORKERS}.")
        active = self.repo.get_active()                           # private seed copy; only its local version is used below
        if base_version is not None and base_version != active.version:
            raise StaleVersion(f"base_version {base_version!r} is not the active version ({active.version}). "
                               "Reload the active schedule and try again.")
        # Copy caller data before handing it to the worker; the caller's Mongo snapshot is authoritative for this job.
        if dataset_snapshot is not None:
            required = {"dataset_id", "calendar", "rooms", "faculty", "student_groups", "courses", "sessions",
                        "booking_requests", "exams"}
            arrays = required - {"dataset_id", "calendar"}
            if (not required.issubset(dataset_snapshot) or not isinstance(dataset_snapshot.get("calendar"), dict)
                    or any(not isinstance(dataset_snapshot.get(key), list) for key in arrays)):
                raise ValidationFailed("dataset_snapshot is incomplete or invalid.")
            active = type(active)(active.version, copy.deepcopy(dataset_snapshot),
                                  copy.deepcopy(baseline_schedule) if baseline_schedule is not None
                                  else copy.deepcopy(active.schedule))
        elif baseline_schedule is not None:
            active = type(active)(active.version, active.dataset, copy.deepcopy(baseline_schedule))

        normalized = []
        if mode == "repair":
            if active.schedule is None:
                raise Conflict("There is no active schedule to repair. Generate and approve one first.")
            normalized = validate_changes(changes, active.dataset)
        elif changes:
            normalized = validate_changes(changes, active.dataset)

        with self._submit_lock:                                   # capacity check + create must be one step
            if self.jobs.active_count() >= self.settings.max_queued_jobs:
                raise QueueFull("The scheduler queue is full. Try again when a running job has finished.")
            position = self.jobs.active_count()
            job = self.jobs.create_job(
                principal.user_id, mode, active.version, normalized,
                {"time_limit_seconds": float(time_limit_seconds), "workers": int(workers), "team": team,
                "seed": self.settings.default_seed, "external_snapshot": dataset_snapshot is not None})
            self.jobs.emit(job.job_id, "job_queued", {"mode": mode, "base_version": active.version,
                                                      "queue_position": position})
            queued = self.jobs.snapshot(job.job_id)                # taken BEFORE the worker can start it
            try:
                self._executor.submit(self._run_job, job.job_id, active, normalized)
            except RuntimeError:                                   # executor already shut down
                self._fail(job.job_id, "The scheduler is shutting down.", None)
                raise Conflict("The scheduler is shutting down.")
        return queued

    # ------------------------------------------------------------------------------------------------ worker
    def _run_job(self, job_id, active, changes):
        try:
            self._execute(job_id, active, changes)
        except SchedulerFailure as e:
            self._fail(job_id, str(e), e)
        except RuntimeError as e:                                  # build_submission: "no timetable: INFEASIBLE ..."
            self._fail(job_id, f"The scheduler could not produce a schedule: {str(e)[:300]}", e)
        except Exception as e:                                     # unexpected: details only in the server log
            self._fail(job_id, "The scheduler failed unexpectedly.", e)
        finally:
            j = self.jobs.snapshot(job_id)                         # a job must NEVER stay stuck as QUEUED/RUNNING
            if j is not None and j.status not in JOB_TERMINAL:
                self._fail(job_id, "The scheduler stopped unexpectedly.", None)

    def _fail(self, job_id, message, exc):
        j = self.jobs.snapshot(job_id)
        if j is None or j.status in JOB_TERMINAL:
            return
        ref = uuid.uuid4().hex[:8]
        if exc is not None:
            _log.error("job %s failed [ref %s]", job_id, ref, exc_info=exc)
        else:
            _log.error("job %s ended without a terminal state [ref %s]", job_id, ref)
        self.jobs.update_and_emit(job_id, "job_failed", {"message": message, "log_ref": ref}, status=FAILED,
                                  error=message, log_ref=ref, completed_at=utc_now(), proposal_status=P_NONE)

    def _execute(self, job_id, active, changes):
        job = self.jobs.snapshot(job_id)
        p = job.params
        report_cb = JobProgressReporter(self.jobs, job_id, stream_solver_log=self.settings.stream_solver_log,
                                        solution_min_interval=self.settings.solution_min_interval,
                                        log_min_interval=self.settings.log_min_interval)
        self.jobs.update(job_id, status=RUNNING, started_at=utc_now())
        self.jobs.emit(job_id, "job_started", {"mode": job.mode, "time_limit_seconds": p["time_limit_seconds"],
                                               "workers": p["workers"]})
        validator = self.settings.validator_path

        def step_log(msg):
            _log.info("[job %s] %s", job_id, msg)

        report_cb("stage_started", {"stage": "loading_input", "message": "Preparing the input snapshot"})
        baseline = active.schedule
        if job.mode == "generate":
            data_run = apply_disruption(active.dataset, {"changes": changes}) if changes else active.dataset
        else:
            data_run = active.dataset
        report_cb("stage_completed", {"stage": "loading_input"})

        dropped, relaxed, forced = {}, [], []
        if job.mode == "generate":
            res = self.runner.generate(data_run, team=p["team"], time_limit=p["time_limit_seconds"],
                                       workers=p["workers"], seed=p["seed"], validator_path=validator,
                                       progress_callback=report_cb, log=step_log)
            schedule, report, statuses, data_after = res["schedule"], res["report"], dict(res["statuses"]), data_run
        else:
            disruption = {"id": f"api-{job_id}", "dataset": active.dataset.get("dataset_id"), "changes": changes}
            rr = self.runner.repair(active.dataset, disruption, baseline, team=p["team"],
                                    time_limit=p["time_limit_seconds"], workers=p["workers"],
                                    progress_callback=report_cb)
            status = rr["rep"]["status"]
            statuses = {"repair": status}
            dropped, forced = dict(rr.get("dropped") or {}), list(rr.get("forced") or [])
            relaxed = list(rr["rep"].get("relaxed_uses") or [])
            if rr["after"] is None:
                raise SchedulerFailure(f"The repair solver produced no schedule (status {status}).")
            schedule, data_after = rr["after"], rr["data_full"]
            report_cb("stage_started", {"stage": "official_validation", "message": "Running the official validator"})
            report = self.runner.validate(data_after, schedule, validator, baseline=baseline)
            report_cb("stage_completed", {"stage": "official_validation"})

        verdict = evaluate_proposal(schedule, report, statuses, dropped=dropped, relaxed_uses=relaxed)
        vsum = summarize_report(report) or {}
        validation_payload = {k: vsum[k] for k in ("hard_violation_count", "soft_total", "exam_soft_penalty",
                                                   "booking_score") if vsum.get(k) is not None}
        if vsum.get("stability"):
            validation_payload["sessions_moved"] = vsum["stability"]["sessions_moved"]
        self.jobs.emit(job_id, "validation_completed", validation_payload)

        diff = diff_schedules(baseline, schedule)
        summary = {"sessions_in_schedule": len(schedule.get("sessions", [])), "sessions_changed_vs_active": len(diff),
                   "forced_moves": len(forced), "dropped_sessions": sorted(dropped)}
        if self.artifacts is not None:
            self.artifacts.save_json(job_id, "proposal_schedule.json", schedule)
            self.artifacts.save_json(job_id, "validator_summary.json", vsum)
        self.jobs.update_and_emit(
            job_id, "proposal_ready",
            {"approvable": verdict["approvable"], "blocking_reasons": verdict["blocking_reasons"],
             "warnings": verdict["warnings"], "solver_statuses": statuses},
            status=COMPLETED, completed_at=utc_now(), solver_statuses=statuses, summary=summary,
            approvable=verdict["approvable"], blocking_reasons=verdict["blocking_reasons"],
            warnings=verdict["warnings"], proposal_status=P_PENDING if verdict["approvable"] else P_BLOCKED,
            proposal={"schedule": schedule, "data_after": data_after, "report": report, "diff": diff[:MAX_DIFF_ROWS]})

    # ------------------------------------------------------------------------------------------------ reads
    def job_view(self, job):
        return {"job_id": job.job_id, "mode": job.mode, "status": job.status, "stage": job.stage,
                "proposal_status": job.proposal_status, "base_version": job.base_version,
                "created_at": job.created_at, "updated_at": job.updated_at, "started_at": job.started_at,
                "completed_at": job.completed_at, "latest_seq": self.jobs.latest_seq(job.job_id),
                "solver_statuses": dict(job.solver_statuses), "result_available": job.proposal is not None,
                "approvable": job.approvable, "error": job.error, "log_ref": job.log_ref}

    def get_job(self, principal, job_id):
        return self.job_view(self._authorized_job(principal, job_id))

    def get_result(self, principal, job_id):
        job = self._authorized_job(principal, job_id)
        if job.status == FAILED:
            raise Conflict(f"The job failed: {job.error}")
        if job.status != COMPLETED or job.proposal is None:
            raise Conflict(f"The result is not ready; the job is {job.status}.")
        return {"job_id": job.job_id, "mode": job.mode, "status": job.status, "proposal_status": job.proposal_status,
                "base_version": job.base_version, "solver_statuses": dict(job.solver_statuses),
                "approvable": job.approvable, "blocking_reasons": list(job.blocking_reasons),
                "warnings": list(job.warnings), "summary": dict(job.summary),
                "validator": summarize_report(job.proposal["report"]),
                "changes_vs_active": list(job.proposal["diff"]), "schedule": job.proposal["schedule"],
                "dataset_after": job.proposal["data_after"]}

    def active_info(self, principal):
        self._require_admin(principal)
        a = self.repo.get_active()
        return {"version": a.version, "dataset_id": a.dataset.get("dataset_id"),
                "has_schedule": a.schedule is not None,
                "sessions": len(a.schedule["sessions"]) if a.schedule else 0}

    # ------------------------------------------------------------------------------------------------ decisions
    def approve(self, principal, job_id):
        with self._decision_lock:                                  # approvals/rejections are serialized
            job = self._authorized_job(principal, job_id)
            if job.status != COMPLETED or job.proposal is None:
                raise Conflict("There is no completed proposal to approve.")
            if job.proposal_status == P_APPROVED:
                raise Conflict("This proposal was already approved.")
            if job.proposal_status == P_REJECTED:
                raise Conflict("This proposal was rejected.")
            if job.proposal_status == P_STALE:
                raise StaleVersion("This proposal is stale: the active schedule changed. Run a new preview.")
            if job.proposal_status == P_BLOCKED or not job.approvable:
                raise NotApprovable("This proposal cannot be approved.", list(job.blocking_reasons))
            try:
                new_version = self.repo.commit(
                    job.base_version, job.proposal["data_after"], job.proposal["schedule"],
                    {"job_id": job_id, "approved_by": principal.user_id, "mode": job.mode})
            except StaleVersion as e:
                self.jobs.update_and_emit(job_id, "proposal_stale",
                                          {"message": e.public_message, "active_version": self.repo.active_version()},
                                          proposal_status=P_STALE)
                raise
            self.jobs.update_and_emit(job_id, "proposal_approved",
                                      {"new_version": new_version, "previous_version": job.base_version,
                                       "approved_by": principal.user_id}, proposal_status=P_APPROVED)
            for other in self.jobs.pending_proposals_for_version(job.base_version, exclude_job_id=job_id):
                self.jobs.update_and_emit(other.job_id, "proposal_stale",
                                          {"message": "Another proposal was approved first.",
                                           "active_version": new_version}, proposal_status=P_STALE)
            return {"job_id": job_id, "proposal_status": P_APPROVED, "active_version": new_version,
                    "previous_version": job.base_version}

    def reject(self, principal, job_id):
        with self._decision_lock:
            job = self._authorized_job(principal, job_id)
            if job.status != COMPLETED or job.proposal is None:
                raise Conflict("There is no completed proposal to reject.")
            if job.proposal_status in (P_APPROVED, P_REJECTED):
                raise Conflict(f"This proposal is already {job.proposal_status.lower()}.")
            self.jobs.update_and_emit(job_id, "proposal_rejected", {"rejected_by": principal.user_id},
                                      proposal_status=P_REJECTED)
            return {"job_id": job_id, "proposal_status": P_REJECTED, "active_version": self.repo.active_version()}

    def shutdown(self):
        """Stop accepting queued work.  A solve that is already running cannot be interrupted and finishes in the
        background; queued jobs that have not started are dropped."""
        self._executor.shutdown(wait=False, cancel_futures=True)
        for job_id in self.jobs.queued_job_ids():                  # queued jobs never start: end them cleanly
            self._fail(job_id, "The scheduler was shut down before this job started.", None)
