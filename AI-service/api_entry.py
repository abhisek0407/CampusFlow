"""CLI entry point for the Python scheduling & validation bridge.

Commands:
    check_booking: Dry-run booking feasibility check on top of current schedule.
    repair: Solve disruption repair using CP-SAT and validate against official validator.
"""
import sys
import os
import json
import copy
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure scheduler modules are importable
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from scheduler.load_data import load_dataset
from scheduler import bookings as B
from scheduler.repair import repair_all
from scheduler.validate_output import run_validator


def get_dataset_paths():
    repo_root = SCRIPT_DIR.parent
    data_path = repo_root / "CrunchWeek_StarterPack" / "data" / "cit_public.json"
    validator_path = repo_root / "CrunchWeek_StarterPack" / "validator.py"
    if not data_path.exists():
        data_path = SCRIPT_DIR / "CrunchWeek_StarterPack" / "data" / "cit_public.json"
    if not validator_path.exists():
        validator_path = SCRIPT_DIR / "CrunchWeek_StarterPack" / "validator.py"
    return str(data_path), str(validator_path)


def handle_check_booking(payload):
    data_path, _ = get_dataset_paths()
    data = load_dataset(data_path)

    draft = payload.get("draft") or {}
    schedule = payload.get("schedule") or {}

    reasons = []

    # 1. Pre-checks before planning
    rooms = {r["id"]: r for r in data.get("rooms", [])}
    all_features = set()
    for r in rooms.values():
        all_features.update(r.get("features", []))
        if r.get("accessible"):
            all_features.add("accessible")

    requested_room = draft.get("requested_room")
    if requested_room and requested_room not in rooms:
        reasons.append(f"Unknown requested room: {requested_room}")

    attendance = draft.get("attendance", 0)
    if attendance is None or attendance <= 0:
        reasons.append("Attendance must be greater than 0")

    duration = draft.get("duration_periods", 1)
    if duration is None or duration <= 0 or duration > 13:
        reasons.append("Duration must be between 1 and 13 periods")

    windows = draft.get("windows") or []
    if not windows:
        reasons.append("At least one booking window is required")
    else:
        valid_days = {"MON", "TUE", "WED", "THU", "FRI"}
        for w in windows:
            day = w.get("day")
            from_p = w.get("from_period", 0)
            to_p = w.get("to_period", 0)
            if day not in valid_days:
                reasons.append(f"Invalid day '{day}'. Allowed: MON, TUE, WED, THU, FRI")
            if from_p < 1 or to_p > 13 or from_p > to_p:
                reasons.append(f"Periods must be within 1-13 (got P{from_p}-P{to_p})")
            if (to_p - from_p + 1) < duration:
                reasons.append(f"Window P{from_p}-P{to_p} is shorter than requested duration ({duration} periods)")

    needs = draft.get("needs") or []
    unsupported_needs = [n for n in needs if n not in all_features]
    if unsupported_needs:
        reasons.append(f"Needs unsupported by any room: {', '.join(unsupported_needs)}")

    # Check if requested room conflicts with stated needs or capacity
    if requested_room and requested_room in rooms:
        r_info = rooms[requested_room]
        r_feats = set(r_info.get("features", [])) | ({"accessible"} if r_info.get("accessible") else set())
        for n in needs:
            if n not in r_feats:
                reasons.append(f"Requested room {requested_room} lacks required feature '{n}'")
        if attendance > r_info.get("capacity", 0):
            reasons.append(f"Requested room {requested_room} capacity ({r_info.get('capacity')}) is below attendance ({attendance})")

    # If any fatal pre-check fails (unknown room, invalid day/periods/attendance, unsupported needs)
    has_fatal = any(
        "Unknown requested room" in r
        or "Attendance must be" in r
        or "Duration must be" in r
        or "Invalid day" in r
        or "Periods must be" in r
        or "shorter than requested duration" in r
        or "Needs unsupported" in r
        for r in reasons
    )

    if has_fatal:
        return {
            "verdict": "invalid",
            "room_id": None,
            "day": None,
            "start_period": None,
            "end_period": None,
            "reason": "; ".join(reasons),
            "effective_category": None,
            "reasons": reasons,
            "affects_existing": []
        }

    # 2. Append draft to data["booking_requests"] with temp id DRAFT-1
    temp_id = "DRAFT-1"
    now_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()

    new_booking = {
        "id": temp_id,
        "submitted_at": now_iso,
        "requester": draft.get("requester", "Requester"),
        "role": draft.get("role", "club"),
        "requested_category": draft.get("requested_category", "club_event"),
        "title": draft.get("title", "Booking Draft"),
        "attendance": attendance,
        "duration_periods": duration,
        "windows": windows,
        "room_types": draft.get("room_types") or ["seminar_hall", "classroom"],
        "needs": needs,
        "requested_room": requested_room,
        "mandatory_for_groups": draft.get("mandatory_for_groups") or [],
        "series_id": draft.get("series_id"),
        "raw_text": draft.get("raw_text", "")
    }

    data_copy = copy.deepcopy(data)
    data_copy["booking_requests"].append(new_booking)

    # 3. Base assignment from schedule.sessions
    raw_sessions = schedule.get("sessions") or []
    assign = {}
    for s in raw_sessions:
        sid = s.get("session_id") or s.get("id")
        if sid:
            assign[sid] = (s["day"], s["start_period"], s["room_id"])

    # 4. Plan bookings WITHOUT draft (clean baseline)
    baseline_list, _ = B.plan_bookings(data, assign)
    baseline_map = {b["request_id"]: b for b in baseline_list}

    # Stored bookings in schedule.fest_week.bookings
    stored_map = {}
    fest_week = schedule.get("fest_week") or {}
    for b in fest_week.get("bookings", []):
        rid = b.get("request_id") or b.get("id")
        if rid:
            stored_map[rid] = b

    # Identify baseline drift (bookings that differ between stored fest_week and a clean baseline plan)
    baseline_drift = []
    for rid, stored_b in stored_map.items():
        if rid in baseline_map:
            base_b = baseline_map[rid]
            if (
                stored_b.get("status") != base_b.get("status")
                or stored_b.get("room_id") != base_b.get("room_id")
                or stored_b.get("day") != base_b.get("day")
                or stored_b.get("start_period") != base_b.get("start_period")
            ):
                baseline_drift.append(rid)

    # 5. Plan bookings WITH draft
    bookings_list, overrides = B.plan_bookings(data_copy, assign)

    decision = next((b for b in bookings_list if b.get("request_id") == temp_id), None)
    if not decision:
        return {
            "verdict": "rejected",
            "room_id": None,
            "day": None,
            "start_period": None,
            "end_period": None,
            "reason": "Scheduling engine did not return a decision for the draft",
            "effective_category": B.eff_cat(new_booking),
            "reasons": ["No decision produced"],
            "affects_existing": [],
            "baseline_drift": baseline_drift,
        }

    verdict = decision.get("status")
    room_id = decision.get("room_id")
    day = decision.get("day")
    start_p = decision.get("start_period")
    end_p = decision.get("end_period")
    reason = decision.get("reason")
    eff_category = B.eff_cat(new_booking)

    # If a specific room was requested but a different room was assigned, offer as alternative
    if verdict == "approved" and requested_room and room_id and room_id != requested_room:
        verdict = "alternative_offered"
        alt_msg = f"requested room {requested_room} not allocated; offered alternative {room_id}"
        reason = f"{alt_msg} ({reason})" if reason else alt_msg

    # Combine pre-check warnings with engine reason
    all_reasons = list(reasons)
    if reason and reason not in all_reasons:
        all_reasons.append(reason)

    # 6. Compute affects_existing: bookings that change ONLY because of the draft vs clean baseline plan
    with_draft_map = {b["request_id"]: b for b in bookings_list if b.get("request_id") != temp_id}
    affects_existing = []
    for rid, base_b in baseline_map.items():
        if rid in with_draft_map:
            draft_b = with_draft_map[rid]
            if (
                base_b.get("status") != draft_b.get("status")
                or base_b.get("room_id") != draft_b.get("room_id")
                or base_b.get("day") != draft_b.get("day")
                or base_b.get("start_period") != draft_b.get("start_period")
            ):
                affects_existing.append(rid)

    return {
        "verdict": verdict,
        "room_id": room_id,
        "day": day,
        "start_period": start_p,
        "end_period": end_p,
        "reason": reason or ("; ".join(all_reasons) if all_reasons else "Approved by planner"),
        "effective_category": eff_category,
        "reasons": all_reasons,
        "affects_existing": affects_existing,
        "baseline_drift": baseline_drift,
    }


