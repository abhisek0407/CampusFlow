import os
import re
import json
import inspect
from pathlib import Path
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)

import google.adk.telemetry
_orig_dumps = json.dumps
def _safe_dumps(obj, *args, **kwargs):
    if "default" not in kwargs:
        kwargs["default"] = str
    return _orig_dumps(obj, *args, **kwargs)
google.adk.telemetry.json.dumps = _safe_dumps

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel
from google.genai import types
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from agent import create_agent

app = FastAPI(title="CampusFlow Agent Service")
from stt_sarvam import router as stt_router
app.include_router(stt_router)

AGENT_SHARED_SECRET = os.getenv("AGENT_SHARED_SECRET", "cit_campusflow_agent_secret_2026")
APP_NAME = "campusflow"

session_service = InMemorySessionService()
agent = create_agent()
runner = Runner(
    app_name=APP_NAME,
    agent=agent,
    session_service=session_service,
)

# Second, lighter model used automatically when the primary Gemini model is overloaded (503/429).
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite")
fallback_runner = None
if FALLBACK_MODEL and FALLBACK_MODEL != os.getenv("GEMINI_MODEL", "gemini-2.5-flash"):
    try:
        fallback_runner = Runner(
            app_name=APP_NAME,
            agent=create_agent(FALLBACK_MODEL),
            session_service=session_service,
        )
    except Exception as _e:  # never block startup
        print("Fallback runner not created:", _e)

TRANSIENT_MARKERS = ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded", "high demand", "timed out")


def _is_transient(err: Exception) -> bool:
    text = str(err)
    return any(k.lower() in text.lower() for k in TRANSIENT_MARKERS)

def build_time_context(today_iso: str, now_time: Optional[str]) -> str:
    """Calendar cheat-sheet so the model never has to calculate dates itself."""
    import datetime
    try:
        today = datetime.date.fromisoformat(today_iso)
    except Exception:
        today = datetime.date.today()
    def fmt(d):
        return f"{d.isoformat()} {d.strftime('%a').upper()}"
    rel = {
        "day before yesterday (parso, past)": -2,
        "yesterday (kal, past)": -1,
        "today (aaj)": 0,
        "tomorrow (kal, future)": 1,
        "day after tomorrow (parso, future)": 2,
    }
    lines = [f"  {name}: {fmt(today + datetime.timedelta(days=off))}" for name, off in rel.items()]
    monday = today - datetime.timedelta(days=today.weekday())
    week = ", ".join(fmt(monday + datetime.timedelta(days=i)) for i in range(7))
    nxt = ", ".join(fmt(monday + datetime.timedelta(days=7 + i)) for i in range(7))
    t = f" {now_time} IST" if now_time else ""
    return (
        f"[Now: {today.strftime('%A')} {today.isoformat()}{t}]\n"
        "[Calendar (use these exact dates, never calculate your own):\n" + "\n".join(lines) + "\n"
        f"  this week: {week}\n  next week: {nxt}]"
    )

class ChatRequest(BaseModel):
    user: Optional[Dict[str, Any]] = None
    message: str
    session_id: Optional[str] = "default_session"
    jwt: Optional[str] = ""
    today_iso: Optional[str] = "2026-11-01"
    weekday: Optional[str] = "Sunday"
    now_time: Optional[str] = None  # HH:MM, IST

class ChatResponse(BaseModel):
    reply: str
    draft: Optional[Dict[str, Any]] = None
    proposal_id: Optional[str] = None
    assumptions: List[str] = []
    follow_up_questions: List[str] = []
    tool_trace: List[Dict[str, Any]] = []

