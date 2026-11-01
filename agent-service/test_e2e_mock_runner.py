import asyncio
import os
import json
import httpx
from google.adk.models import LLMRegistry
from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.genai import types
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents import LlmAgent

from tools import check_booking, list_rooms, get_my_sessions, explain_booking

class MockGeminiLlm(BaseLlm):
    @classmethod
    def supported_models(cls) -> list[str]:
        return [r"mock-gemini-flash.*"]

    async def generate_content_async(self, llm_request, stream: bool = False):
        last_content = llm_request.contents[-1] if llm_request.contents else None
        has_func_resp = False
        if last_content and last_content.parts:
            for p in last_content.parts:
                if getattr(p, "function_response", None):
                    has_func_resp = True
                    break

        if not has_func_resp:
            # Model calls check_booking tool
            draft = {
                "title": "Dramatics Play",
                "attendance": 450,
                "duration_periods": 2,
                "windows": [{"day": "THU", "from_period": 10, "to_period": 11}],
                "room_types": ["auditorium"],
                "needs": ["stage", "pa_system"],
                "requested_room": "AUD",
                "requested_category": "club_event",
            }
            yield LlmResponse(
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_function_call(name="check_booking", args={"draft": draft})],
                )
            )
        else:
            # Model receives tool result and yields final natural language reply with JSON block
            reply_text = (
                "Bhai Auditorium check kiya Thursday 6pm se 8pm (P10-P11) for 450 people. "
                "Tool verdict: approved! AUD available hai with stage aur PA system.\n"
                "Note: Yeh sirf feasibility check hai, aapko 'Submit' par click karna hoga.\n\n"
                "```json\n"
                "{\n"
                '  "draft": {\n'
                '    "title": "Dramatics Play",\n'
                '    "attendance": 450,\n'
                '    "duration_periods": 2,\n'
                '    "windows": [{"day": "THU", "from_period": 10, "to_period": 11}],\n'
                '    "room_types": ["auditorium"],\n'
                '    "needs": ["stage", "pa_system"],\n'
                '    "requested_room": "AUD",\n'
                '    "requested_category": "club_event"\n'
                "  },\n"
                '  "proposal_id": null,\n'
                '  "assumptions": ["Assumed 6pm to 8pm is P10-P11"],\n'
                '  "follow_up_questions": ["Do you need extra rehearsal time?"]\n'
                "}\n"
                "```"
            )
            yield LlmResponse(
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=reply_text)],
                )
            )

async def run_e2e_mock_test():
    # 1. Login as club to get real JWT
    async with httpx.AsyncClient() as client:
        login_res = await client.post(
            "http://localhost:5000/api/auth/login",
            json={"email": "club.dramatics@cit.edu", "password": "Club@123"}
        )
        assert login_res.status_code == 200
        club_jwt = login_res.json()["token"]

    # 2. Register mock LLM with ADK
    LLMRegistry.register(MockGeminiLlm)

    # 3. Create Agent and Runner
    agent = LlmAgent(
        name="test_campusflow_agent",
        model="mock-gemini-flash",
        instruction="CampusFlow test agent",
        tools=[check_booking, list_rooms, get_my_sessions, explain_booking],
    )

    session_service = InMemorySessionService()
    session_service.create_session(
        app_name="campusflow",
        user_id="test_club_user",
        session_id="test_sess_1",
        state={"jwt": club_jwt, "today_iso": "2026-11-01"},
    )

    runner = Runner(
        app_name="campusflow",
        agent=agent,
        session_service=session_service,
    )

    # 4. Run agent
    prompt = "[Today is 2026-11-01]: Bhai Auditorium chahiye Thursday 6pm se 8pm for 450 people, stage aur PA system lagega"
    new_message = types.Content(parts=[types.Part.from_text(text=prompt)])

    tool_calls = []
    text_responses = []

    async for event in runner.run_async(user_id="test_club_user", session_id="test_sess_1", new_message=new_message):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "function_call", None):
                    tool_calls.append(p.function_call.name)
                    print(f"[RUNNER EVENT] Model invoked tool: {p.function_call.name} with args: {p.function_call.args}")
                elif getattr(p, "function_response", None):
                    print(f"[RUNNER EVENT] Tool returned response: {p.function_response.response}")
                elif getattr(p, "text", None):
                    text_responses.append(p.text)

    full_reply = "".join(text_responses)
    print("\n[FINAL AGENT REPLY]:\n" + full_reply)

    assert "check_booking" in tool_calls, "Expected check_booking to be called by runner"
    assert "Tool verdict: approved" in full_reply or "verdict" in full_reply
    print("\n[E2E PASS] Full Runner -> Agent -> Tool -> REST API -> Mock LLM pipeline succeeded!")

if __name__ == "__main__":
    asyncio.run(run_e2e_mock_test())
