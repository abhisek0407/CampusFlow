"""Server-side checks of proposed schedule changes against the ACTIVE dataset (pure Python, no web framework).

Shape validation happens in ``api.schemas`` (Pydantic); this module re-checks types defensively and then checks every
value against real ids in the dataset, so a bad payload is rejected with HTTP 422 before any solver time is spent.

Only the change types that ``scheduler.load_data.apply_disruption`` really supports are accepted.  Display-only edits
(a faculty phone number, a room description) do NOT need the optimizer and are not accepted here.
"""
from ..errors import ValidationFailed

SUPPORTED_TYPES = ("faculty_unavailable", "room_unavailable", "add_faculty", "add_session", "remove_session")
SESSION_KINDS = ("lecture", "tutorial", "lab")
MAX_CHANGES = 200


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _check_days_periods(ch, days, periods, where, errs):
    d, p = ch.get("days"), ch.get("periods")
    if not isinstance(d, list) or not d or not all(isinstance(x, str) for x in d):
        errs.append(f"{where}: 'days' must be a non-empty list of day codes")
    elif any(x not in days for x in d) or len(set(d)) != len(d):
        errs.append(f"{where}: 'days' must be unique values from {sorted(days)}")
    if not isinstance(p, list) or not p or not all(_is_int(x) for x in p):
        errs.append(f"{where}: 'periods' must be a non-empty list of period numbers")
    elif any(x not in periods for x in p) or len(set(p)) != len(p):
        errs.append(f"{where}: 'periods' must be unique values from {sorted(periods)}")
    r = ch.get("reason", "")
    if r is not None and (not isinstance(r, str) or len(r) > 200):
        errs.append(f"{where}: 'reason' must be text of at most 200 characters")


def validate_changes(changes, data):
    """Return a normalized, JSON-safe copy of ``changes`` or raise ``ValidationFailed`` listing every problem."""
    errs = []
    if not isinstance(changes, list) or not changes:
        raise ValidationFailed("At least one change is required for a repair preview.",
                               ["'changes' must be a non-empty list"])
    if len(changes) > MAX_CHANGES:
        raise ValidationFailed(f"At most {MAX_CHANGES} changes per job.", [f"{len(changes)} changes given"])

    days = set(data["calendar"]["days"])
    periods = {p["id"] for p in data["calendar"]["periods"]}
    rooms = {r["id"] for r in data["rooms"]}
    room_types = {r["type"] for r in data["rooms"]}
    faculty = {f["id"] for f in data["faculty"]}
    groups = {g["id"] for g in data["student_groups"]}
    courses = {c["id"] for c in data["courses"]}
    sessions = {s["id"] for s in data["sessions"]}
    out = []

    for i, ch in enumerate(changes):
        where = f"changes[{i}]"
        if not isinstance(ch, dict):
            errs.append(f"{where}: must be an object")
            continue
        t = ch.get("type")
        if t not in SUPPORTED_TYPES:
            errs.append(f"{where}: unsupported change type {t!r}; supported: {list(SUPPORTED_TYPES)}. "
                        "Display-only edits do not need the scheduler.")
            continue
        n = {"type": t}
        if t == "faculty_unavailable":
            if ch.get("faculty_id") not in faculty:
                errs.append(f"{where}: unknown faculty_id {ch.get('faculty_id')!r}")
            _check_days_periods(ch, days, periods, where, errs)
            n.update(faculty_id=ch.get("faculty_id"), days=ch.get("days"), periods=ch.get("periods"),
                     reason=ch.get("reason") or "")
        elif t == "room_unavailable":
            if ch.get("room_id") not in rooms:
                errs.append(f"{where}: unknown room_id {ch.get('room_id')!r}")
            _check_days_periods(ch, days, periods, where, errs)
            n.update(room_id=ch.get("room_id"), days=ch.get("days"), periods=ch.get("periods"),
                     reason=ch.get("reason") or "")
        elif t == "add_faculty":
            f = ch.get("faculty")
            if not isinstance(f, dict):
                errs.append(f"{where}: 'faculty' must be an object")
                continue
            if not isinstance(f.get("id"), str) or not f["id"]:
                errs.append(f"{where}: faculty.id is required")
            elif f["id"] in faculty:
                errs.append(f"{where}: faculty id {f['id']!r} already exists")
            if not isinstance(f.get("name"), str) or not f["name"]:
                errs.append(f"{where}: faculty.name is required")
            if not isinstance(f.get("department"), str) or not f["department"]:
                errs.append(f"{where}: faculty.department is required")
            if not _is_int(f.get("max_hours_per_day")) or not 1 <= f["max_hours_per_day"] <= 12:
                errs.append(f"{where}: faculty.max_hours_per_day must be an integer 1-12")
            nf = dict(f)
            nf.setdefault("needs_accessible", False)
            nf.setdefault("unavailable", [])
            nf.setdefault("preferences", [])
            if not isinstance(nf["unavailable"], list):
                errs.append(f"{where}: faculty.unavailable must be a list")
            n["faculty"] = nf
            if isinstance(f.get("id"), str):
                faculty.add(f["id"])
        elif t == "add_session":
            s = ch.get("session")
            if not isinstance(s, dict):
                errs.append(f"{where}: 'session' must be an object")
                continue
            sid = s.get("id")
            if not isinstance(sid, str) or not sid:
                errs.append(f"{where}: session.id is required")
            elif sid in sessions:
                errs.append(f"{where}: session id {sid!r} already exists")
            if s.get("course_id") not in courses:
                errs.append(f"{where}: unknown course_id {s.get('course_id')!r}")
            if s.get("kind") not in SESSION_KINDS:
                errs.append(f"{where}: session.kind must be one of {list(SESSION_KINDS)}")
            g = s.get("groups")
            if (not isinstance(g, list) or not g or not all(isinstance(x, str) for x in g)
                    or any(x not in groups for x in g)):
                errs.append(f"{where}: session.groups must be a non-empty list of existing group ids")
            if s.get("faculty_id") not in faculty:
                errs.append(f"{where}: unknown session.faculty_id {s.get('faculty_id')!r}")
            if not _is_int(s.get("size")) or s["size"] <= 0:
                errs.append(f"{where}: session.size must be a positive integer")
            if not _is_int(s.get("duration")) or not 1 <= s["duration"] <= 6:
                errs.append(f"{where}: session.duration must be an integer 1-6")
            rt = s.get("room_types")
            if not isinstance(rt, list) or not rt or any(x not in room_types for x in rt):
                errs.append(f"{where}: session.room_types must be a non-empty list from {sorted(room_types)}")
            ns = dict(s)
            ns.setdefault("needs_accessible", False)
            ns.setdefault("basket_slot", None)
            ns.setdefault("fixed_slot", None)
            if not isinstance(ns["needs_accessible"], bool):
                errs.append(f"{where}: session.needs_accessible must be true or false")
            n["session"] = ns
            if isinstance(sid, str):
                sessions.add(sid)
        elif t == "remove_session":
            sid = ch.get("session_id")
            if sid not in sessions:
                errs.append(f"{where}: unknown session_id {sid!r}")
            else:
                sessions.discard(sid)
            n["session_id"] = sid
        out.append(n)

    if errs:
        raise ValidationFailed("The proposed changes are not valid for the active dataset.", errs)
    return out
