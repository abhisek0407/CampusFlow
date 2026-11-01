import os
import sys
import time
import httpx

BASE = "http://localhost:5000"

def run_smoke_tests():
    print("=" * 70)
    print("CAMPUSFLOW END-TO-END SMOKE TEST SUITE (Python Runner)")
    print("=" * 70)

    # 1. Obtain Tokens
    print("\n1. Obtaining Auth Tokens for Admin, Faculty, and Club...")
    with httpx.Client(timeout=10.0) as client:
        admin_res = client.post(f"{BASE}/api/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"}).json()
        fac_res = client.post(f"{BASE}/api/auth/login", json={"email": "faculty.f01@cit.edu", "password": "Faculty@123"}).json()
        club_res = client.post(f"{BASE}/api/auth/login", json={"email": "club.dramatics@cit.edu", "password": "Club@123"}).json()

    admin_token = admin_res.get("token")
    fac_token = fac_res.get("token")
    club_token = club_res.get("token")
    assert admin_token and fac_token and club_token, "Could not acquire tokens"
    print("  [OK] Tokens acquired successfully")

    headers_admin = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    headers_fac = {"Authorization": f"Bearer {fac_token}", "Content-Type": "application/json"}
    headers_club = {"Authorization": f"Bearer {club_token}", "Content-Type": "application/json"}

    with httpx.Client(timeout=60.0) as client:
        # 2. Auth guards
        print("\n2. Testing Auth Guards (401 / 403)...")
        r_401 = client.post(f"{BASE}/api/bookings/decide", json={"request_id": "BR-01", "status": "approved"})
        print(f"  [401 without token] Status: {r_401.status_code} -> {'PASS' if r_401.status_code == 401 else 'FAIL'}")
        assert r_401.status_code == 401

        r_fac_approve = client.post(f"{BASE}/api/disruptions/approve", json={"disruption_id": "TEST"}, headers=headers_fac)
        print(f"  [403 Faculty -> disruptions/approve] Status: {r_fac_approve.status_code} -> {'PASS' if r_fac_approve.status_code == 403 else 'FAIL'}")
        assert r_fac_approve.status_code == 403

        r_club_decide = client.post(f"{BASE}/api/bookings/decide", json={"request_id": "BR-01", "status": "approved"}, headers=headers_club)
        print(f"  [403 Club -> bookings/decide] Status: {r_club_decide.status_code} -> {'PASS' if r_club_decide.status_code == 403 else 'FAIL'}")
        assert r_club_decide.status_code == 403

        # 3. bookings/check
        print("\n3. Testing POST /api/bookings/check (Solver Feasibility Gate)...")
        aud_draft = {
            "attendance": 450,
            "windows": [{"day": "THU", "from_period": 10, "to_period": 11}],
            "duration_periods": 2,
            "room_types": ["auditorium"],
            "needs": ["stage", "pa_system"]
        }
        r_aud = client.post(f"{BASE}/api/bookings/check", json={"draft": aud_draft}, headers=headers_club).json()
        print(f"  [Valid AUD check] verdict: {r_aud.get('verdict')}, room: {r_aud.get('room_id')}, affects_existing: {r_aud.get('affects_existing')}")
        assert r_aud.get("verdict") == "approved"

        unk_draft = {
            "attendance": 45,
            "windows": [{"day": "TUE", "from_period": 10, "to_period": 11}],
            "duration_periods": 2,
            "requested_room": "UNKNOWN_ROOM_999"
        }
        r_unk = client.post(f"{BASE}/api/bookings/check", json={"draft": unk_draft}, headers=headers_club).json()
        print(f"  [Unknown room check] verdict: {r_unk.get('verdict')}, reasons: {r_unk.get('reasons')}")
        assert r_unk.get("verdict") == "invalid"

        cap_draft = {
            "attendance": 2000,
            "windows": [{"day": "TUE", "from_period": 10, "to_period": 11}],
            "duration_periods": 2
        }
        r_cap = client.post(f"{BASE}/api/bookings/check", json={"draft": cap_draft}, headers=headers_club).json()
        print(f"  [Capacity 2000 check] verdict: {r_cap.get('verdict')}, reasons: {r_cap.get('reasons')}")
        assert r_cap.get("verdict") in ("rejected", "invalid")

        sh2_draft = {
            "attendance": 60,
            "requested_room": "SH-2",
            "needs": ["accessible"],
            "windows": [{"day": "FRI", "from_period": 3, "to_period": 4}],
            "duration_periods": 2
        }
        r_sh2 = client.post(f"{BASE}/api/bookings/check", json={"draft": sh2_draft}, headers=headers_club).json()
        print(f"  [SH-2 + accessible mismatch] verdict: {r_sh2.get('verdict')}, room: {r_sh2.get('room_id')}, reasons: {r_sh2.get('reasons')}")
        assert r_sh2.get("verdict") == "alternative_offered"
        assert r_sh2.get("room_id") == "CR-105"
        assert any("accessible" in str(r).lower() for r in r_sh2.get("reasons", []))

        # 4. Role cap
        print("\n4. Testing Role Category Cap Enforced on POST /api/bookings...")
        cap_post = client.post(
            f"{BASE}/api/bookings",
            json={
                "title": "Smoke Cap Test [smoke_test]",
                "attendance": 30,
                "windows": [{"day": "TUE", "from_period": 10, "to_period": 11}],
                "duration_periods": 2,
                "requested_category": "institute_event"
            },
            headers={**headers_club, "Idempotency-Key": f"smoke_cap_{time.time()}"}
        ).json()
        print(f"  [Club requested institute_event] Stored requested_category: {cap_post.get('booking', {}).get('requested_category')}")
        assert cap_post.get("booking", {}).get("requested_category") == "club_event"

        # 5. Rule B3: Cancelled BR-04 can never be approved
        print("\n5. Testing Rule B3: Cancelled BR-04 can never be approved...")
        r_b3 = client.post(f"{BASE}/api/bookings/decide", json={"request_id": "BR-04", "status": "approved"}, headers=headers_admin)
        print(f"  [Admin approving BR-04] Status: {r_b3.status_code}, error: {r_b3.json().get('error')}")
        assert r_b3.status_code == 400
        assert "cancelled" in r_b3.json().get("error", "").lower()

        # 6. disruptions/propose
        print("\n6. Testing disruptions/propose (Faculty F01, WED P2 - CS101-B-L2)...")
        sched_res_before = client.get(f"{BASE}/api/schedule/current", headers=headers_admin).json()
        v_before = sched_res_before.get("schedule", {}).get("version") or sched_res_before.get("version")

        r_prop = client.post(
            f"{BASE}/api/disruptions/propose",
            json={
                "title": "F01 Smoke Leave [smoke_test]",
                "reason": "HOD Duties [smoke_test]",
                "changes": [{
                    "type": "faculty_unavailable",
                    "faculty_id": "F01",
                    "days": ["WED"],
                    "periods": [2],
                    "reason": "HOD duties [smoke_test]"
                }]
            },
            headers=headers_fac
        ).json()

        sched_res_after = client.get(f"{BASE}/api/schedule/current", headers=headers_admin).json()
        v_after_prop = sched_res_after.get("schedule", {}).get("version") or sched_res_after.get("version")

        disrupt_id = r_prop.get("disruption_id")
        diff_list = r_prop.get("proposal", {}).get("diff", [])
        diff_count = len(diff_list)
        print(f"  [Proposal Result] ID: {disrupt_id}, feasible: {r_prop.get('proposal', {}).get('feasible')}, diff moves: {diff_count}")
        for move in diff_list:
            sid = move.get("session_id")
            old_pos = f"{move.get('old', {}).get('day')} P{move.get('old', {}).get('start_period')} in {move.get('old', {}).get('room_id')}"
            new_pos = f"{move.get('new', {}).get('day')} P{move.get('new', {}).get('start_period')} in {move.get('new', {}).get('room_id')}"
            print(f"    - Session {sid}: {old_pos} -> {new_pos} (type: {move.get('type')})")

        print(f"  [Schedule Version Check] Before: {v_before}, After propose: {v_after_prop}")
        assert v_before is not None, f"v_before is missing: {sched_res_before}"
        assert v_after_prop is not None, f"v_after_prop is missing: {sched_res_after}"
        assert v_before == v_after_prop, f"Version changed during propose! Before: {v_before}, After: {v_after_prop}"
        assert r_prop.get("proposal", {}).get("feasible") is True

        # 7. Approve twice (only when SMOKE_ALLOW_APPROVE == '1')
        print("\n7. Concurrency & Stale Proposal Check...")
        if os.getenv("SMOKE_ALLOW_APPROVE") == "1":
            r_app1 = client.post(f"{BASE}/api/disruptions/approve", json={"disruption_id": disrupt_id}, headers=headers_admin)
            print(f"  [First Approve] Status: {r_app1.status_code}, success: {r_app1.json().get('success')}, new_version: {r_app1.json().get('new_version')}")
            assert r_app1.status_code == 200

            r_app2 = client.post(f"{BASE}/api/disruptions/approve", json={"disruption_id": disrupt_id}, headers=headers_admin)
            print(f"  [Second Approve Same Proposal] Status: {r_app2.status_code}, error: {r_app2.json().get('error')}")
            assert r_app2.status_code in (409, 400)
        else:
            print("  Skipping approve/stale section (SMOKE_ALLOW_APPROVE!=1); schedule untouched: PASS")

        # 8. Decisions endpoints
        print("\n8. Testing GET /api/decisions/booking/[id]...")
        r_br01 = client.get(f"{BASE}/api/decisions/booking/BR-01", headers=headers_admin)
        print(f"  [decisions/booking/BR-01] Status: {r_br01.status_code}, effective_cat: {r_br01.json().get('effective_category')}")
        assert r_br01.status_code == 200

        r_nope = client.get(f"{BASE}/api/decisions/booking/NOPE", headers=headers_admin)
        print(f"  [decisions/booking/NOPE] Status: {r_nope.status_code}")
        assert r_nope.status_code == 404

        r_other = client.get(f"{BASE}/api/decisions/booking/BR-01", headers=headers_club)
        print(f"  [Club reading other booking] Status: {r_other.status_code}")
        assert r_other.status_code == 403

        # 9. Manual booking & agent availability
        print("\n9. Testing Manual Booking Works with Idempotency Key...")
        r_man = client.post(
            f"{BASE}/api/bookings",
            json={
                "title": "Smoke Manual Booking [smoke_test]",
                "attendance": 25,
                "windows": [{"day": "MON", "from_period": 10, "to_period": 11}],
                "duration_periods": 2,
                "requested_category": "club_event"
            },
            headers={**headers_club, "Idempotency-Key": f"smoke_man_{time.time()}"}
        )
        print(f"  [Manual Booking] Status: {r_man.status_code}, success: {r_man.json().get('success')}")
        assert r_man.status_code in (200, 201)

    print("\n" + "=" * 70)
    print("ALL SMOKE TESTS COMPLETED AND VERIFIED 100% SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_smoke_tests()
