"""Disruption repair (notebook sections 8, 9b and 11a).

Objective: 100 per moved session (+20 if its TIME changes) + soft S1-S6 - booking_weight per booking point approved.
Safety nets, in this order:
  1. A session with NO legal option at all is taken out of the model and REPORTED (nobody can place it).
  2. A session whose only options use a room outside its allowed_uses may use such a room as a last resort
     (the official validator does not check allowed_uses).  Costs 5000 each.
  3. Normal model first (fast).  Only if that is PROVEN infeasible a second model may LEAVE OUT sessions at 100,000
     each: we place as many as possible and report the rest.
"""
import copy
import time

from ortools.sat.python import cp_model

from . import bookings as B
from .candidates import session_candidates, KIND_TO_USE
from .export_schedule import build_schedule, read_assignments
from .joint import add_booking_options
from .load_data import apply_disruption
from .progress import attach_solver_log, emit, make_solution_callback
from .timetable import build_model

W_DROP, W_USES = 100_000, 5_000
BOOKING_W_REPAIR = 120          # one extra move is worth it for one booking point


class _RelaxedModel(cp_model.CpModel):
    """CpModel whose 'exactly one' rules get an escape literal (so a session / basket may be left out).
    Newer OR-Tools versions name the method add_exactly_one (AddExactlyOne is an alias), so both are overridden."""
    def __init__(self):
        super().__init__()
        self.skips = {}
    def _exactly_one_with_escape(self, lits):
        lits = list(lits)
        first = lits[0]
        parts = (first.name if hasattr(first, "name") else first.Name()).split("|")   # x|sid|..  y|sid|..  t|basket|..
        key = ("b" if parts[0] == "t" else "s", parts[1])
        skip = self.NewBoolVar(f"skip|{key[0]}|{key[1]}")
        self.skips[key] = skip
        parent = getattr(cp_model.CpModel, "add_exactly_one", None) or cp_model.CpModel.AddExactlyOne
        return parent(self, lits + [skip])
    add_exactly_one = _exactly_one_with_escape
    AddExactlyOne = _exactly_one_with_escape


class _Shim:                                      # build_model only ever calls cp.CpModel()
    CpModel = _RelaxedModel


def forced_moves(data_new, old):
    """Sessions whose current slot is no longer legal (they MUST move): a lower bound on the move count."""
    cands, _ = session_candidates(data_new)
    return sorted(sid for sid, pos in old.items() if sid in cands and cands[sid] and tuple(pos) not in set(cands[sid]))


def _attempt(data_use, old, escape, loose_uses, w_move, w_time, time_limit, workers, seed, log, bw,
             progress_callback=None):
    b = build_model(data_use, optimize=True, cp_model=_Shim if escape else None, enforce_allowed_uses=not loose_uses)
    assert not b.no_options, b.no_options
    m = b.model
    skips = getattr(m, "skips", {})
    if escape:
        assert skips, "escape literals were not created (OR-Tools API changed?)"
    room = {r["id"]: r for r in data_use["rooms"]}
    move_terms = []
    for sid in b.sessions:
        if sid not in old:
            continue                                                  # new sessions cost nothing to place
        d0, st0, r0 = old[sid]
        xs, ys = b.x.get((sid, d0, st0, r0)), b.y.get((sid, d0, st0))
        move_terms.append((w_move, 1 - xs) if xs is not None else (w_move, 1))
        move_terms.append((w_time, 1 - ys) if ys is not None else (w_time, 1))
    soft = sum(c * v for k in b.terms for c, v in b.terms[k])
    uses = [(sid, v) for (sid, d, st, r), v in b.x.items()
            if loose_uses and KIND_TO_USE[b.sessions[sid]["kind"]] not in room[r]["allowed_uses"]]
    drops = [v for (kind, _), v in skips.items() if kind == "s"]
    gain = add_booking_options(b, m, data_use) if bw else []
    m.Minimize(sum(c * t for c, t in move_terms) + soft + W_DROP * sum(drops) + W_USES * sum(v for _, v in uses)
               - bw * sum(w * v for w, v in gain))
    for (sid, d, st, r), v in b.x.items():                            # start from the old timetable
        m.AddHint(v, 1 if sid in old and tuple(old[sid]) == (d, st, r) else 0)
    for v in skips.values():
        m.AddHint(v, 0)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit)
    solver.parameters.num_workers = int(workers)
    solver.parameters.random_seed = int(seed)
    solver.parameters.log_search_progress = bool(log)
    if progress_callback is None:
        status = solver.StatusName(solver.Solve(m))
    else:                                                             # optional live progress; the model is untouched
        emit(progress_callback, "solver_started", stage="repair_solve", time_limit_seconds=float(time_limit),
             workers=int(workers), relaxed_model=bool(escape))
        attach_solver_log(solver, progress_callback, "repair_solve")
        status = solver.StatusName(solver.Solve(m, make_solution_callback(cp_model, progress_callback, "repair_solve")))
    out = {"status": status, "assign": {}, "dropped": {}, "relaxed_uses": []}
    if out["status"] in ("OPTIMAL", "FEASIBLE"):
        for (sid, d, st, r), v in b.x.items():
            if solver.BooleanValue(v):
                out["assign"][sid] = (d, st, r)
        for (kind, key), v in skips.items():
            if kind == "s" and solver.BooleanValue(v):
                out["dropped"][key] = {"no room/time combination fits together with the other sessions": 1}
        out["relaxed_uses"] = sorted({sid for sid, v in uses if solver.BooleanValue(v)})
        out["objective"], out["bound"] = solver.ObjectiveValue(), solver.BestObjectiveBound()
        out["soft_by_rule"] = {k: int(round(sum(c * solver.Value(v) for c, v in lst))) for k, lst in b.terms.items()}
        out["model_booking"] = sum(w for w, v in gain if solver.BooleanValue(v))
    emit(progress_callback, "solver_finished", stage="repair_solve", status=out["status"], relaxed_model=bool(escape),
         wall_seconds=solver.WallTime(), objective=out.get("objective"), best_bound=out.get("bound"))
    return out


