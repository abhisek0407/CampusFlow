import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '../../../../lib/auth';

const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || 'cit_campusflow_agent_secret_2026';

/**
 * POST /api/voice/ticket
 * Returns a 60-second, HMAC-signed ticket the browser presents when it opens the
 * voice WebSocket on the agent service (ws://.../ws/stt?ticket=...).
 */
export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const payload = Buffer.from(
      JSON.stringify({ uid: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 })
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', AGENT_SHARED_SECRET).update(payload).digest('hex');

    return NextResponse.json({ success: true, ticket: `${payload}.${sig}` });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
