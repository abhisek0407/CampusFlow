"""Candidate generation: for every session, the (day, start, room) options that already
satisfy every hard rule that depends on ONE session only. Clash rules (faculty/group/room
overlap, daily limit, baskets) are left to the solver.

Each rejected option records WHY, so the notebook can explain exclusions.
"""
from collections import Counter, defaultdict

# Which allowed_uses entry a session kind needs in its room.
KIND_TO_USE = {"lecture": "lecture", "tutorial": "tutorial", "lab": "lab"}


class Reason:
    LUNCH = "crosses lunch"
    BOUNDS = "outside P1-P9"
    LAB_START = "lab not at P2/P6"
    FIXED = "not the fixed slot"
    TYPE = "room type not allowed"
    USE = "room not allowed for this kind of session"
    CAPACITY = "room too small"
    ACCESS = "needs accessible room"
    ROOM_UN = "room unavailable"
    FAC_UN = "faculty unavailable"


def teaching_periods(data):
    return [p["id"] for p in data["calendar"]["periods"] if p.get("teaching")]


def build_unavailability(data):
    fac_un, room_un = defaultdict(set), defaultdict(set)
    for f in data["faculty"]:
        for u in f.get("unavailable", []):
            for p in u["periods"]:
                fac_un[f["id"]].add((u["day"], p))
    for u in data.get("room_unavailability", []):
        for p in u["periods"]:
            room_un[u["room_id"]].add((u["day"], p))
    return fac_un, room_un


def session_candidates(data, enforce_allowed_uses=True, enforce_flags=False):
    """Return (cands, excluded).

    cands[sid]    -> list of (day, start, room_id)
    excluded[sid] -> Counter of Reason -> number of (day,start,room) options removed for it
                     (first failing reason only, in the order the checks run)

    enforce_allowed_uses: the validator does NOT check rooms' allowed_uses for sessions, but the
        README says rooms declare what they host, so we respect it (safe superset of the validator).
    enforce_flags: also require an accessible room when the session's faculty or any of its groups
        has needs_accessible (the validator ignores those flags; off by default, see notebook).
    """
    days = data["calendar"]["days"]
    lunch = data["calendar"]["lunch"]["after_period"]
    lab_starts = set(data["calendar"]["lab_start_periods"])
    last = max(teaching_periods(data))
    rooms = data["rooms"]
    fac = {f["id"]: f for f in data["faculty"]}
    grp = {g["id"]: g for g in data["student_groups"]}
    fac_un, room_un = build_unavailability(data)

    cands, excluded = {}, {}
    for s in data["sessions"]:
        sid, dur = s["id"], s["duration"]
        need_acc = bool(s.get("needs_accessible"))
        if enforce_flags:
            need_acc = need_acc or fac[s["faculty_id"]].get("needs_accessible", False) \
                or any(grp[g].get("needs_accessible", False) for g in s["groups"])
        fx = s.get("fixed_slot")
        ok, why = [], Counter()
        for day in days:
            for start in range(1, last + 1):
                per = list(range(start, start + dur))
                n_rooms = len(rooms)
                if per[-1] > last:
                    why[Reason.BOUNDS] += n_rooms; continue
                if per[0] <= lunch < per[-1]:
                    why[Reason.LUNCH] += n_rooms; continue
                if s["kind"] == "lab" and start not in lab_starts:
                    why[Reason.LAB_START] += n_rooms; continue
                if fx and (fx["day"] != day or fx["start_period"] != start):
                    why[Reason.FIXED] += n_rooms; continue
                if any((day, p) in fac_un[s["faculty_id"]] for p in per):
                    why[Reason.FAC_UN] += n_rooms; continue
                for r in rooms:
                    if r["type"] not in s["room_types"]:
                        why[Reason.TYPE] += 1; continue
                    if enforce_allowed_uses and KIND_TO_USE[s["kind"]] not in r["allowed_uses"]:
                        why[Reason.USE] += 1; continue
                    if r["capacity"] < s["size"]:
                        why[Reason.CAPACITY] += 1; continue
                    if need_acc and not r["accessible"]:
                        why[Reason.ACCESS] += 1; continue
                    if any((day, p) in room_un[r["id"]] for p in per):
                        why[Reason.ROOM_UN] += 1; continue
                    ok.append((day, start, r["id"]))
        cands[sid], excluded[sid] = ok, why
    return cands, excluded
