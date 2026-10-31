"""One call that builds the complete submission: weekly timetable + fest-week bookings + exams."""
from . import bookings as B
from .export_schedule import build_schedule
from .exams import solve_exams
from .joint import solve_joint
from .progress import emit
from .validate_output import run_validator


def build_submission(data, team="your-team", time_limit=180, workers=8, seed=1, validator_path=None, log=print,
                     progress_callback=None):
    """Returns {'schedule', 'statuses', 'report'}.  Every solve status is reported by name."""
    st = {}
    emit(progress_callback, "stage_started", stage="joint_timetable_booking",
         message="Running timetable and in-window booking optimization")
    jt = solve_joint(data, time_limit=time_limit, workers=workers, seed=seed, progress_callback=progress_callback)
    st["timetable+bookings"] = jt["status"]
    emit(progress_callback, "stage_completed", stage="joint_timetable_booking", status=jt["status"])
    if not jt["assign"]:
        raise RuntimeError(f"no timetable: {jt['status']} {jt.get('sessions_without_options', '')}")
    log(f"timetable : {jt['status']} | soft {jt['soft_by_rule']} | approved-in-window score {jt['model_score']}")
    emit(progress_callback, "stage_started", stage="booking_planning",
         message="Processing remaining booking decisions (alternatives, rejections, displacement)")
    bookings, overrides = B.plan_bookings(data, jt["assign"])
    emit(progress_callback, "stage_completed", stage="booking_planning")
    log(f"bookings  : {sum(b['status']=='approved' for b in bookings)} approved, "
        f"{sum(b['status']=='alternative_offered' for b in bookings)} alternative, "
        f"{sum(b['status']=='rejected' for b in bookings)} rejected/cancelled, {len(overrides)} sessions displaced")
    emit(progress_callback, "stage_started", stage="exam_scheduling", message="Scheduling exams")
    ex = solve_exams(data, time_limit=time_limit, workers=workers, seed=seed, progress_callback=progress_callback)
    st["exams"] = ex["status"]
    emit(progress_callback, "stage_completed", stage="exam_scheduling", status=ex["status"])
    if not ex["exams"]:
        raise RuntimeError(f"no exam timetable: {ex['status']}")
    log(f"exams     : {ex['status']} | same-day penalty {ex['day_penalty']}")
    sched = build_schedule(jt["assign"], data["dataset_id"], team=team, bookings=bookings,
                           overrides=overrides, exams=ex["exams"])
    if validator_path:
        emit(progress_callback, "stage_started", stage="official_validation", message="Running the official validator")
    report = run_validator(data, sched, validator_path) if validator_path else None
    if validator_path:
        emit(progress_callback, "stage_completed", stage="official_validation")
    return {"schedule": sched, "statuses": st, "report": report}