def extract_structured_output(text: str):
    draft = None
    proposal_id = None
    assumptions = []
    follow_up_questions = []
    clean_reply = text

    # Extract JSON block enclosed by ```json ... ``` or ``` ... ```
    pattern = r"```(?:json)?\s*(\{[\s\S]*?\})\s*```"
    matches = list(re.finditer(pattern, text, re.IGNORECASE))
    if matches:
        last_match = matches[-1]
        try:
            data = json.loads(last_match.group(1))
            if isinstance(data, dict):
                draft = data.get("draft")
                proposal_id = data.get("proposal_id")
                assumptions = data.get("assumptions") or []
                follow_up_questions = data.get("follow_up_questions") or []
                clean_reply = (text[:last_match.start()] + text[last_match.end():]).strip()
        except Exception:
            # Drop malformed JSON block and keep text only
            pass

    return clean_reply, draft, proposal_id, assumptions, follow_up_questions

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    x_agent_secret: Optional[str] = Header(None, alias="X-Agent-Secret")
):
    if not x_agent_secret or x_agent_secret != AGENT_SHARED_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Agent-Secret header"
        )

    session_id = req.session_id or "default_session"
    user_id = "agent_user"  # Single app context; authorization is verified by forwarded JWT inside tools

    # Ensure session exists and update JWT / today_iso in session state
    # google-adk <1.0 has sync session methods, newer versions are async - support both
    session = session_service.get_session(app_name=APP_NAME, user_id=user_id, session_id=session_id)
    if inspect.isawaitable(session):
        session = await session
    if not session:
        created = session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={"jwt": req.jwt or "", "today_iso": req.today_iso or "2026-11-01"},
        )
        if inspect.isawaitable(created):
            await created
    else:
        storage_session = session_service.sessions[APP_NAME][user_id][session_id]
        storage_session.state["jwt"] = req.jwt or ""
        storage_session.state["today_iso"] = req.today_iso or "2026-11-01"

    # Contextual user message with weekday
    user_weekday = req.weekday
    if not user_weekday:
        try:
            import datetime
            dt = datetime.date.fromisoformat(req.today_iso or "2026-11-01")
            user_weekday = dt.strftime('%A')
        except Exception:
            user_weekday = "Sunday"

    u = req.user or {}
    user_line = (
        f"[User: role={u.get('role', 'unknown')}, name={u.get('name', 'unknown')}, "
        f"faculty_id={u.get('linked_faculty_id') or 'none'}, department={u.get('department') or 'none'}]"
    )
    time_ctx = build_time_context(req.today_iso or "2026-11-01", req.now_time)
    user_prompt = f"{user_line}\n{time_ctx}\n[Reference: Today is {req.today_iso} ({user_weekday})]: {req.message}"
    new_message = types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])

    import asyncio

    text_parts = []
    tool_trace = []
    last_error = None

    for attempt in range(3):
        text_parts = []
        tool_trace = []
        active_runner = fallback_runner if (attempt >= 1 and fallback_runner) else runner
        try:
            async for event in active_runner.run_async(user_id=user_id, session_id=session_id, new_message=new_message):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if getattr(part, "function_call", None):
                            tool_trace.append({
                                "type": "call",
                                "tool": part.function_call.name,
                                "args": part.function_call.args,
                            })
                        elif getattr(part, "function_response", None):
                            tool_trace.append({
                                "type": "response",
                                "tool": part.function_response.name,
                                "result": part.function_response.response,
                            })
                        elif getattr(part, "text", None):
                            if event.author != "user":
                                text_parts.append(part.text)
            last_error = None
            break
        except Exception as e:
            last_error = e
            print(f"AGENT CHAT ERROR (attempt {attempt + 1}): {e}")
            # If a tool already ran (e.g. a proposal draft was created) NEVER retry - it would create a duplicate.
            if any(t.get("type") == "response" for t in tool_trace):
                break
            if _is_transient(e) and attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            break

    if last_error is not None:
        has_tool_result = any(t.get("type") == "response" for t in tool_trace)
        if has_tool_result:
            # Tools finished but the AI summary failed: still return the real tool results.
            pid = None
            for t in tool_trace:
                r = t.get("result") if t.get("type") == "response" else None
                if isinstance(r, dict) and (r.get("disruption_id") or r.get("id")):
                    pid = r.get("disruption_id") or r.get("id")
            return ChatResponse(
                reply="The AI summary was temporarily unavailable, but your request was processed. Please review the result below.",
                proposal_id=pid,
                tool_trace=tool_trace,
            )
        import traceback
        traceback.print_exc()
        code = status.HTTP_503_SERVICE_UNAVAILABLE if _is_transient(last_error) else status.HTTP_500_INTERNAL_SERVER_ERROR
        raise HTTPException(status_code=code, detail=f"Agent runtime error: {str(last_error)}")

    full_text = "".join(text_parts).strip()
    reply, draft, proposal_id, assumptions, follow_up_questions = extract_structured_output(full_text)

    return ChatResponse(
        reply=reply or full_text,
        draft=draft,
        proposal_id=proposal_id,
        assumptions=assumptions,
        follow_up_questions=follow_up_questions,
        tool_trace=tool_trace,
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)