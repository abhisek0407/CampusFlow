"""Fest-week booking allocation (notebook section 6) as a reusable module.

Requests are handled highest priority first (category after the role cap, then submission time).  For each one:
approved with no class moved  >  approved by displacing classes (institute level only)  >  alternative (half score)
>  rejected with a reason.  Ties are broken by how many LATER requests would lose their last free slot.

The helpers read module-level lookups; call set_dataset(data) first (plan_bookings does it for you).
"""
import copy
from collections import defaultdict
from datetime import datetime

from .candidates import session_candidates, build_unavailability

MAX_P = 13                                   # events may use P1-P13, classes only P1-P9
CAT_W = {"institute_event": 5, "guest_lecture": 4, "department_event": 3, "club_event": 2}
_D = None
DAYS = ORDER = ROOMS = SESS = FAC = REQ = CANCELLED = CANDS = ROOM_UN = None


def set_dataset(d):
    """Point every helper in this module at dataset d (a disrupted copy works too)."""
    global _D, DAYS, ORDER, ROOMS, SESS, FAC, REQ, CANCELLED, CANDS, ROOM_UN
    _D = d
    DAYS, ORDER = d["calendar"]["days"], d["priority_order"]
    ROOMS = {r["id"]: r for r in d["rooms"]}
    SESS = {s["id"]: s for s in d["sessions"]}
    FAC = {f["id"]: f for f in d["faculty"]}
    REQ = {b["id"]: b for b in d["booking_requests"]}
    CANCELLED = {c["request_id"]: c for c in d.get("cancellations", [])}
    CANDS, _ = session_candidates(d)
    ROOM_UN = build_unavailability(d)[1]


def eff_cat(req):
    """Category after the role cap (a club asking for 'institute_event' is still a club event)."""
    cap = _D["role_category_cap"].get(req["role"], "club_event")
    a = ORDER.index(req["requested_category"]) if req["requested_category"] in ORDER else len(ORDER) - 1
    return ORDER[max(a, ORDER.index(cap))]


def rank_key(req):                           # higher priority first, then earlier submission
    return (ORDER.index(eff_cat(req)), datetime.fromisoformat(req["submitted_at"]))


def basket_or_id(sid):
    return SESS[sid].get("basket_slot") or sid

class Week:
    def __init__(self, base):
        self.pos = dict(base)                      # sid -> (day, start, room)
        self.book = defaultdict(set)               # (room, day, p) -> booking ids
        self.evgrp = defaultdict(set)              # (group, day, p) -> booking ids (mandatory attendance)
        self.reindex()

    def reindex(self):
        self.room, self.fac, self.grp, self.fday = (defaultdict(set), defaultdict(set),
                                                    defaultdict(set), defaultdict(int))
        for sid, (d, st, r) in self.pos.items():
            s = SESS[sid]
            for p in range(st, st + s["duration"]):
                self.room[(r, d, p)].add(sid)
                self.fac[(s["faculty_id"], d, p)].add(sid)
                for g in s["groups"]:
                    self.grp[(g, d, p)].add(sid)
            self.fday[(s["faculty_id"], d)] += s["duration"]

    def add_booking(self, rid, room, d, a, b, groups):
        for p in range(a, b + 1):
            self.book[(room, d, p)].add(rid)
            for g in groups:
                self.evgrp[(g, d, p)].add(rid)

    # ---- a regular session wanting to sit at (d, st, r): does it clash with anything?
    def can_place(self, sid, d, st, r):
        s = SESS[sid]; f = s["faculty_id"]; key = basket_or_id(sid)
        for p in range(st, st + s["duration"]):
            if self.room[(r, d, p)] - {sid} or self.book[(r, d, p)]:
                return False
            if self.fac[(f, d, p)] - {sid}:
                return False
            for g in s["groups"]:
                if self.evgrp[(g, d, p)]:
                    return False
                if any(basket_or_id(o) != key for o in self.grp[(g, d, p)] - {sid}):
                    return False
        here = self.pos[sid]
        used = self.fday[(f, d)] - (s["duration"] if here[0] == d else 0)
        return used + s["duration"] <= FAC[f].get("max_hours_per_day", 4)

    def best_move(self, sid):
        """Least disruptive new slot: same time other room > same day > other day."""
        d0, st0, r0 = self.pos[sid]
        ok = [o for o in CANDS[sid] if o != (d0, st0, r0) and self.can_place(sid, *o)]
        if not ok:
            return None
        return min(ok, key=lambda o: (0 if (o[0], o[1]) == (d0, st0) else 1 if o[0] == d0 else 2,
                                      abs(o[1] - st0), o[2] != r0, o))

    def move(self, sid, new):
        self.pos[sid] = new
        self.reindex()

