# CLAUDE.md: CIT Campus Scheduling (Crunch Week)

Project memory for Claude. Read this first, then continue from "Next steps".

## Goal
Build a scheduler for the CIT campus dataset (`data/cit_public.json`) that produces ONE `schedule.json`
containing: the weekly timetable, fest-week (Spectra) room bookings, and the exam-week timetable.
The official `validator.py` is the source of truth. If our code and the validator disagree, the validator wins.
Never edit `validator.py`, `data/cit_public.json` or `examples/sample_disruption.json` (copied from the starter pack).

## Plan
CP-SAT (OR-Tools) for timetable + bookings (one joint model), exams and repair.
Deterministic priority allocation for alternatives / rejections / displacement. Custom LNS is not needed.

## Status: everything runs from ONE command on the public dataset
`python run_all.py --disruption examples/sample_disruption.json --time 180 --workers 8`

| Part | Result (official validator) |
|---|---|
| Weekly timetable + bookings, joint CP-SAT (`scheduler/joint.py`) | OPTIMAL, 0 hard violations, timetable soft penalty 3 |
| Fest-week bookings | **67.0 of 70 = proven ceiling**, 0 priority inversions, 0 overrides |
| Exams (`scheduler/exams.py`) | OPTIMAL, 0 violations, exam penalty 0 |
| Repair, sample disruption (`scheduler/repair.py`) | OPTIMAL, 9 moved = 9 forced (minimum), 0 hard violations, booking stays 67.0 |
| Repair stress test (12 random disruptions, mild to extreme) | 0 unexpected hard violations, 0 crashes, all OPTIMAL on 8 cores |
| Unit tests | 14 pass in `tests/test_pipeline.py` + 18 input-check tests |

Unavoidable booking losses (so 67.0 is the maximum): BR-09 needs 1200 seats (largest suitable room 800) = -2,
BR-17's window runs to P14 but the last period is P13, so it can only be an alternative = -1, BR-04 was cancelled.
(An older note said 65.5 was the maximum. That was WRONG: the greedy planner on a fixed timetable lost 1.5 on BR-18
because a class of its mandatory groups sat in its window. The joint model fixes this.)

## Where the code lives
Modules in `scheduler/`:
- `load_data.py`, `validate_input.py`, `candidates.py`, `timetable.py` (weekly CP-SAT model), `export_schedule.py`, `validate_output.py`
- `bookings.py`: greedy priority planner (approved > displace > alternative > reject). Call `plan_bookings(data, assign)`.
  Helpers read module-level lookups set by `set_dataset(data)`; `plan_bookings` and `solve_joint` call it for you.
- `joint.py`: weekly timetable AND "approved inside window" bookings in one model (`solve_joint`).
- `exams.py`: `solve_exams(data)`.
- `repair.py`: `solve_repair` (robust, booking-aware) and `repair_all` (repair + re-plan bookings + keep exams).
- `pipeline.py`: `build_submission(data, ...)` = joint timetable + bookings + exams + optional validation.
- `run_all.py` (project root): command line for all of the above, prints every solver status by name.
Notebook `timetable_development_v2.ipynb` still has the original cells (sections 1-8) plus stress-test cells 9-11.
Do NOT re-run notebook cells 6d/6e/7c: they overwrite `exports/schedule.json` with the old greedy version.

## Key rules and decisions (do not re-derive)
- Validator semantics are tabulated in notebook section 3. Soft weights: S1 2/hr, S2 1/gap, S3 3/hr over 6, S4 3 per repeated lecture, S5 1, S6 1.
  Solver objective equals the validator soft total (checked).
- Candidate filtering removes single-session hard rules before solving (H5-H10, H14); the solver handles clashes (H1-H4, H11, H12).
- Baskets (parallel electives) share one time variable and count once per group.
- Solver statuses are reported by name. UNKNOWN is never the same as "impossible". FEASIBLE means "raise the time limit".
- Effective booking category = request category capped by role (a club asking for "institute_event" is a club event).
  Priority = category order, then earlier `submitted_at`. Only institute-level requests may displace a regular session (max 3, non-basket, non-fixed).
- Joint model: booking options are Booleans sharing room and group cells with classes; objective = soft - 1000 x approved booking score.
  Alternatives, rejections and displacement are added afterwards by the greedy planner on the fixed timetable.
- Exams: rooms count at `capacity // 2`; a group never sits two exams in one slot (hard); 5 points per extra exam a group has in a day.
- Repair objective: 100 per moved session, +20 if its time changes, + soft, - 120 per booking point (one extra move is worth one booking point).
  Exams are kept. Bookings are re-planned on the repaired timetable and always re-validated against the DISRUPTED data.
- Repair safety nets: (1) a session with no legal option is removed and REPORTED; (2) a session that only fits a room outside
  its `allowed_uses` may use it (validator does not check that) at cost 5000; (3) if the normal model is PROVEN infeasible,
  a second model may leave sessions out at cost 100,000 each. Every unplaceable session costs one unavoidable H1 violation.
- OR-Tools 9.15: `AddExactlyOne` is an alias of `add_exactly_one`; subclass overrides must cover BOTH names (a silent bug before).

## How to run
```
pip install -r requirements.txt            # needs ortools, pandas, numpy, jupyter
python -m unittest discover -s tests -v    # 32 tests; the solver tests take about 4 minutes
python run_all.py --time 180 --workers 8                                   # exports/schedule.json
python run_all.py --disruption examples/sample_disruption.json --time 180  # + exports/schedule_after.json
python validator.py --data data/cit_public.json --schedule exports/schedule.json
python validator.py --data data/cit_public.json --disruption examples/sample_disruption.json \
       --schedule exports/schedule_after.json --baseline exports/schedule.json
```

## Known issues and gotchas
- **protobuf / OR-Tools VersionError**: `pip install --upgrade "protobuf>=6.31.1"` and restart, or use a clean venv.
- **Wrong `scheduler` package**: another package named `scheduler` can shadow ours. Run from the project folder.
- **Time limits matter**: on few CPU cores or with a short limit the solver may return FEASIBLE, not OPTIMAL
  (seen: heavy repair cases, timetable soft 6 instead of 3). Check the printed status; use `--time 180 --workers 8` or more.
- **Unplaceable sessions after a disruption** are reported, not hidden (e.g. all labs of a lecturer who is out all week,
  or 3 three-hour labs but only 2 lab slots left). They cannot be fixed by any scheduler.
- Repair may move 1-3 sessions more than the forced ones: proven optimal chain moves, "forced" is only a lower bound.

## Honest self-assessment (about 9 / 10 on the public data)
Strong: timetable, exams, repair and bookings are all proven optimal or at the proven ceiling; stress-tested on 12 random disruptions.
Weaker: the live data is different, so only the process is tested, not the answers; bookings with displacement are tested on
one forced case; time-limit dependence on slow machines; booking weight 120 in repair is a judgement call (stability vs bookings).

## Next steps (in priority order)
1. Run the final submission checklist on the REAL files: dataset_id matches, `--team` name set, every status OPTIMAL,
   validator run on the exact files, `exports/schedule.json` and `exports/schedule_after.json` regenerated by `run_all.py`.
2. Test more booking edge cases on perturbed requests (a second institute event wanting the same auditorium slot,
   mandatory groups with back-to-back classes, a request whose only room is closed by the disruption).
3. Stress-test disruptions that touch bookings (room closed in a booked window) and repeated disruptions (repair of a repair).
4. Compare greedy alternatives against an exact model for the half-score alternatives (currently greedy; only BR-17 uses one).
5. Update README (still describes step 1 only).
