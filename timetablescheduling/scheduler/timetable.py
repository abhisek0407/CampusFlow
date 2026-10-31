"""CP-SAT weekly timetable model (notebook section 5).

Decision variables
  x[sid, day, start, room]  one Boolean per candidate option (hard single-session rules are
                            already applied by scheduler.candidates, so impossible options never exist)
  y[sid, day, start]        "session sid runs at (day, start)", whatever the room
  t[basket, day, start]     "this elective basket runs at (day, start)" (all its sessions together)

Hard rules in the solver: H1 exactly-once, H2 faculty, H3 group (baskets count once), H4 room,
H11 baskets, H12 faculty daily hours.   H5-H10 and H14 are handled by candidate filtering.

Soft rules S1-S6 use exactly the validator's weights, so objective == validator soft total.

Solver outcomes are always reported by name: OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN, MODEL_INVALID.
UNKNOWN means "no conclusion yet" and is never the same as "impossible".
"""
import os
from collections import defaultdict

from .candidates import session_candidates


def _import_cp_model():
    try:
        from ortools.sat.python import cp_model
    except ImportError as e:  # pragma: no cover
        raise ImportError("OR-Tools is required: pip install ortools") from e
    return cp_model


class Built:
    """Everything produced by build_model()."""
    pass


def build_model(data, optimize=False, cp_model=None, enforce_allowed_uses=True):
    cp = cp_model or _import_cp_model()
    days = data["calendar"]["days"]
    last = max(p["id"] for p in data["calendar"]["periods"] if p.get("teaching"))
    P = list(range(1, last + 1))

    cands, excluded = session_candidates(data, enforce_allowed_uses=enforce_allowed_uses)
    sessions = {s["id"]: s for s in data["sessions"]}
    rooms = {r["id"]: r for r in data["rooms"]}
    fac = {f["id"]: f for f in data["faculty"]}
    dur = {sid: s["duration"] for sid, s in sessions.items()}

    b = Built()
    b.cands, b.excluded, b.sessions = cands, excluded, sessions
    b.no_options = {sid: dict(excluded[sid]) for sid, v in cands.items() if not v}
    b.optimize = optimize
    if b.no_options:
        b.model = None
        return b

    m = cp.CpModel()
    x, y, times_of = {}, {}, {}

    # ---- variables and H1 (every session exactly once)
    for sid, opts in cands.items():
        per_time = defaultdict(list)
        for day, start, room in opts:
            v = m.NewBoolVar(f"x|{sid}|{day}|{start}|{room}")
            x[(sid, day, start, room)] = v
            per_time[(day, start)].append(v)
        times_of[sid] = set(per_time)
        for (day, start), vs in per_time.items():
            if len(vs) == 1:
                y[(sid, day, start)] = vs[0]
            else:
                yv = m.NewBoolVar(f"y|{sid}|{day}|{start}")
                m.Add(sum(vs) == yv)
                y[(sid, day, start)] = yv
        m.AddExactlyOne([y[(sid, d, st)] for (d, st) in sorted(per_time)])

    # ---- H11 baskets: one shared time variable per basket
    baskets = defaultdict(list)
    for s in data["sessions"]:
        if s.get("basket_slot"):
            baskets[s["basket_slot"]].append(s["id"])
    t = {}
    for bk, sids in baskets.items():
        all_times = set().union(*(times_of[sid] for sid in sids))
        for (d, st) in sorted(all_times):
            tv = m.NewBoolVar(f"t|{bk}|{d}|{st}")
            t[(bk, d, st)] = tv
            if all((d, st) in times_of[sid] for sid in sids):
                for sid in sids:
                    m.Add(y[(sid, d, st)] == tv)
            else:
                m.Add(tv == 0)          # some session of the basket cannot run here
        m.AddExactlyOne([t[(bk, d, st)] for (d, st) in sorted(all_times)])

    # ---- H4 room clash (every occupied period)
    room_occ = defaultdict(list)
    for (sid, d, st, r), v in x.items():
        for p in range(st, st + dur[sid]):
            room_occ[(r, d, p)].append(v)
    for lits in room_occ.values():
        if len(lits) > 1:
            m.AddAtMostOne(lits)

    # ---- H2 faculty clash and H12 daily limit
    fac_occ, fac_day = defaultdict(list), defaultdict(list)
    for (sid, d, st), v in y.items():
        f = sessions[sid]["faculty_id"]
        for p in range(st, st + dur[sid]):
            fac_occ[(f, d, p)].append(v)
        fac_day[(f, d)].append((dur[sid], v))
    for lits in fac_occ.values():
        if len(lits) > 1:
            m.AddAtMostOne(lits)
    for (f, d), items in fac_day.items():
        mx = fac[f].get("max_hours_per_day", 4)
        if sum(h for h, _ in items) > mx:
            m.Add(sum(h * v for h, v in items) <= mx)

    # ---- H3 group clash: an elective basket is ONE key for a group
    grp_lits = defaultdict(dict)
    for sid, s in sessions.items():
        if s.get("basket_slot"):
            continue
        for (d, st) in times_of[sid]:
            for g in s["groups"]:
                for p in range(st, st + dur[sid]):
                    grp_lits[(g, d, p)][("s", sid, d, st)] = y[(sid, d, st)]
    for bk, sids in baskets.items():
        groups = {g for sid in sids for g in sessions[sid]["groups"]}
        for (b2, d, st), tv in t.items():
            if b2 != bk:
                continue
            for g in groups:
                periods = set()
                for sid in sids:
                    if g in sessions[sid]["groups"]:
                        periods |= set(range(st, st + dur[sid]))
                for p in periods:
                    grp_lits[(g, d, p)][("b", bk, d, st)] = tv
    for lits in grp_lits.values():
        if len(lits) > 1:
            m.AddAtMostOne(list(lits.values()))

    b.model, b.x, b.y, b.t, b.times_of = m, x, y, t, times_of
    b.terms = {k: [] for k in ("S1", "S2", "S3", "S4", "S5", "S6")}
    if optimize:
        _add_soft_objective(b, cp, days, P, last, rooms, fac, grp_lits, baskets)
    return b


