"""
Sarvam real-time Speech-to-Text relay for CampusFlow.

Browser --(WS, raw PCM16 16 kHz mono)--> /ws/stt (this file, agent-service)
                                              | base64 -> {"event":"audio_input"}
                                              v
                                       Sarvam wss://api.sarvam.ai/speech-to-text-realtime/ws
                                              | transcript.partial / transcript.final
Browser <--(WS, small JSON events)------------+

The Sarvam API key never leaves the server. The browser authenticates with a
short-lived, HMAC-signed ticket minted by the Next.js backend (POST /api/voice/ticket).
"""

import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional
from urllib.parse import urlencode

import websockets
from fastapi import APIRouter, WebSocket

router = APIRouter()

ALLOWED_LANGS = {
    "auto", "en-IN", "hi-IN", "bn-IN", "kn-IN", "ml-IN", "mr-IN", "or-IN", "pa-IN",
    "ta-IN", "te-IN", "gu-IN", "as-IN", "ur-IN", "ne-IN", "kok-IN", "ks-IN", "sd-IN",
    "sa-IN", "sat-IN", "mni-IN", "brx-IN", "mai-IN", "doi-IN",
}

ALLOWED_MODES = {"transcribe", "translate", "verbatim", "translit", "codemix"}


def _cfg():
    # read env at call time so edits to .env + restart are always honoured
    return {
        "key": os.getenv("SARVAM_API_KEY", ""),
        "url": os.getenv("SARVAM_STT_WS_URL", "wss://api.sarvam.ai/speech-to-text-realtime/ws"),
        "model": os.getenv("SARVAM_STT_MODEL", "saaras:v3-realtime"),
        "lang": os.getenv("SARVAM_STT_LANGUAGE_CODE", "auto"),
        "rate": os.getenv("SARVAM_STT_SAMPLE_RATE", "16000"),
        "mode": os.getenv("SARVAM_STT_MODE", "transcribe"),
        "max_s": int(os.getenv("SARVAM_STT_MAX_SECONDS", "120")),
        "secret": os.getenv("AGENT_SHARED_SECRET", "cit_campusflow_agent_secret_2026"),
    }


def verify_ticket(ticket: str, secret: str) -> Optional[dict]:
    """ticket = base64url(json payload) + '.' + hex(hmac_sha256(payload))"""
    try:
        payload_b64, sig = ticket.split(".", 1)
        expected = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


async def _send(client: WebSocket, obj: dict):
    try:
        await client.send_text(json.dumps(obj))
    except Exception:
        pass


@router.websocket("/ws/stt")
async def stt_ws(client: WebSocket, ticket: str = "", lang: str = ""):
    cfg = _cfg()
    await client.accept()

    if not verify_ticket(ticket, cfg["secret"]):
        await _send(client, {"type": "error", "message": "Voice session expired or unauthorised. Please try again.", "fatal": True})
        await client.close(code=4401)
        return

    if not cfg["key"]:
        await _send(client, {"type": "error", "message": "Voice input is not configured (SARVAM_API_KEY missing on the agent service).", "fatal": True})
        await client.close(code=4500)
        return

    language = lang if lang in ALLOWED_LANGS else (cfg["lang"] if cfg["lang"] in ALLOWED_LANGS else "auto")
    mode = cfg["mode"] if cfg["mode"] in ALLOWED_MODES else "transcribe"
    params = {
        "language_code": language,
        "model": cfg["model"],
        "mode": mode,
        "sample_rate": cfg["rate"],
        "encoding": "linear16",
        "endpointing": "vad",
    }
    url = f"{cfg['url']}?{urlencode(params)}"

    try:
        up = await websockets.connect(
            url,
            additional_headers={"API-SUBSCRIPTION-KEY": cfg["key"]},
            open_timeout=10,
            max_size=2**20,
        )
    except Exception as e:
        # network down, bad key (1003), etc.
        await _send(client, {"type": "error", "message": f"Could not reach the speech service: {e}", "fatal": True})
        await client.close(code=1011)
        return

    started = time.monotonic()
    await _send(client, {"type": "ready", "language": language, "mode": mode, "sample_rate": int(cfg["rate"])})

    async def client_to_sarvam():
        while True:
            if time.monotonic() - started > cfg["max_s"]:
                await _send(client, {"type": "error", "message": "Voice session time limit reached.", "fatal": False})
                await up.send(json.dumps({"event": "end"}))
                return "end"
            msg = await client.receive()
            if msg["type"] == "websocket.disconnect":
                return "disconnect"
            if msg.get("bytes"):
                audio = base64.b64encode(msg["bytes"]).decode()
                await up.send(json.dumps({"event": "audio_input", "audio": audio}))
            elif msg.get("text"):
                try:
                    data = json.loads(msg["text"])
                except Exception:
                    continue
                if data.get("event") == "end":
                    await up.send(json.dumps({"event": "end"}))  # Sarvam finalises pending speech, then closes
                    return "end"

    async def sarvam_to_client():
        async for raw in up:
            try:
                m = json.loads(raw)
            except Exception:
                continue
            ev = m.get("event")
            if ev == "transcript.partial":
                await _send(client, {"type": "partial", "text": m.get("text", ""), "language": m.get("language")})
            elif ev == "transcript.final":
                await _send(client, {"type": "final", "text": m.get("text", ""), "language": m.get("language")})
            elif ev == "vad.speech_start":
                await _send(client, {"type": "speech_start"})
            elif ev == "vad.speech_end":
                await _send(client, {"type": "speech_end"})
            elif ev == "error":
                await _send(client, {"type": "error", "message": m.get("message", "Speech service error"), "fatal": bool(m.get("is_fatal"))})
            elif ev == "session.end":
                return

    t_up = asyncio.create_task(client_to_sarvam())
    t_down = asyncio.create_task(sarvam_to_client())

    try:
        done, _ = await asyncio.wait({t_up, t_down}, return_when=asyncio.FIRST_COMPLETED)
        if t_up in done and not t_up.cancelled() and t_up.exception() is None and t_up.result() == "end":
            # user stopped: give Sarvam a few seconds to flush the last utterance
            try:
                await asyncio.wait_for(t_down, timeout=8)
            except Exception:
                pass
    except Exception as e:
        await _send(client, {"type": "error", "message": f"Voice stream interrupted: {e}", "fatal": True})
    finally:
        for t in (t_up, t_down):
            if not t.done():
                t.cancel()
        try:
            await up.close()
        except Exception:
            pass
        await _send(client, {"type": "end"})
        try:
            await client.close()
        except Exception:
            pass
