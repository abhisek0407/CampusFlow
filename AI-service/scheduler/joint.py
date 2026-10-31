"""Joint weekly timetable + fest-week bookings (booking-aware timetable).

Many timetables are equally good for classes but very different for fest week.  Here every "approved inside a window,
no class moved" option is an extra Boolean in the SAME CP-SAT model, sharing room and group clashes with the classes.
Alternatives (half score), rejections and displacement are NOT modelled; bookings.plan_bookings adds them afterwards.
Objective (minimise):  soft penalties S1-S6  -  booking_weight * (approved booking score)
"""
from collections import defaultdict

from ortools.sat.python import cp_model

from . import bookings as B
from .candidates import build_unavailability
from .progress import attach_solver_log, emit, make_solution_callback
from .timetable import build_model


def add_booking_options(b, m, data_):
    """Add booking Booleans to model m; returns [(category weight, literal)]."""
    sess_, rooms_ = b.sessions, {r["id"]: r for r in data_["rooms"]}
    room_cells, grp_cells = defaultdict(list), defaultdict(list)
    for (sid, d, st, r), v in b.x.items():
        for p in range(st, st + sess_[sid]["duration"]):
            room_cells[(r, d, p)].append(v)
    for (sid, d, st), v in b.y.items():
        if sess_[sid].get("basket_slot"):
            continue
        for g in sess_[sid]["groups"]:
            for p in range(st, st + sess_[sid]["duration"]):
                grp_cells[(g, d, p)].append(v)
    baskets_ = defaultdict(list)
    for s in data_["sessions"]:
        if s.get("basket_slot"):
            baskets_[s["basket_slot"]].append(s["id"])
    for (bk, d, st), tv in b.t.items():
        for g in {g for sid in baskets_[bk] for g in sess_[sid]["groups"]}:
            per = set()
            for sid in baskets_[bk]:
                if g in sess_[sid]["groups"]:
                    per |= set(range(st, st + sess_[sid]["duration"]))
            for p in per:
                grp_cells[(g, d, p)].append(tv)
    room_un = build_unavailability(data_)[1]
    gain_terms, by_room_cell, by_req = [], defaultdict(list), defaultdict(list)
    for req in data_["booking_requests"]:
        rid = req["id"]
        if rid in B.CANCELLED:
            continue
        w = B.CAT_W[B.eff_cat(req)]
        for room in rooms_.values():
            if not B.room_ok(req, room):
                continue
            for d, a, bb in B.time_options(req, "window"):
                if any((d, p) in room_un[room["id"]] for p in range(a, bb + 1)):
                    continue
                v = m.NewBoolVar(f"z|{rid}|{room['id']}|{d}|{a}")
                gain_terms.append((w, v)); by_req[rid].append(v)
                for p in range(a, bb + 1):
                    by_room_cell[(room["id"], d, p)].append(v)
                for g in req["mandatory_for_groups"]:                 # mandatory attendance: no class then
                    for p in range(a, bb + 1):
                        m.Add(sum(grp_cells.get((g, d, p), [])) + v <= 1)
    for lits in by_req.values():
        m.AddAtMostOne(lits)
    for cell, zs in by_room_cell.items():
        m.AddAtMostOne(room_cells.get(cell, []) + zs)                 # class and event share the room cell
    return gain_terms


def solve_joint(data, time_limit=180, workers=8, seed=1, booking_weight=1000, hint=None, log=False,
                progress_callback=None):
    B.set_dataset(data)
    b = build_model(data, optimize=True, cp_model=cp_model)
    if b.no_options:
        return {"status": "INFEASIBLE", "assign": {}, "sessions_without_options": b.no_options}
    m = b.model
    gain = add_booking_options(b, m, data)
    soft = sum(c * v for k in b.terms for c, v in b.terms[k])
    m.Minimize(soft - booking_weight * sum(w * v for w, v in gain))
    if hint:
        for (sid, d, st, r), v in b.x.items():
            m.AddHint(v, 1 if sid in hint and tuple(hint[sid]) == (d, st, r) else 0)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit)
    solver.parameters.num_workers = int(workers)
    solver.parameters.random_seed = int(seed)
    solver.parameters.log_search_progress = bool(log)
    if progress_callback is None:
        status = solver.StatusName(solver.Solve(m))
    else:                                                     # optional live progress; the model is untouched
        emit(progress_callback, "solver_started", stage="joint_timetable_booking",
             time_limit_seconds=float(time_limit), workers=int(workers))
        attach_solver_log(solver, progress_callback, "joint_timetable_booking")
        status = solver.StatusName(solver.Solve(m, make_solution_callback(cp_model, progress_callback,
                                                                             "joint_timetable_booking")))
    out = {"status": status, "assign": {}, "wall": solver.WallTime()}
    if status in ("OPTIMAL", "FEASIBLE"):
        for (sid, d, st, r), v in b.x.items():
            if solver.BooleanValue(v):
                out["assign"][sid] = (d, st, r)
        out["model_score"] = sum(w for w, v in gain if solver.BooleanValue(v))
        out["soft_by_rule"] = {k: int(round(sum(c * solver.Value(v) for c, v in lst))) for k, lst in b.terms.items()}
        out["objective"], out["bound"] = solver.ObjectiveValue(), solver.BestObjectiveBound()
    emit(progress_callback, "solver_finished", stage="joint_timetable_booking", status=status,
         wall_seconds=out["wall"], objective=out.get("objective"), best_bound=out.get("bound"))
    return out