def solve_repair(data_new, old, w_move=100, w_time=20, time_limit=120, workers=8, seed=1, log=False,
                 booking_weight=BOOKING_W_REPAIR, progress_callback=None):
    """Repaired weekly timetable for the disrupted dataset.  Never raises just because it is hard:
    unplaceable sessions are reported in out['dropped'] (they cost one hard violation each, unavoidably)."""
    t0 = time.time()
    strict, why = session_candidates(data_new)
    loose, _ = session_candidates(data_new, enforce_allowed_uses=False)
    hopeless = sorted(sid for sid, v in loose.items() if not v)                 # 1) nobody can place these
    loose_uses = any(not strict[sid] and loose[sid] for sid in strict)          # 2) rescue by ignoring allowed_uses
    data_use = copy.deepcopy(data_new)
    data_use["sessions"] = [s for s in data_new["sessions"] if s["id"] not in set(hopeless)]
    out = {"status": "NO_SESSIONS_LEFT", "assign": {}, "relaxed_uses": [], "data_used": data_use,
           "dropped": {sid: dict(why[sid].most_common(3)) for sid in hopeless}, "escape_model": False}
    if not data_use["sessions"]:
        return out
    B.set_dataset(data_use)                                                     # booking options read these lookups
    res = _attempt(data_use, old, False, loose_uses, w_move, w_time, time_limit, workers, seed, log, booking_weight,
                   progress_callback)
    if res["status"] == "INFEASIBLE":                                           # 3) proven: not everything fits
        res = _attempt(data_use, old, True, loose_uses, w_move, w_time, time_limit, workers, seed, log, booking_weight,
                       progress_callback)
        out["escape_model"] = True
    out.update({k: v for k, v in res.items() if k != "dropped"})
    out["dropped"].update(res["dropped"])
    out["wall"] = time.time() - t0
    return out


def repair_all(data, disruption, baseline, team="your-team", time_limit=120, workers=8, booking_weight=BOOKING_W_REPAIR,
               progress_callback=None):
    """Full repair: new timetable, bookings re-planned on it, exams kept.  Returns a dict with the after-schedule
    (to be judged against the DISRUPTED dataset `data_full`), the solver result and the unplaceable sessions."""
    emit(progress_callback, "stage_started", stage="apply_disruption",
         message="Applying the disruption and identifying forced moves")
    data_full = apply_disruption(data, disruption)
    old = read_assignments(baseline)
    forced = forced_moves(data_full, old)
    emit(progress_callback, "stage_completed", stage="apply_disruption", forced_moves=len(forced))
    emit(progress_callback, "stage_started", stage="repair_solve", message="Solving the repair model")
    rep = solve_repair(data_full, old, time_limit=time_limit, workers=workers, booking_weight=booking_weight,
                       progress_callback=progress_callback)
    emit(progress_callback, "stage_completed", stage="repair_solve", status=rep["status"],
         dropped_sessions=len(rep["dropped"]))
    if not rep["assign"]:
        return {"data_full": data_full, "rep": rep, "forced": forced, "after": None, "dropped": rep["dropped"]}
    emit(progress_callback, "stage_started", stage="booking_replan",
         message="Re-planning fest-week bookings on the repaired timetable")
    book, overrides = B.plan_bookings(rep["data_used"], rep["assign"])          # sets the lookups to the repaired data
    after = build_schedule(rep["assign"], data_full["dataset_id"], team=team, bookings=book,
                           overrides=overrides, exams=baseline.get("exams"))
    emit(progress_callback, "stage_completed", stage="booking_replan")
    return {"data_full": data_full, "rep": rep, "forced": forced, "after": after, "dropped": rep["dropped"]}
