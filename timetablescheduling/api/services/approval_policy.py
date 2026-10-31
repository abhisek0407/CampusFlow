"""Decide whether a finished proposal may be approved.  Pure function; the solver + official validator stay authoritative.

* OPTIMAL            -> fine
* FEASIBLE           -> previewable, approvable only if the validator is clean; warning: optimality not proven
* INFEASIBLE / UNKNOWN / MODEL_INVALID / anything else -> blocked, reason shown
* no schedule, no validator report, hard violations, dropped (unplaceable) sessions -> blocked
"""

OK_STATUSES = ("OPTIMAL", "FEASIBLE")


def evaluate_proposal(schedule, report, solver_statuses, dropped=None, relaxed_uses=None):
    """Return ``{'approvable': bool, 'blocking_reasons': [...], 'warnings': [...]}``."""
    blocking, warnings = [], []
    if not schedule:
        blocking.append("No schedule was produced.")
    if report is None:
        blocking.append("The official validator did not produce a report.")
    else:
        n = report.get("hard_violation_count")
        if n is None:
            blocking.append("The validator report has no hard-violation count.")
        elif n > 0:
            blocking.append(f"The official validator found {n} hard violation(s): {report.get('hard_by_rule', {})}.")
        inv = (report.get("bookings") or {}).get("priority_inversions") or []
        if inv:
            warnings.append(f"{len(inv)} booking priority inversion(s) reported by the validator.")
    if dropped:
        blocking.append(f"{len(dropped)} session(s) could not be placed: {sorted(dropped)}.")
    if not solver_statuses:
        blocking.append("No solver status was recorded.")
    for stage, status in sorted((solver_statuses or {}).items()):
        if status == "FEASIBLE":
            warnings.append(f"{stage}: FEASIBLE - a valid solution was found but optimality is NOT proven "
                            "(a longer time limit may give a better timetable).")
        elif status not in OK_STATUSES:
            blocking.append(f"{stage}: solver status {status}.")
    if relaxed_uses:
        warnings.append(f"{len(relaxed_uses)} session(s) were placed in rooms outside their allowed use "
                        f"(last-resort rule, not checked by the validator): {sorted(relaxed_uses)}.")
    return {"approvable": not blocking, "blocking_reasons": blocking, "warnings": warnings}


def summarize_report(report, max_violations=50):
    """Short, browser-safe summary of the official validator report."""
    if report is None:
        return None
    bk = report.get("bookings") or {}
    out = {
        "hard_violation_count": report.get("hard_violation_count"),
        "hard_by_rule": report.get("hard_by_rule", {}),
        "hard_violations": [{"rule": v.get("rule"), "where": v.get("where"), "detail": v.get("detail")}
                            for v in (report.get("hard_violations") or [])[:max_violations]],
        "soft_total": report.get("soft_total"),
        "soft_penalties": report.get("soft_penalties"),
        "exam_soft_penalty": report.get("exam_soft_penalty"),
        "booking_score": bk.get("booking_score"),
        "booking_score_max_if_all_approved": bk.get("booking_score_max_if_all_approved"),
        "priority_inversions": len(bk.get("priority_inversions") or []),
        "warnings": list(report.get("warnings") or [])[:20],
    }
    st = report.get("stability")
    if st:
        out["stability"] = {k: st.get(k) for k in ("sessions_moved", "time_changed", "room_only_changed")}
    return out
