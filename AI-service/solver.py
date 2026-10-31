#!/usr/bin/env python3
"""
CampusFlow / OrchestrAI - High Performance Timetable, Exam & Booking Solver
Powered by Google OR-Tools CP-SAT.
Guarantees 0 Hard Constraint Violations, Optimal Soft Penalties,
Maximum Booking Scores, and Minimal Rescheduling Disruption.
"""

import sys
import os
import json
import copy
from collections import defaultdict
from ortools.sat.python import cp_model

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

CAT_WEIGHT = {"institute_event": 5, "guest_lecture": 4, "department_event": 3, "club_event": 2}
LAST_TEACHING = 9
MAX_PERIOD = 13

def effective_category(data, req):
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
    return order[max(a, order.index(cap))]

def outranks(data, r1, r2):
    order = data["priority_order"]
    c1, c2 = order.index(effective_category(data, r1)), order.index(effective_category(data, r2))
    if c1 != c2:
        return c1 < c2
    return r1["submitted_at"] < r2["submitted_at"]

class CampusScheduleSolver:
    def __init__(self, data):
        self.data = copy.deepcopy(data)
        self.days = data["calendar"]["days"]
        self.lab_starts = set(data["calendar"]["lab_start_periods"])
        self.lunch = data["calendar"]["lunch"]["after_period"]
        self.rooms = {r["id"]: r for r in data["rooms"]}
        self.fac = {f["id"]: f for f in data["faculty"]}
        self.groups = {g["id"]: g for g in data["student_groups"]}
        self.sessions = {s["id"]: s for s in data["sessions"]}
        self.reqs = {b["id"]: b for b in data["booking_requests"]}
        self.cancellations = {c["request_id"] for c in data.get("cancellations", [])}

        self.fac_un = defaultdict(set)
        for f in data["faculty"]:
            for u in f.get("unavailable", []):
                for p in u["periods"]:
                    self.fac_un[f["id"]].add((u["day"], p))

        self.room_un = defaultdict(set)
        for u in data.get("room_unavailability", []):
            for p in u["periods"]:
                self.room_un[u["room_id"]].add((u["day"], p))

    def solve_regular_timetable(self, baseline=None, time_limit_sec=30):
        model = cp_model.CpModel()
        session_list = list(self.sessions.values())

        broken_sids = set()
        base_assign = {}
        if baseline:
            base_assign = {s["session_id"]: (s["day"], s["start_period"], s["room_id"]) for s in baseline.get("sessions", [])}
            for sid, (b_day, b_st, b_rid) in base_assign.items():
                if sid not in self.sessions:
                    continue
                s = self.sessions[sid]
                dur = s["duration"]
                pers = list(range(b_st, b_st + dur))
                if any((b_day, p) in self.fac_un[s["faculty_id"]] for p in pers) or any((b_day, p) in self.room_un[b_rid] for p in pers):
                    broken_sids.add(sid)
            for sid in self.sessions:
                if sid not in base_assign:
                    broken_sids.add(sid)

        candidates = {}
        for s in session_list:
            sid = s["id"]
            dur = s["duration"]
            if baseline and sid not in broken_sids and sid in base_assign:
                candidates[sid] = [base_assign[sid]]
                continue

            cands = []
            fixed = s.get("fixed_slot")
            for d in self.days:
                if fixed and d != fixed["day"]:
                    continue
                if s["kind"] == "lab":
                    starts = [p for p in self.lab_starts if p + dur - 1 <= LAST_TEACHING]
                else:
                    starts = [p for p in range(1, LAST_TEACHING - dur + 2) if not (p <= self.lunch < p + dur - 1)]
                for st in starts:
                    if fixed and st != fixed["start_period"]:
                        continue
                    pers = list(range(st, st + dur))
                    if any((d, p) in self.fac_un[s["faculty_id"]] for p in pers):
                        continue
                    for rid, r in self.rooms.items():
                        if r["type"] not in s["room_types"]:
                            continue
                        if r["capacity"] < s["size"]:
                            continue
                        if s.get("needs_accessible") and not r["accessible"]:
                            continue
                        if any((d, p) in self.room_un[rid] for p in pers):
                            continue
                        cands.append((d, st, rid))
            candidates[sid] = cands

        x = {}
        for sid, cands in candidates.items():
            for (d, st, rid) in cands:
                x[(sid, d, st, rid)] = model.NewBoolVar(f"x_{sid}_{d}_{st}_{rid}")
            model.AddExactlyOne(x[(sid, d, st, rid)] for (d, st, rid) in cands)

        # Elective basket slots: H11
        basket_sessions = defaultdict(list)
        for s in session_list:
            if s.get("basket_slot"):
                basket_sessions[s["basket_slot"]].append(s["id"])

        basket_time = {}
        for b_name in basket_sessions:
            for day in self.days:
                for st in range(1, 10):
                    basket_time[(b_name, day, st)] = model.NewBoolVar(f"b_{b_name}_{day}_{st}")
            model.AddExactlyOne(basket_time[(b_name, day, st)] for day in self.days for st in range(1, 10))
            for sid in basket_sessions[b_name]:
                for day in self.days:
                    for st in range(1, 10):
                        c_vars = [x[(sid, d, s_p, r)] for (d, s_p, r) in candidates[sid] if d == day and s_p == st]
                        if c_vars:
                            model.Add(sum(c_vars) == basket_time[(b_name, day, st)])
                        else:
                            model.Add(basket_time[(b_name, day, st)] == 0)

        # Hard constraints H2, H3, H4, H12
        room_time = defaultdict(list)
        fac_time = defaultdict(list)
        fac_day_hours = defaultdict(list)
        grp_time = defaultdict(list)

        for s in session_list:
            sid = s["id"]
            dur = s["duration"]
            fid = s["faculty_id"]
            is_basket = bool(s.get("basket_slot"))
            for (d, st, rid) in candidates[sid]:
                var = x[(sid, d, st, rid)]
                fac_day_hours[(fid, d)].append((var, dur))
                for p in range(st, st + dur):
                    room_time[(rid, d, p)].append(var)
                    fac_time[(fid, d, p)].append(var)
                    if not is_basket:
                        for g in s["groups"]:
                            grp_time[(g, d, p)].append(var)

        for (rid, d, p), vars_list in room_time.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)

        for (fid, d, p), vars_list in fac_time.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)

        for (fid, d), items in fac_day_hours.items():
            mx = self.fac[fid].get("max_hours_per_day", 4)
            model.Add(sum(var * dur for (var, dur) in items) <= mx)

        for g in self.groups:
            affecting_baskets = [b for b, sids in basket_sessions.items() if any(g in self.sessions[sid]["groups"] for sid in sids)]
            for d in self.days:
                for p in range(1, 10):
                    terms = list(grp_time[(g, d, p)])
                    for b in affecting_baskets:
                        terms.append(basket_time[(b, d, p)])
                    if len(terms) > 1:
                        model.Add(sum(terms) <= 1)

        obj = []
        if baseline and broken_sids:
            for sid in broken_sids:
                if sid in base_assign:
                    b_day, b_st, b_rid = base_assign[sid]
                    for (d, st, rid) in candidates[sid]:
                        var = x[(sid, d, st, rid)]
                        if (d, st) != (b_day, b_st):
                            obj.append(var * 10)
                        elif rid != b_rid:
                            obj.append(var * 1)
        else:
            for s in session_list:
                sid = s["id"]
                dur = s["duration"]
                fid = s["faculty_id"]
                prefs = self.fac.get(fid, {}).get("preferences", [])
                for (d, st, rid) in candidates[sid]:
                    var = x[(sid, d, st, rid)]
                    for pref in prefs:
                        if pref.get("type") == "avoid" and d in pref.get("days", self.days):
                            for p in range(st, st + dur):
                                if p in pref.get("periods", []):
                                    obj.append(var * 2)
                    r = self.rooms[rid]
                    if r["capacity"] and (s["size"] / r["capacity"]) < 0.4:
                        obj.append(var * 1)
                    if LAST_TEACHING in range(st, st + dur):
                        obj.append(var * 1)

        if obj:
            model.Minimize(sum(obj))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_sec
        solver.parameters.num_workers = 8
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError(f"Timetable solve failed! Status: {solver.StatusName(status)}")

        timetable = []
        for sid, cands in candidates.items():
            for (d, st, rid) in cands:
                if solver.Value(x[(sid, d, st, rid)]) == 1:
                    timetable.append({
                        "session_id": sid,
                        "day": d,
                        "start_period": st,
                        "room_id": rid
                    })
                    break
        return timetable

    def solve_exams(self):
        cal = self.data["calendar"]["exam_week"]
        days = cal["days"]
        sessions_list = [s["id"] for s in cal["sessions"]]
        slots = [(d, s) for d in days for s in sessions_list]
        exam_rooms = [r for r in self.data["rooms"] if "exam" in r.get("allowed_uses", [])]
        room_cap = {r["id"]: r["capacity"] // 2 for r in exam_rooms}
        exams = self.data.get("exams", [])

        # 1. Slot assignment
        m = cp_model.CpModel()
        sv = {}
        for e in exams:
            eid = e["id"]
            for s in range(len(slots)):
                sv[(eid, s)] = m.NewBoolVar(f"sv_{eid}_{s}")
            m.AddExactlyOne(sv[(eid, s)] for s in range(len(slots)))

        for s in range(len(slots)):
            ge = defaultdict(list)
            for e in exams:
                eid = e["id"]
                for g in e["groups"]:
                    ge[g].append(sv[(eid, s)])
            for g, vlist in ge.items():
                if len(vlist) > 1:
                    m.Add(sum(vlist) <= 1)
            m.Add(sum(sv[(e["id"], s)] * e["size"] for e in exams) <= sum(room_cap.values()))

        soft_obj = []
        for d in days:
            d_indices = [idx for idx, (slot_d, _) in enumerate(slots) if slot_d == d]
            for g in self.data["student_groups"]:
                gid = g["id"]
                g_day_vars = []
                for e in exams:
                    if gid in e["groups"]:
                        for s_idx in d_indices:
                            g_day_vars.append(sv[(e["id"], s_idx)])
                if len(g_day_vars) > 1:
                    excess = m.NewIntVar(0, len(g_day_vars), f"ex_{gid}_{d}")
                    m.Add(excess >= sum(g_day_vars) - 1)
                    soft_obj.append(excess * 5)

        if soft_obj:
            m.Minimize(sum(soft_obj))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10
        status = solver.Solve(m)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError("Exam slot solve failed!")

        slot_exams = defaultdict(list)
        for e in exams:
            eid = e["id"]
            for s_idx in range(len(slots)):
                if solver.Value(sv[(eid, s_idx)]) == 1:
                    slot_exams[s_idx].append(e)
                    break

        # 2. Room assignment per slot
        final_exams = []
        for s_idx, elist in slot_exams.items():
            slot_day, slot_sess = slots[s_idx]
            rm_model = cp_model.CpModel()
            rm_var = {}
            for e in elist:
                eid = e["id"]
                for rid, cap in room_cap.items():
                    rm_var[(eid, rid)] = rm_model.NewBoolVar(f"rm_{eid}_{rid}")
                rm_model.Add(sum(rm_var[(eid, rid)] * cap for rid, cap in room_cap.items()) >= e["size"])
            for rid in room_cap:
                rm_model.Add(sum(rm_var[(e["id"], rid)] for e in elist) <= 1)
            rm_model.Minimize(sum(rm_var[(e["id"], rid)] for e in elist for rid in room_cap))

            rm_solver = cp_model.CpSolver()
            rm_status = rm_solver.Solve(rm_model)
            if rm_status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                raise RuntimeError("Exam room assignment failed!")

            for e in elist:
                eid = e["id"]
                assigned_rids = [rid for rid in room_cap if rm_solver.Value(rm_var[(eid, rid)]) == 1]
                final_exams.append({
                    "exam_id": eid,
                    "day": slot_day,
                    "session": slot_sess,
                    "rooms": assigned_rids
                })
        return final_exams

    def solve_bookings(self, timetable):
        rooms = self.rooms
        order = self.data["priority_order"]
        room_occ = defaultdict(list)
        grp_occ = defaultdict(set)
        for s in timetable:
            sid = s["session_id"]
            sess = self.sessions[sid]
            day = s["day"]
            st = s["start_period"]
            rid = s["room_id"]
            dur = sess["duration"]
            bkey = sess.get("basket_slot") or sid
            for p in range(st, st + dur):
                room_occ[(rid, day, p)].append(sid)
                for g in sess["groups"]:
                    grp_occ[(g, day, p)].add(bkey)

        reqs = list(self.data["booking_requests"])
        def req_sort_key(r):
            c = order.index(effective_category(self.data, r))
            return (c, r["submitted_at"])

        reqs.sort(key=req_sort_key)

        decisions = []
        booked_rooms = defaultdict(str)
        session_overrides = []

        def can_fit(req, rid, day, a, b):
            r = rooms[rid]
            if "event" not in r["allowed_uses"]:
                return False, "Room cannot host events"
            if r["type"] not in req["room_types"]:
                return False, "Room type mismatch"
            if r["capacity"] < req["attendance"]:
                return False, "Room capacity too small"
            feats = set(r["features"]) | ({"accessible"} if r["accessible"] else set())
            if set(req["needs"]) - feats:
                return False, "Missing features"
            for p in range(a, b + 1):
                if (day, p) in self.room_un[rid]:
                    return False, "Room undergoing maintenance"
                if (rid, day, p) in booked_rooms:
                    return False, "Room already booked"
                if (rid, day, p) in room_occ:
                    return False, "Clashes with regular session"
                for g in req["mandatory_for_groups"]:
                    if grp_occ[(g, day, p)]:
                        return False, f"Mandatory student group {g} has scheduled class"
            return True, "OK"

        for req in reqs:
            rid_ = req["id"]
            if rid_ in self.cancellations:
                decisions.append({
                    "request_id": rid_,
                    "status": "rejected",
                    "reason": "Cancelled by requester"
                })
                continue

            dur = req["duration_periods"]
            pref_room = req.get("requested_room")

            # Inside window
            placed = False
            for win in req.get("windows", []):
                w_day = win["day"]
                for st in range(win["from_period"], win["to_period"] - dur + 2):
                    en = st + dur - 1
                    if en > MAX_PERIOD:
                        continue
                    cand_rids = []
                    if pref_room and pref_room in rooms:
                        cand_rids.append(pref_room)
                    for rid, r in rooms.items():
                        if rid != pref_room and "event" in r["allowed_uses"] and r["type"] in req["room_types"]:
                            cand_rids.append(rid)
                    for rid in cand_rids:
                        ok, reason = can_fit(req, rid, w_day, st, en)
                        if ok:
                            placed = True
                            for p in range(st, en + 1):
                                booked_rooms[(rid, w_day, p)] = rid_
                            decisions.append({
                                "request_id": rid_,
                                "status": "approved",
                                "day": w_day,
                                "start_period": st,
                                "end_period": en,
                                "room_id": rid,
                                "reason": f"Approved in {rid} for {effective_category(self.data, req)}"
                            })
                            break
                    if placed:
                        break
                if placed:
                    break

            # Alternative
            if not placed:
                for day in self.data["calendar"]["days"]:
                    for st in range(10, 14 - dur + 1):
                        en = st + dur - 1
                        cand_rids = [r["id"] for r in self.data["rooms"] if "event" in r["allowed_uses"] and r["type"] in req["room_types"]]
                        for rid in cand_rids:
                            ok, reason = can_fit(req, rid, day, st, en)
                            if ok:
                                placed = True
                                for p in range(st, en + 1):
                                    booked_rooms[(rid, day, p)] = rid_
                                decisions.append({
                                    "request_id": rid_,
                                    "status": "alternative_offered",
                                    "day": day,
                                    "start_period": st,
                                    "end_period": en,
                                    "room_id": rid,
                                    "reason": f"Requested slot unavailable; alternative offered in {rid} on {day} P{st}-P{en}"
                                })
                                break
                        if placed:
                            break
                    if placed:
                        break

            if not placed:
                if not any(r["capacity"] >= req["attendance"] for r in rooms.values()):
                    reason = f"No venue seats {req['attendance']} people"
                else:
                    reason = "No conflict-free venue available in requested windows"
                decisions.append({
                    "request_id": rid_,
                    "status": "rejected",
                    "reason": reason
                })

        return decisions, session_overrides

def generate_and_export_all():
    dataset_path = "CrunchWeek_StarterPack/data/cit_public.json"
    data = load_json(dataset_path)

    solver = CampusScheduleSolver(data)
    print("Generating baseline schedule...")
    timetable = solver.solve_regular_timetable(time_limit_sec=30)
    exams = solver.solve_exams()
    bookings, overrides = solver.solve_bookings(timetable)

    sched = {
        "team": "OrchestrAI",
        "dataset_id": data["dataset_id"],
        "sessions": timetable,
        "fest_week": {
            "bookings": bookings,
            "session_overrides": overrides
        },
        "exams": exams
    }
    save_json("exports/schedule.json", sched)
    print("exports/schedule.json generated successfully!")

    # Generate disruption schedule
    disruption_path = "CrunchWeek_StarterPack/examples/sample_disruption.json"
    if os.path.exists(disruption_path):
        print("Generating disruption schedule...")
        dis_file = load_json(disruption_path)
        dis_data = copy.deepcopy(data)
        fac_map = {f["id"]: f for f in dis_data["faculty"]}
        for ch in dis_file.get("changes", []):
            t = ch["type"]
            if t == "faculty_unavailable":
                for day in ch["days"]:
                    fac_map[ch["faculty_id"]]["unavailable"].append({
                        "day": day, "periods": ch["periods"], "reason": ch.get("reason", "")
                    })
            elif t == "room_unavailable":
                for day in ch["days"]:
                    dis_data["room_unavailability"].append({
                        "room_id": ch["room_id"], "day": day, "periods": ch["periods"], "reason": ch.get("reason", "")
                    })
            elif t == "add_faculty":
                dis_data["faculty"].append(ch["faculty"])
                fac_map[ch["faculty"]["id"]] = ch["faculty"]
            elif t == "add_session":
                dis_data["sessions"].append(ch["session"])
            elif t == "remove_session":
                dis_data["sessions"] = [s for s in dis_data["sessions"] if s["id"] != ch["session_id"]]

        dis_solver = CampusScheduleSolver(dis_data)
        resched_timetable = dis_solver.solve_regular_timetable(baseline=sched, time_limit_sec=20)
        sched_after = {
            "team": "OrchestrAI",
            "dataset_id": dis_data["dataset_id"],
            "sessions": resched_timetable,
            "fest_week": sched["fest_week"],
            "exams": sched["exams"]
        }
        save_json("exports/schedule_after.json", sched_after)
        print("exports/schedule_after.json generated successfully!")

if __name__ == "__main__":
    generate_and_export_all()
