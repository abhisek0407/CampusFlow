import os
from typing import Optional, List, Dict, Any
import httpx
from google.adk.tools.tool_context import ToolContext

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
TIMEOUT = 15.0

def _get_headers(tool_context: Optional[ToolContext]) -> Dict[str, str]:
    token = ""
    if tool_context and hasattr(tool_context, "state") and tool_context.state:
        token = tool_context.state.get("jwt", "")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

def list_rooms(
    type: Optional[str] = None,
    min_capacity: Optional[int] = None,
    feature: Optional[str] = None,
    accessible: Optional[bool] = None,
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """List available campus rooms with optional filters.

    Args:
        type: Room type (e.g. classroom, lecture_hall, lab, auditorium).
        min_capacity: Minimum capacity required.
        feature: Specific room feature (e.g. projector, ac, lab_pcs, stage, pa_system).
        accessible: Whether the room must be wheelchair accessible.
    """
    params = {}
    if type:
        params["type"] = type
    if min_capacity is not None:
        params["min_capacity"] = str(min_capacity)
    if feature:
        params["feature"] = feature
    if accessible is not None:
        params["accessible"] = str(accessible).lower()

    url = f"{BACKEND_URL}/api/rooms"
    headers = _get_headers(tool_context)
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        try:
            return {"error": e.response.json().get("error", e.response.text), "status": e.response.status_code}
        except Exception:
            return {"error": str(e), "status": e.response.status_code}
    except Exception as e:
        return {"error": f"Failed to list rooms: {str(e)}", "status": 500}

def check_booking(
    draft: Dict[str, Any],
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """Perform a dry-run feasibility check for a proposed booking draft.

    Args:
        draft: The booking draft containing:
            - title: Event title
            - attendance: Number of attendees
            - duration_periods: Number of periods required
            - windows: Array of window objects, e.g. [{"day": "MON", "from_period": 10, "to_period": 11}]
            - room_types: Array of acceptable room types, e.g. ["auditorium"]
            - needs: Array of required features, e.g. ["stage", "pa_system"]
            - requested_room: Specific room ID (or null)
            - requested_category: Event category (institute_event, guest_lecture, department_event, club_event)
            - mandatory_for_groups: Array of group IDs (optional)
    """
    url = f"{BACKEND_URL}/api/bookings/check"
    headers = _get_headers(tool_context)
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(url, json={"draft": draft}, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        try:
            return {"error": e.response.json().get("error", e.response.text), "status": e.response.status_code}
        except Exception:
            return {"error": str(e), "status": e.response.status_code}
    except Exception as e:
        return {"error": f"Failed to check booking: {str(e)}", "status": 500}

def get_my_sessions(
    faculty_id: Optional[str] = None,
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """Retrieve teaching sessions and current timetable assignments.

    Faculty users always get their own sessions (faculty_id is ignored).
    Admin / coordinator users MUST pass faculty_id (e.g. "F01") to see one faculty member's sessions.

    Args:
        faculty_id: Faculty ID such as F01 (only needed for admin / coordinator users).
    """
    url = f"{BACKEND_URL}/api/sessions"
    headers = _get_headers(tool_context)
    params = {"faculty_id": faculty_id} if faculty_id else {}
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        try:
            return {"error": e.response.json().get("error", e.response.text), "status": e.response.status_code}
        except Exception:
            return {"error": str(e), "status": e.response.status_code}
    except Exception as e:
        return {"error": f"Failed to retrieve sessions: {str(e)}", "status": 500}

def propose_timetable_change(
    changes: List[Dict[str, Any]],
    title: str,
    reason: str = "",
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """Propose a timetable disruption or faculty unavailability change.

    Runs the CP-SAT repair solver and returns a feasible repair proposal with schedule diff.
    Does NOT mutate the live timetable.

    Args:
        changes: List of change objects, e.g.
            [{"type": "faculty_unavailable", "faculty_id": "F01", "date_from": "2026-11-03", "date_to": "2026-11-03",
              "days": ["TUE"], "periods": [4, 5, 6, 7], "reason": "Medical"}]
            date_from / date_to (ISO dates, inclusive) are REQUIRED for faculty_unavailable so the leave applies to
            those dates only; "days" are the weekday codes of the dates in that range.
        title: Short title describing the disruption
        reason: Optional detailed reason
    """
    url = f"{BACKEND_URL}/api/disruptions/propose"
    headers = _get_headers(tool_context)
    payload = {
        "title": title,
        "reason": reason,
        "changes": changes,
    }
    try:
        with httpx.Client(timeout=100.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        try:
            return {"error": e.response.json().get("error", e.response.text), "status": e.response.status_code}
        except Exception:
            return {"error": str(e), "status": e.response.status_code}
    except Exception as e:
        return {"error": f"Failed to propose timetable change: {str(e)}", "status": 500}

def get_proposal(
    disruption_id: str,
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """Retrieve details, schedule diff, and validator results of a previously created disruption proposal.

    Args:
        disruption_id: The ID of the disruption (e.g. DISRUPT-9313).
    """
    url = f"{BACKEND_URL}/api/disruptions/{disruption_id}"
    headers = _get_headers(tool_context)
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        try:
            return {"error": e.response.json().get("error", e.response.text), "status": e.response.status_code}
        except Exception:
            return {"error": str(e), "status": e.response.status_code}
    except Exception as e:
        return {"error": f"Failed to get proposal: {str(e)}", "status": 500}

def explain_booking(
    booking_id: str,
    tool_context: Optional[ToolContext] = None,
) -> Dict[str, Any]:
    """Get recorded facts and reasons for a booking request decision.

    Args:
        booking_id: The ID of the booking request (e.g. BR-1-8102).
    """
    url = f"{BACKEND_URL}/api/decisions/booking/{booking_id}"
    headers = _get_headers(tool_context)
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        try:
            return {"error": e.response.json().get("error", e.response.text), "status": e.response.status_code}
        except Exception:
            return {"error": str(e), "status": e.response.status_code}
    except Exception as e:
        return {"error": f"Failed to explain booking: {str(e)}", "status": 500}