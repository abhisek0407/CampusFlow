import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { createProposal } from '../../../../lib/disruptionService';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ['faculty', 'admin']);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const body = await request.json().catch(() => ({}));
    const { status, body: payload } = await createProposal({
      user,
      title: body.title,
      changes: body.changes,
      reason: body.reason,
    });
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('Disruptions propose error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}