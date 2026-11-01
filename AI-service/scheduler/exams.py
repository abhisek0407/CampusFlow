"""Exam-week timetable (notebook section 7) as a reusable module.

z[e,slot]   exam e is in this slot             H1: exactly one slot per exam
w[e,r,slot] exam e uses room r in this slot    H4: a room hosts at most one exam per slot
seats: sum of capacity//2 over the chosen rooms >= exam size (H5)      H3: a group sits one exam per slot
soft: 5 points for every extra exam a group has on the same day (exactly the validator's penalty)
"""
from collections import defaultdict

from ortools.sat.python import cp_model

from .progress import attach_solver_log, emit, make_solution_callback


def solve_exams(data, time_limit=60, workers=8, seed=1, room_weight=1, progress_callback=None):
    cal = data["calendar"]["exam_week"]
    edays, esess = cal["days"], [s["id"] for s in cal["sessions"]]
    slots = [(d, s) for d in edays for s in esess]
    exams = {e["id"]: e for e in data["exams"]}
    erooms = {r["id"]: r["capacity"] // 2 for r in data["rooms"] if "exam" in r["allowed_uses"]}
    per_group = defaultdict(list)
    for e in exams.values():
        for g in e["groups"]:
            per_group[g].append(e["id"])

    m = cp_model.CpModel()
    z = {(e, s): m.NewBoolVar(f"z|{e}|{s}") for e in exams for s in slots}
    w = {(e, r, s): m.NewBoolVar(f"w|{e}|{r}|{s}") for e in exams for r in erooms for s in slots}
    for e in exams:
        m.AddExactlyOne(z[(e, s)] for s in slots)                                           # H1
        for s in slots:
            for r in erooms:
                m.AddImplication(w[(e, r, s)], z[(e, s)])
            m.Add(sum(erooms[r] * w[(e, r, s)] for r in erooms) >= exams[e]["size"] * z[(e, s)])   # H5
    for r in erooms:
        for s in slots:
            m.AddAtMostOne(w[(e, r, s)] for e in exams)                                     # H4
    for g, eids in per_group.items():
        for s in slots:
            m.AddAtMostOne(z[(e, s)] for e in eids)                                         # H3
    extra = []
    for g, eids in per_group.items():
        if len(eids) < 2:
            continue
        for d in edays:
            ex = m.NewIntVar(0, len(eids) - 1, f"ex|{g}|{d}")
            m.Add(ex >= sum(z[(e, (d, s))] for e in eids for s in esess) - 1)
            extra.append(ex)
    m.Minimize(1000 * 5 * sum(extra) + room_weight * sum(w.values()))    # the day penalty wins; fewer rooms is the tie-break

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit)
    solver.parameters.num_workers = int(workers or 8)
    solver.parameters.random_seed = int(seed)
    if progress_callback is None:
        status = solver.StatusName(solver.Solve(m))
    else:                                                     # optional live progress; the model is untouched
        emit(progress_callback, "solver_started", stage="exam_scheduling",
             time_limit_seconds=float(time_limit), workers=int(workers or 8))
        attach_solver_log(solver, progress_callback, "exam_scheduling")
        status = solver.StatusName(solver.Solve(m, make_solution_callback(cp_model, progress_callback,
                                                                             "exam_scheduling")))
    out = {"status": status, "exams": [], "wall": solver.WallTime()}
    if status in ("OPTIMAL", "FEASIBLE"):
        for e in exams:
            s = next(s for s in slots if solver.BooleanValue(z[(e, s)]))
            out["exams"].append({"exam_id": e, "day": s[0], "session": s[1],
                                 "rooms": sorted(r for r in erooms if solver.BooleanValue(w[(e, r, s)]))})
        out["day_penalty"] = 5 * sum(solver.Value(x) for x in extra)
        out["objective"], out["bound"] = solver.ObjectiveValue(), solver.BestObjectiveBound()
    emit(progress_callback, "solver_finished", stage="exam_scheduling", status=status,
         wall_seconds=out["wall"], objective=out.get("objective"), best_bound=out.get("bound"))
    return out