def _add_soft_objective(b, cp, days, P, last, rooms, fac, grp_lits, baskets):
    m, x, y, terms = b.model, b.x, b.y, b.terms
    sessions, times_of = b.sessions, b.times_of

    # S1 (faculty avoid, 2 per hour) and S6 (P9, 1) depend only on the time
    for (sid, d, st), v in y.items():
        s = sessions[sid]
        per = range(st, st + s["duration"])
        c1 = 0
        for pref in fac[s["faculty_id"]].get("preferences", []):
            if pref.get("type") == "avoid" and d in pref.get("days", days):
                c1 += 2 * sum(1 for p in per if p in pref["periods"])
        if c1:
            terms["S1"].append((c1, v))
        if last in per:
            terms["S6"].append((1, v))
    # S5 (room too large, 1) depends on the room
    for (sid, d, st, r), v in x.items():
        cap = rooms[r]["capacity"]
        if cap and sessions[sid]["size"] / cap < 0.4:
            terms["S5"].append((1, v))

    # occupancy of a group in a period: exact, because H3 allows at most one key
    occ = {}
    for (g, d, p), lits in grp_lits.items():
        vals = list(lits.values())
        if len(vals) == 1:
            occ[(g, d, p)] = vals[0]
        else:
            ov = m.NewBoolVar(f"occ|{g}|{d}|{p}")
            m.Add(ov == sum(vals))
            occ[(g, d, p)] = ov
    groups = sorted({g for (g, _, _) in grp_lits})

    # S3: 3 per hour above six
    for g in groups:
        for d in days:
            lst = [occ[(g, d, p)] for p in P if (g, d, p) in occ]
            if len(lst) > 6:
                ex = m.NewIntVar(0, len(lst) - 6, f"s3|{g}|{d}")
                m.Add(ex >= sum(lst) - 6)
                terms["S3"].append((3, ex))

    # S2: 1 per empty period between first and last occupied period of the day
    for g in groups:
        for d in days:
            o = {p: occ.get((g, d, p)) for p in P}
            if sum(1 for v in o.values() if v is not None) < 2:
                continue
            pre, post = {}, {}
            for p in P[1:-1]:
                pre[p] = m.NewBoolVar(f"pre|{g}|{d}|{p}")
                post[p] = m.NewBoolVar(f"post|{g}|{d}|{p}")
            for p in P[1:-1]:
                if o[p - 1] is not None:
                    m.Add(pre[p] >= o[p - 1])
                if p - 1 in pre:
                    m.Add(pre[p] >= pre[p - 1])
                if o[p + 1] is not None:
                    m.Add(post[p] >= o[p + 1])
                if p + 1 in post:
                    m.Add(post[p] >= post[p + 1])
                gap = m.NewBoolVar(f"gap|{g}|{d}|{p}")
                if o[p] is not None:
                    m.Add(gap >= pre[p] + post[p] - 1 - o[p])
                else:
                    m.Add(gap >= pre[p] + post[p] - 1)
                terms["S2"].append((1, gap))

    # S4: 3 per extra lecture of the same course for a group on a day (non-basket),
    #     and 3 per extra same-course basket session on a day
    glec = defaultdict(list)
    for sid, s in sessions.items():
        if s["kind"] == "lecture" and not s.get("basket_slot"):
            for g in s["groups"]:
                glec[(g, s["course_id"])].append(sid)
    for (g, c), sids in glec.items():
        if len(sids) < 2:
            continue
        for d in days:
            lits = [y[(sid, d, st)] for sid in sids for (d2, st) in times_of[sid] if d2 == d]
            if len(lits) > 1:
                ex = m.NewIntVar(0, len(sids) - 1, f"s4|{g}|{c}|{d}")
                m.Add(ex >= sum(lits) - 1)
                terms["S4"].append((3, ex))
    bcourse = defaultdict(list)
    for sid, s in sessions.items():
        if s.get("basket_slot"):
            bcourse[s["course_id"]].append(sid)
    for c, sids in bcourse.items():
        if len(sids) < 2:
            continue
        for d in days:
            lits = [y[(sid, d, st)] for sid in sids for (d2, st) in times_of[sid] if d2 == d]
            if len(lits) > 1:
                ex = m.NewIntVar(0, len(sids) - 1, f"s4b|{c}|{d}")
                m.Add(ex >= sum(lits) - 1)
                terms["S4"].append((3, ex))

    m.Minimize(sum(c * v for k in terms for c, v in terms[k]))


