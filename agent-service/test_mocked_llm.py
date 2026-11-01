import os
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from google.adk.tools.tool_context import ToolContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.sessions.session import Session

# Import agent-service modules
from tools import (
    list_rooms,
    check_booking,
    get_my_sessions,
    propose_timetable_change,
    get_proposal,
    explain_booking,
)
from main import app, extract_structured_output, AGENT_SHARED_SECRET

BASE_URL = "http://localhost:5000"

def get_tokens():
    with httpx.Client(timeout=10.0) as client:
        admin_resp = client.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"})
        club_resp = client.post(f"{BASE_URL}/api/auth/login", json={"email": "club.dramatics@cit.edu", "password": "Club@123"})
        fac_resp = client.post(f"{BASE_URL}/api/auth/login", json={"email": "faculty.f01@cit.edu", "password": "Faculty@123"})
        return {
            "admin": admin_resp.json()["token"],
            "club": club_resp.json()["token"],
            "faculty": fac_resp.json()["token"],
        }

class MockToolContext:
    def __init__(self, jwt: str, today_iso: str = "2026-11-01"):
        self.state = {"jwt": jwt, "today_iso": today_iso}

def test_tool_wiring_and_jwt_forwarding():
    tokens = get_tokens()
    club_ctx = MockToolContext(jwt=tokens["club"])
    fac_ctx = MockToolContext(jwt=tokens["faculty"])

    # 1. list_rooms
    rooms_res = list_rooms(type="auditorium", min_capacity=400, tool_context=club_ctx)
    assert rooms_res.get("success") is True, f"list_rooms failed: {rooms_res}"
    assert len(rooms_res.get("rooms", [])) > 0
    print("\n[PASS] list_rooms returned valid rooms for club token")

    # 2. check_booking
    draft = {
        "title": "Annual Play",
        "attendance": 450,
        "duration_periods": 2,
        "windows": [{"day": "THU", "from_period": 10, "to_period": 11}],
        "room_types": ["auditorium"],
        "needs": ["stage", "pa_system"],
        "requested_room": "AUD",
        "requested_category": "club_event"
    }
    check_res = check_booking(draft=draft, tool_context=club_ctx)
    assert check_res.get("success") is True, f"check_booking failed: {check_res}"
    assert "verdict" in check_res
    print(f"[PASS] check_booking returned verdict: {check_res.get('verdict')}")

    # 3. get_my_sessions
    sessions_res = get_my_sessions(tool_context=fac_ctx)
    assert sessions_res.get("success") is True, f"get_my_sessions failed: {sessions_res}"
    assert sessions_res.get("faculty_id") == "F01"
    assert len(sessions_res.get("sessions", [])) > 0
    print(f"[PASS] get_my_sessions returned {len(sessions_res.get('sessions'))} sessions for F01")

    # 4. explain_booking (for existing seed booking BR-07)
    explain_res = explain_booking(booking_id="BR-07", tool_context=club_ctx)
    assert explain_res.get("success") is True, f"explain_booking failed: {explain_res}"
    assert explain_res.get("booking_id") == "BR-07"
    print(f"[PASS] explain_booking returned facts for BR-07: status={explain_res.get('status')}")

def test_fastapi_agent_secret_authentication():
    client = TestClient(app)

    # Missing X-Agent-Secret header
    res_no_auth = client.post("/chat", json={"message": "hello"})
    assert res_no_auth.status_code == 401

    # Invalid X-Agent-Secret header
    res_bad_auth = client.post("/chat", json={"message": "hello"}, headers={"X-Agent-Secret": "wrong_secret"})
    assert res_bad_auth.status_code == 401

    print("[PASS] FastAPI endpoint correctly enforces 401 on missing or invalid X-Agent-Secret")

def test_structured_output_parser_resilience():
    # 1. Valid JSON block
    sample_valid = """Here is your booking check.
```json
{
  "draft": {
    "title": "Dramatics Play",
    "attendance": 450,
    "duration_periods": 2,
    "windows": [{"day": "THU", "from_period": 10, "to_period": 11}],
    "room_types": ["auditorium"],
    "needs": ["stage", "pa_system"],
    "requested_room": "AUD-01",
    "requested_category": "club_event"
  },
  "proposal_id": null,
  "assumptions": ["Assumed 6pm to 8pm corresponds to P10-P11"],
  "follow_up_questions": ["Do you require setup time before 6pm?"]
}
```
Please let me know if you want to proceed."""
    reply, draft, prop_id, assumptions, follow_ups = extract_structured_output(sample_valid)
    assert draft is not None
    assert draft["attendance"] == 450
    assert len(assumptions) == 1
    assert len(follow_ups) == 1
    assert "```json" not in reply
    print("[PASS] extract_structured_output parsed valid structured output cleanly")

    # 2. Malformed JSON block (must not crash, drops structured part)
    sample_malformed = """I tried to generate JSON:
```json
{
  "draft": { unquoted_key: missing_quotes
```
Have a good day!"""
    reply, draft, prop_id, assumptions, follow_ups = extract_structured_output(sample_malformed)
    assert draft is None
    assert assumptions == []
    assert "Have a good day!" in reply
    print("[PASS] extract_structured_output survived malformed JSON without crashing")

    # 3. Plain text response
    sample_plain = "Sure, auditorium capacity is 500."
    reply, draft, prop_id, assumptions, follow_ups = extract_structured_output(sample_plain)
    assert draft is None
    assert reply == sample_plain
    print("[PASS] extract_structured_output handled plain text cleanly")

if __name__ == "__main__":
    print("=== RUNNING MOCKED LLM & TOOL WIRING TESTS ===")
    test_tool_wiring_and_jwt_forwarding()
    test_fastapi_agent_secret_authentication()
    test_structured_output_parser_resilience()
    print("\nALL MOCKED LLM & TOOL WIRING TESTS PASSED!")