def room_ok(req, room):
    """Static rules from the validator (H13): event use, type, seats, features."""
    feats = set(room["features"]) | ({"accessible"} if room["accessible"] else set())
    return ("event" in room["allowed_uses"] and room["type"] in req["room_types"]
            and room["capacity"] >= req["attendance"] and set(req["needs"]) <= feats)

def time_options(req, mode):
    """(day, a, b): 'window' = inside a requested window (approved); 'any' = anywhere in P1-P13 (alternative)."""
    dur, out = req["duration_periods"], []
    if mode == "window":
        for w in req["windows"]:
            for a in range(w["from_period"], w["to_period"] - dur + 2):
                if a + dur - 1 <= MAX_P:
                    out.append((w["day"], a, a + dur - 1))
    else:
        inside = set(time_options(req, "window"))
        for d in DAYS:
            for a in range(1, MAX_P - dur + 2):
                if (d, a, a + dur - 1) not in inside:
                    out.append((d, a, a + dur - 1))
    return out

def blockers(week, req, room, d, a, b):
    """None = impossible (room out of service or already booked); else the set of regular sessions in the way."""
    sids = set()
    for p in range(a, b + 1):
        if (d, p) in ROOM_UN[room["id"]] or week.book[(room["id"], d, p)]:
            return None
        sids |= week.room[(room["id"], d, p)]
        for g in req["mandatory_for_groups"]:
            sids |= week.grp[(g, d, p)]
            if week.evgrp[(g, d, p)]:
                return None
    return sids

MAX_DISPLACED = 3

def movable(sid):                                    # baskets move as a block and fixed slots never move
    return not SESS[sid].get("basket_slot") and not SESS[sid].get("fixed_slot")

def plan_displacement(week, req, rid, room, d, a, b, sids):
    """Try to move every blocking session elsewhere. Returns (new_week, overrides) or None."""
    if not sids or len(sids) > MAX_DISPLACED or not all(movable(s) for s in sids):
        return None
    w2 = copy.deepcopy(week)
    w2.add_booking(rid, room["id"], d, a, b, req["mandatory_for_groups"])    # reserve first
    overrides = []
    for sid in sorted(sids):
        new = w2.best_move(sid)
        if new is None:
            return None
        w2.move(sid, new)
        overrides.append({"session_id": sid, "displaced_by": rid,
                          "day": new[0], "start_period": new[1], "room_id": new[2]})
    return w2, overrides

def has_free_slot(week, req, extra=None):
    """Does req still have a window slot with no regular session in the way (ignoring `extra` = taken slot)?"""
    for room in ROOMS.values():
        if not room_ok(req, room):
            continue
        for d, a, b in time_options(req, "window"):
            if extra and extra[0] == room["id"] and extra[1] == d and not (b < extra[2] or a > extra[3]):
                continue
            if blockers(week, req, room, d, a, b) == set():
                return True
    return False

