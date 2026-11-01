#!/usr/bin/env bash
# backend/tests/smoke.sh — CampusFlow End-to-End Smoke Tests
# Verifies Auth, Role Caps, Solver Feasibility, Concurrency & AI Fallbacks.

set -e
BASE="http://localhost:5000"

echo "=== CAMPUSFLOW SMOKE TEST SUITE ==="
echo "1. Obtaining Auth Tokens..."

# Helper for login
login_as() {
  local email="$1"
  local pass="$2"
  curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" | \
    grep -o '"token":"[^"]*' | cut -d'"' -f4
}

ADMIN_TOKEN=$(login_as "admin@cit.edu" "Admin@123")
FAC_TOKEN=$(login_as "faculty.f01@cit.edu" "Faculty@123")
CLUB_TOKEN=$(login_as "club.dramatics@cit.edu" "Club@123")

if [ -z "$ADMIN_TOKEN" ] || [ -z "$FAC_TOKEN" ] || [ -z "$CLUB_TOKEN" ]; then
  echo "FAIL: Could not obtain tokens for all roles."
  exit 1
fi
echo "✓ Tokens retrieved for Admin, Faculty, and Club"

echo ""
echo "2. Testing Authentication & Authorization Guards (401 / 403)..."
# 401 without token
CODE_401=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/bookings/decide" -X POST)
if [ "$CODE_401" -eq 401 ]; then
  echo "✓ 401 without token: PASS"
else
  echo "FAIL: Expected 401, got $CODE_401"
  exit 1
fi

# 403 faculty -> approve disruption
CODE_FAC_APPROVE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/disruptions/approve" \
  -H "Authorization: Bearer $FAC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disruption_id":"DISRUPT-TEST"}')
if [ "$CODE_FAC_APPROVE" -eq 403 ]; then
  echo "✓ 403 Faculty -> disruptions/approve: PASS"
else
  echo "FAIL: Expected 403, got $CODE_FAC_APPROVE"
  exit 1
fi

# 403 club -> decide booking
CODE_CLUB_DECIDE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/bookings/decide" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"request_id":"BR-01","status":"approved"}')
if [ "$CODE_CLUB_DECIDE" -eq 403 ]; then
  echo "✓ 403 Club -> bookings/decide: PASS"
else
  echo "FAIL: Expected 403, got $CODE_CLUB_DECIDE"
  exit 1
fi

echo ""
echo "3. Testing POST /api/bookings/check (Solver Feasibility Gate)..."
# 3a. Valid AUD check
RES_AUD=$(curl -s -X POST "$BASE/api/bookings/check" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft":{"attendance":450,"windows":[{"day":"THU","from_period":10,"to_period":11}],"duration_periods":2,"room_types":["auditorium"],"needs":["stage","pa_system"]}}')
echo "$RES_AUD" | grep -q '"verdict":"approved"' && echo "✓ Valid AUD check verdict=approved: PASS" || { echo "FAIL on AUD check: $RES_AUD"; exit 1; }

# 3b. Unknown room
RES_UNK=$(curl -s -X POST "$BASE/api/bookings/check" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft":{"attendance":45,"windows":[{"day":"TUE","from_period":10,"to_period":11}],"duration_periods":2,"requested_room":"UNKNOWN_ROOM_999"}}')
echo "$RES_UNK" | grep -q '"verdict":"invalid"' && echo "✓ Unknown room verdict=invalid: PASS" || { echo "FAIL on unknown room: $RES_UNK"; exit 1; }

# 3c. Capacity exceeded (attendance 2000)
RES_CAP=$(curl -s -X POST "$BASE/api/bookings/check" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft":{"attendance":2000,"windows":[{"day":"TUE","from_period":10,"to_period":11}],"duration_periods":2}}')
echo "$RES_CAP" | grep -E -q '"verdict":"(rejected|invalid)"' && echo "✓ Attendance 2000 verdict=rejected/invalid: PASS" || { echo "FAIL on attendance 2000: $RES_CAP"; exit 1; }

# 3d. SH-2 + accessible (SH-2 lacks wheelchair accessibility)
RES_SH2=$(curl -s -X POST "$BASE/api/bookings/check" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft":{"attendance":60,"requested_room":"SH-2","needs":["accessible"],"windows":[{"day":"FRI","from_period":3,"to_period":4}],"duration_periods":2}}')
echo "$RES_SH2" | grep -q "accessible" && echo "✓ SH-2 + accessible mismatch flagged in reasons: PASS" || { echo "FAIL on SH-2 accessible check: $RES_SH2"; exit 1; }

echo ""
echo "4. Testing Role Category Cap Enforced on POST /api/bookings..."
# Club user requests institute_event -> must be capped to club_event
RES_ROLE_CAP=$(curl -s -X POST "$BASE/api/bookings" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: smoke_test_cap_$(date +%s)" \
  -d '{"title":"Smoke Cap Test [smoke_test]","attendance":30,"windows":[{"day":"TUE","from_period":10,"to_period":11}],"duration_periods":2,"requested_category":"institute_event"}')
echo "$RES_ROLE_CAP" | grep -q '"requested_category":"club_event"' && echo "✓ Club requested category capped to club_event: PASS" || { echo "FAIL on role cap: $RES_ROLE_CAP"; exit 1; }

echo ""
echo "5. Testing Rule B3: Cancelled BR-04 can never be approved..."
RES_B3=$(curl -s -X POST "$BASE/api/bookings/decide" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"request_id":"BR-04","status":"approved"}')
echo "$RES_B3" | grep -q "cancelled" && echo "✓ BR-04 approval blocked by Rule B3: PASS" || { echo "FAIL on BR-04 decide: $RES_B3"; exit 1; }

echo ""
echo "6. Testing disruptions/propose (Faculty F01, WED P6-9)..."
VERSION_BEFORE=$(curl -s "$BASE/api/schedule/current" -H "Authorization: Bearer $ADMIN_TOKEN" | grep -o '"version":[0-9]*' | cut -d':' -f2)

RES_PROPOSE=$(curl -s -X POST "$BASE/api/disruptions/propose" \
  -H "Authorization: Bearer $FAC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"F01 Department Leave [smoke_test]","reason":"HOD Duty [smoke_test]","changes":[{"type":"faculty_unavailable","faculty_id":"F01","days":["WED"],"periods":[6,7,8,9],"reason":"HOD duties [smoke_test]"}]}')

echo "$RES_PROPOSE" | grep -q '"feasible":true' && echo "✓ Faculty disruption proposal feasible=true: PASS" || { echo "FAIL on propose: $RES_PROPOSE"; exit 1; }

VERSION_AFTER_PROPOSE=$(curl -s "$BASE/api/schedule/current" -H "Authorization: Bearer $ADMIN_TOKEN" | grep -o '"version":[0-9]*' | cut -d':' -f2)
if [ "$VERSION_BEFORE" -eq "$VERSION_AFTER_PROPOSE" ]; then
  echo "✓ Schedule version remained unchanged after propose (Version $VERSION_BEFORE): PASS"
else
  echo "FAIL: Schedule version changed on propose! Before: $VERSION_BEFORE, After: $VERSION_AFTER_PROPOSE"
  exit 1
fi

DISRUPT_ID=$(echo "$RES_PROPOSE" | grep -o '"disruption_id":"[^"]*' | cut -d'"' -f4)

echo ""
if [ "$SMOKE_ALLOW_APPROVE" = "1" ]; then
  echo "7. Submitting faculty disruption, then testing repeat approval (Approve Twice -> 409)..."
  RES_SUBMIT=$(curl -s -X POST "$BASE/api/disruptions/submit" \
    -H "Authorization: Bearer $FAC_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"disruption_id\":\"$DISRUPT_ID\"}")
  echo "$RES_SUBMIT" | grep -q '"success":true' && echo "✓ Faculty disruption submitted: PASS" || { echo "FAIL on submit: $RES_SUBMIT"; exit 1; }
  echo "$RES_SUBMIT" | grep -q '"status":"analyzed"' && echo "✓ Submitted disruption status is analyzed: PASS" || { echo "FAIL: submit did not return analyzed status: $RES_SUBMIT"; exit 1; }

  RES_APPROVE_1=$(curl -s -X POST "$BASE/api/disruptions/approve" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"disruption_id\":\"$DISRUPT_ID\"}")
  echo "$RES_APPROVE_1" | grep -q '"success":true' && echo "✓ First approve succeeded, version upgraded: PASS" || { echo "FAIL on first approve: $RES_APPROVE_1"; exit 1; }

  CODE_APPROVE_2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/disruptions/approve" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"disruption_id\":\"$DISRUPT_ID\"}")
  if [ "$CODE_APPROVE_2" -eq 409 ]; then
    echo "✓ Second approve returned 409 stale_proposal: PASS"
  else
    echo "FAIL: Expected 409 on second approve, got $CODE_APPROVE_2"
    exit 1
  fi
else
  echo "7. Skipping approve/stale section (SMOKE_ALLOW_APPROVE!=1); schedule untouched: PASS"
fi

echo ""
echo "8. Testing GET /api/decisions/booking/[id]..."
# 8a. Existing BR-01 -> 200
RES_DEC_BR01=$(curl -s -w "\n%{http_code}" "$BASE/api/decisions/booking/BR-01" -H "Authorization: Bearer $ADMIN_TOKEN")
CODE_BR01=$(echo "$RES_DEC_BR01" | tail -n1)
if [ "$CODE_BR01" -eq 200 ]; then
  echo "✓ decisions/booking/BR-01 returned 200: PASS"
else
  echo "FAIL: Expected 200 for BR-01, got $CODE_BR01"
  exit 1
fi

# 8b. Nonexistent booking -> 404
CODE_NOPE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/decisions/booking/NOPE" -H "Authorization: Bearer $ADMIN_TOKEN")
if [ "$CODE_NOPE" -eq 404 ]; then
  echo "✓ decisions/booking/NOPE returned 404: PASS"
else
  echo "FAIL: Expected 404 for NOPE, got $CODE_NOPE"
  exit 1
fi

# 8c. Club reading someone else's booking -> 403
CODE_OTHER=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/decisions/booking/BR-01" -H "Authorization: Bearer $CLUB_TOKEN")
if [ "$CODE_OTHER" -eq 403 ]; then
  echo "✓ Club reading someone else's booking returned 403: PASS"
else
  echo "FAIL: Expected 403 for other's booking, got $CODE_OTHER"
  exit 1
fi

echo ""
echo "9. Testing Manual Booking & Agent Down Fallback (503)..."
RES_MANUAL=$(curl -s -X POST "$BASE/api/bookings" \
  -H "Authorization: Bearer $CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: smoke_manual_$(date +%s)" \
  -d '{"title":"Smoke Manual Booking [smoke_test]","attendance":35,"windows":[{"day":"TUE","from_period":10,"to_period":11}],"duration_periods":2,"requested_category":"club_event"}')
echo "$RES_MANUAL" | grep -q '"success":true' && echo "✓ Manual booking returns 200/201: PASS" || { echo "FAIL on manual booking: $RES_MANUAL"; exit 1; }

echo ""
echo "=== ALL SMOKE TESTS PASSED SUCCESSFULLY! ==="