def solve_timetable(data, optimize=False, time_limit=120, workers=None, seed=1,
                    hint=None, log=False, cp_model=None):
    """Build and solve. Returns a dict with status (by name), assignments, and statistics.

    hint: optional {sid: (day, start, room)} used as a starting guess (a hint, not a rule).
    workers: parallel workers (default: all CPU cores). Use workers=1 for repeatable runs.
    """
    cp = cp_model or _import_cp_model()
    b = build_model(data, optimize=optimize, cp_model=cp)
    if b.no_options:
        return {"status": "INFEASIBLE", "assign": {}, "sessions_without_options": b.no_options,
                "note": "These sessions have no legal (day, start, room) option at all."}
    solver = cp.CpSolver()
    prm = solver.parameters
    prm.max_time_in_seconds = float(time_limit)
    prm.num_workers = int(workers or (os.cpu_count() or 1))
    prm.random_seed = int(seed)
    prm.log_search_progress = bool(log)
    if hint:
        for (sid, d, st, r), v in b.x.items():
            m_ = hint.get(sid)
            if m_ is not None:
                b.model.AddHint(v, 1 if tuple(m_) == (d, st, r) else 0)
    status = solver.Solve(b.model)
    name = solver.StatusName(status)
    out = {"status": name, "assign": {}, "wall_time": solver.WallTime(),
           "n_options": len(b.x), "n_sessions": len(b.sessions)}
    if name in ("OPTIMAL", "FEASIBLE"):
        for (sid, d, st, r), v in b.x.items():
            if solver.BooleanValue(v):
                out["assign"][sid] = (d, st, r)
        if optimize:
            out["objective"] = solver.ObjectiveValue()
            out["best_bound"] = solver.BestObjectiveBound()
            out["by_rule"] = {k: int(round(sum(c * solver.Value(v) for c, v in lst)))
                              for k, lst in b.terms.items()}
    return out
