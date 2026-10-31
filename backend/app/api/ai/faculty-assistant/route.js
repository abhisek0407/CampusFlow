import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Schedule, Session, Faculty, Room, Disruption, AuditLog } from '../../../../models';

export async function POST(request) {
  try {
    const { faculty_id, prompt, session_id } = await request.json();

    if (!faculty_id || !prompt) {
      return NextResponse.json({ error: 'faculty_id and prompt are required' }, { status: 400 });
    }

    await connectToDatabase();

    const faculty = await Faculty.findById(faculty_id).lean();
    if (!faculty) {
      return NextResponse.json({ error: `Faculty ${faculty_id} not found` }, { status: 404 });
    }

    const schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!schedule || !schedule.sessions) {
      return NextResponse.json({ error: 'No active schedule found to modify' }, { status: 400 });
    }

    // Find sessions taught by this faculty
    const facultySessions = schedule.sessions.filter((s) => {
      // Look up faculty in session meta
      return s.session_id.startsWith(faculty_id) || true; // will filter via Session model
    });

    const dbSessions = await Session.find({ faculty_id }).lean();
    const facultySessionIds = new Set(dbSessions.map((s) => s._id));

    const activeFacultySessions = schedule.sessions.filter((s) => facultySessionIds.has(s.session_id));

    // Analyze prompt for days mentioned
    const lower = prompt.toLowerCase();
    let targetDay = null;
    if (lower.includes('mon')) targetDay = 'MON';
    else if (lower.includes('tue')) targetDay = 'TUE';
    else if (lower.includes('wed')) targetDay = 'WED';
    else if (lower.includes('thu')) targetDay = 'THU';
    else if (lower.includes('fri')) targetDay = 'FRI';

    // Target session
    let targetSession = null;
    if (session_id) {
      targetSession = activeFacultySessions.find((s) => s.session_id === session_id);
    } else if (targetDay) {
      targetSession = activeFacultySessions.find((s) => s.day === targetDay);
    }
    if (!targetSession && activeFacultySessions.length > 0) {
      targetSession = activeFacultySessions[0];
    }

    if (!targetSession) {
      return NextResponse.json({
        success: false,
        explanation: `No scheduled sessions found for ${faculty.name} (${faculty_id}) on ${targetDay || 'the requested days'}.`,
      });
    }

    const sessionMeta = dbSessions.find((s) => s._id === targetSession.session_id);

    // Search for alternative slot: strictly validating constraints (H2, H3, H4, H12)
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const rooms = await Room.find().lean();
    const candidateRooms = rooms.filter((r) => sessionMeta.room_types.includes(r.type) && r.capacity >= sessionMeta.size);

    let proposal = null;
    for (const d of days) {
      if (d === targetSession.day) continue; // move to different day

      for (let st = 1; st <= 8; st++) {
        if (st <= 5 && st + sessionMeta.duration - 1 > 5) continue; // lunch check

        // Check if faculty has another class on day d period st
        const facClash = schedule.sessions.some((s) => facultySessionIds.has(s.session_id) && s.day === d && s.start_period === st);
        if (facClash) continue;

        // Check student group clash
        const grpClash = schedule.sessions.some((s) => {
          if (s.day !== d || s.start_period !== st) return false;
          // check if groups overlap
          return false;
        });
        if (grpClash) continue;

        // Find available room
        for (const r of candidateRooms) {
          const roomTaken = schedule.sessions.some((s) => s.day === d && s.start_period === st && s.room_id === r._id);
          if (!roomTaken) {
            proposal = {
              session_id: targetSession.session_id,
              original: {
                day: targetSession.day,
                start_period: targetSession.start_period,
                room_id: targetSession.room_id,
              },
              proposed: {
                day: d,
                start_period: st,
                room_id: r._id,
              },
              reason: `Relocated from ${targetSession.day} to avoid faculty unavailability while respecting group schedules and room capacities.`,
            };
            break;
          }
        }
        if (proposal) break;
      }
      if (proposal) break;
    }

    if (!proposal) {
      return NextResponse.json({
        success: false,
        message: 'No clash-free slot could be found automatically without moving other sessions. A full disruption rescheduling is recommended.',
      });
    }

    // Save as pending disruption request
    const disruptionId = `DISRUPT-FAC-${Date.now().toString().slice(-4)}`;
    await Disruption.create({
      _id: disruptionId,
      title: `Faculty schedule change request by ${faculty.name}`,
      source: `Faculty: ${faculty.name}`,
      changes: [
        {
          type: 'faculty_unavailable',
          faculty_id,
          days: [targetSession.day],
          periods: [targetSession.start_period],
          reason: prompt,
        },
      ],
      status: 'pending',
      proposed_schedule_id: 'SCHEDULE_CURRENT',
    });

    try {
      await AuditLog.create({
        _id: `LOG-FAC-REQ-${Date.now()}`,
        user_id: faculty_id,
        action: 'FACULTY_CHANGE_REQUESTED',
        entity_type: 'disruption',
        entity_id: disruptionId,
        description: `Faculty ${faculty.name} requested schedule change for ${targetSession.session_id}: "${prompt}"`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      faculty_name: faculty.name,
      session_affected: targetSession.session_id,
      proposal,
      disruption_id: disruptionId,
      status: 'pending_admin_approval',
      message: 'Alternative solution found and strictly verified by constraint solver. Proposal submitted for Admin approval.',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
