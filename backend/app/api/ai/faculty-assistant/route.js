import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth.js';
import { parseFacultyRequest } from '../../../../lib/aiParser.js';
import { createProposal } from '../../../../lib/disruptionService.js';

/**
 * Rule-based faculty assistant (works WITHOUT the Gemini agent service).
 * Used as an automatic fallback by the frontend when /api/agent/chat is unavailable.
 * Body: { message } OR { title, changes } ; admin may include faculty_id
 */
export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ['faculty', 'admin']);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const body = await request.json().catch(() => ({}));

    let title = body.title;
    let changes = body.changes;
    let reason = body.reason || '';

    if (!Array.isArray(changes) || changes.length === 0) {
      const message = body.message || body.prompt || body.raw_text;
      if (!message || typeof message !== 'string') {
        return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
      }
      const facultyId = user.role === 'faculty' ? user.linked_faculty_id : body.faculty_id || null;
      const parsed = parseFacultyRequest(message, facultyId);
      if (!parsed.ok) {
        return NextResponse.json({ success: true, reply: parsed.error, proposal_id: null, offline: true });
      }
      title = parsed.title;
      changes = [parsed.change];
      reason = message;
    }

    const { status, body: result } = await createProposal({ user, title, changes, reason });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    const p = result.proposal;
    const moved = p.diff ? p.diff.length : 0;
    const reply = p.feasible
      ? `Proposal ${result.disruption_id} created: the solver found a conflict-free repair. ${moved} session(s) moved, ${p.unchanged_count ?? 'N/A'} unchanged, 0 hard violations. This is only a PROPOSAL - it is awaiting administrator approval.`
      : `Proposal ${result.disruption_id} created, but the solver could not find a fully feasible repair (${p.status}). ${Object.keys(p.dropped || {}).length} session(s) could not be placed. An administrator will review it.`;

    return NextResponse.json({
      success: true,
      offline: true,
      reply,
      proposal_id: result.disruption_id,
      proposal: p,
      tool_trace: [
        {
          type: 'response',
          tool: 'propose_timetable_change',
          result: { disruption_id: result.disruption_id, proposal: p },
        },
      ],
    });
  } catch (error) {
    console.error('Faculty assistant error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}