def allocate(week, queue, verbose=False):
    decisions, overrides, placed = {}, [], {}
    for i, req in enumerate(queue):
        rid, cat = req["id"], eff_cat(req)
        later = [q for q in queue[i + 1:] if has_free_slot(week, q)]
        series_room = next((placed[o]["room_id"] for o in placed
                            if REQ[o]["series_id"] and REQ[o]["series_id"] == req["series_id"]), None)

        def choose(mode, allow_displace):
            best = None
            for room in ROOMS.values():
                if not room_ok(req, room):
                    continue
                for d, a, b in time_options(req, mode):
                    bl = blockers(week, req, room, d, a, b)
                    if bl is None:
                        continue
                    plan = None
                    if bl:
                        if not allow_displace:
                            continue
                        plan = plan_displacement(week, req, rid, room, d, a, b, bl)
                        if plan is None:
                            continue
                    # how many LATER requests would lose their last free slot if we take this one?
                    kills = sum(1 for q in later if not has_free_slot(week, q, (room["id"], d, a, b)))
                    if mode == "any":     # alternative: stay as close to the wish as possible
                        dist = min((0 if d == w["day"] else 100) + max(0, w["from_period"] - b, a - w["to_period"])
                                   for w in req["windows"])
                    else:
                        dist = 0
                    key = (len(bl), dist, kills,
                           room["id"] != req["requested_room"], room["id"] != series_room,
                           room["capacity"] - req["attendance"], DAYS.index(d), a, room["id"])
                    if best is None or key < best[0]:
                        best = (key, room, d, a, b, plan)
            return best

        # 1) approved without displacing anyone -> 2) approved by displacing (institute level only)
        pick, status = choose("window", False), "approved"
        if pick is None and ORDER.index(cat) <= ORDER.index("institute_event"):
            pick = choose("window", True)
        # 3) alternative anywhere in P1-P13 (half score) -> 4) reject
        if pick is None:
            pick, status = choose("any", False), "alternative_offered"
        if pick is None:
            decisions[rid] = {"request_id": rid, "status": "rejected", "reason": why_rejected(week, req)}
            continue
        _, room, d, a, b, plan = pick
        if plan:
            week.__dict__.update(plan[0].__dict__)     # adopt the week after the moves
            overrides += plan[1]
        week.add_booking(rid, room["id"], d, a, b, req["mandatory_for_groups"])
        dec = {"request_id": rid, "status": status, "room_id": room["id"],
               "day": d, "start_period": a, "end_period": b}
        if status == "alternative_offered":
            dec["reason"] = f"requested window not available; offered {d} P{a}-P{b} in {room['id']}"
        elif plan:
            dec["reason"] = "displaced " + ", ".join(o["session_id"] for o in plan[1]) + " (institute-level priority)"
        decisions[rid] = dec
        placed[rid] = dec
        if verbose:
            print(f"{rid:7s} {status:19s} {room['id']:9s} {d} P{a}-P{b}" + (f"  displaced {len(plan[1])}" if plan else ""))
    return decisions, overrides

def why_rejected(week, req):
    suitable = [r for r in ROOMS.values() if room_ok(req, r)]
    if not suitable:
        big = max((r["capacity"] for r in ROOMS.values() if r["type"] in req["room_types"]), default=0)
        return (f"no room can host it: needs {'/'.join(req['room_types'])} with {req['attendance']} seats "
                f"and {req['needs'] or 'no special features'}; largest suitable type seats {big}")
    holders = set()
    for r in suitable:
        for d, a, b in time_options(req, "window"):
            for p in range(a, b + 1):
                holders |= week.book[(r["id"], d, p)]
    if holders:
        return (f"every suitable room ({', '.join(r['id'] for r in suitable)}) is taken in the requested window "
                f"by higher-priority bookings {sorted(holders)}, and no other time in P1-P13 is free")
    return "suitable rooms are held by classes that may not be displaced, and no other time in P1-P13 is free"

def plan_bookings(data, assign, verbose=False):
    """Decide every booking request on top of the weekly timetable `assign` ({sid: (day, start, room)}).
    Returns (bookings in the dataset's order, session_overrides)."""
    set_dataset(data)
    queue = sorted((r for r in REQ.values() if r["id"] not in CANCELLED), key=rank_key)
    decisions, overrides = allocate(Week(assign), queue, verbose=verbose)
    for rid, c in CANCELLED.items():         # cancelled requests need a decision too (never approved)
        decisions[rid] = {"request_id": rid, "status": "rejected",
                          "reason": f"cancelled by {c['by']}: {c['note']}"}
    return [decisions[r["id"]] for r in data["booking_requests"]], overrides
