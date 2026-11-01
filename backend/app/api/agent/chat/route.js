import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';

const AGENT_URL = (process.env.AGENT_URL || 'http://localhost:8001').replace(/\/$/, '');
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || 'cit_campusflow_agent_secret_2026';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitMap = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(userId) || []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a minute before sending another request.' },
        { status: 429 }
      );
    }

    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    const incomingJwt = authHeader.replace(/^Bearer\s+/i, '').trim();

    const body = await request.json().catch(() => ({}));
    const { message, session_id } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'message string is required' }, { status: 400 });
    }

    const kolkataDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const kolkataNowStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const kolkataWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(new Date());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // solver can take ~45s

    let agentResponse;
    try {
      agentResponse = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Agent-Secret': AGENT_SHARED_SECRET },
        body: JSON.stringify({
          message,
          // session is scoped per user so two portals never share chat memory / JWT state
          session_id: `${user.id}__${session_id || 'default'}`,
          jwt: incomingJwt,
          today_iso: kolkataDateStr,
          weekday: kolkataWeekday,
          now_time: kolkataNowStr, // HH:MM in IST,
          // NEW: tell the agent WHO is asking so it can pick the right faculty id / role rules
          user: {
            role: user.role,
            name: user.name,
            department: user.department || null,
            linked_faculty_id: user.linked_faculty_id || null,
          },
        }),
        signal: controller.signal,
      });
    } catch (networkErr) {
      console.error('Agent service unreachable:', networkErr.message);
      return NextResponse.json({ success: false, error: 'ai_unavailable' }, { status: 503 });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!agentResponse.ok) {
      const detail = await agentResponse.text().catch(() => '');
      console.error(`Agent service HTTP ${agentResponse.status}:`, detail.slice(0, 500));
      return NextResponse.json({ success: false, error: 'ai_unavailable' }, { status: 503 });
    }

    const agentData = await agentResponse.json();
    return NextResponse.json({ success: true, ...agentData });
  } catch (error) {
    console.error('Agent chat route error:', error);
    return NextResponse.json({ success: false, error: 'ai_unavailable' }, { status: 503 });
  }
}