def handle_repair(payload):
    data_path, validator_path = get_dataset_paths()
    data = load_dataset(data_path)

    disruption = payload.get("disruption") or {}
    schedule = payload.get("schedule") or {}
    time_limit = float(payload.get("time_limit", 30))
    workers = int(payload.get("workers", 4))

    # Convert schedule to starter pack export shape
    baseline = {
        "sessions": schedule.get("sessions") or [],
        "fest_week": schedule.get("fest_week") or {"bookings": [], "session_overrides": []},
        "exams": schedule.get("exams") or []
    }

    r = repair_all(data, disruption, baseline, time_limit=time_limit, workers=workers)

    after = r.get("after")
    dropped = r.get("dropped") or {}
    forced = r.get("forced") or []
    status = r.get("rep", {}).get("status", "UNKNOWN")

    # Run official validator on the after-schedule
    report = {}
    if after:
        try:
            report = run_validator(r["data_full"], after, validator_path, baseline=baseline)
        except Exception as v_err:
            report = {"hard_violations": [{"error": str(v_err)}], "soft_total": 0}

    hard_violations = report.get("hard_violations", [])
    hard_violation_count = len(hard_violations)
    soft_total = report.get("soft_total", 0)
    stability = report.get("stability", {})

    # Compute diff between baseline and after schedule
    diffs = []
    base_map = {}
    for s in baseline["sessions"]:
        sid = s.get("session_id") or s.get("id")
        base_map[sid] = s

    if after and "sessions" in after:
        for curr in after["sessions"]:
            sid = curr.get("session_id") or curr.get("id")
            old = base_map.get(sid)
            if not old:
                diffs.append({
                    "session_id": sid,
                    "type": "added",
                    "old": None,
                    "new": {"day": curr["day"], "start_period": curr["start_period"], "room_id": curr["room_id"]}
                })
            elif (
                old["day"] != curr["day"]
                or old["start_period"] != curr["start_period"]
                or old["room_id"] != curr["room_id"]
            ):
                time_changed = (old["day"] != curr["day"] or old["start_period"] != curr["start_period"])
                diff_type = "time_and_room" if time_changed else "room_only"
                diffs.append({
                    "session_id": sid,
                    "type": diff_type,
                    "old": {"day": old["day"], "start_period": old["start_period"], "room_id": old["room_id"]},
                    "new": {"day": curr["day"], "start_period": curr["start_period"], "room_id": curr["room_id"]}
                })

    unchanged_count = len(baseline["sessions"]) - len([d for d in diffs if d["type"] != "added"])

    feasible = bool(after is not None and len(dropped) == 0 and hard_violation_count == 0)

    # Explanation if not feasible
    status_msg = status
    if not feasible:
        if status == "INFEASIBLE":
            status_msg = "No solution exists (proven infeasible)"
        else:
            status_msg = "No feasible repair found within the time limit"

    return {
        "status": status_msg,
        "after_schedule": after,
        "diff": diffs,
        "unchanged_count": unchanged_count,
        "dropped": dropped,
        "forced_moves": forced,
        "validator": {
            "hard_violation_count": hard_violation_count,
            "soft_total": soft_total,
            "stability": stability
        },
        "feasible": feasible
    }


def main():
    if len(sys.argv) < 2:
        sys.stdout.write(json.dumps({"error": "Usage: api_entry.py <check_booking|repair>"}))
        sys.exit(1)

    command = sys.argv[1]

    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input) if raw_input.strip() else {}
    except Exception as e:
        sys.stdout.write(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)

    try:
        if command == "check_booking":
            res = handle_check_booking(payload)
        elif command == "repair":
            res = handle_repair(payload)
        else:
            sys.stdout.write(json.dumps({"error": f"Unknown command: {command}"}))
            sys.exit(1)

        sys.stdout.write(json.dumps(res))
        sys.exit(0)
    except Exception as e:
        sys.stdout.write(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
