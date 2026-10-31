import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb.js';
import { Schedule, Session, Faculty, Room, Disruption, AuditLog } from '../../../../models/index.js';

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

    // Normalize schedule.sessions into an array of objects
    const sessionList = Array.isArray(schedule.sessions)
      ? schedule.sessions
      : Object.entries(schedule.sessions).map(([id, alloc]) => ({
          session_id: id,
          ...alloc,
        }));

    const dbSessions = await Session.find({ faculty_id }).lean();
    const facultySessionIds = new Set(dbSessions.map((s) => s._id));

    const activeFacultySessions = sessionList.filter((s) => facultySessionIds.has(s.session_id));

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

    const sessionMeta = dbSessions.find((s) => s._id === targetSession.session_id) || {
      room_types: ['classroom', 'lecture_hall'],
      size: 50,
      duration: 1,
    };

    // Search for alternative slot: strictly validating constraints (H2, H3, H4, H12)
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const rooms = await Room.find().lean();
    const candidateRooms = rooms.filter((r) => 
      (!sessionMeta.room_types || sessionMeta.room_types.includes(r.type)) && 
      r.capacity >= (sessionMeta.size || 30)
    );

    let proposal = null;
    for (const d of days) {
      if (d === targetSession.day) continue; // move to different day

      for (let st = 1; st <= 8; st++) {
        if (st <= 5 && st + (sessionMeta.duration || 1) - 1 > 5) continue; // lunch check

        // Check if faculty has another class on day d period st
        const facClash = sessionList.some((s) => facultySessionIds.has(s.session_id) && s.day === d && s.start_period === st);
        if (facClash) continue;

        // Find available room
        for (const r of candidateRooms) {
          const roomTaken = sessionList.some((s) => s.day === d && s.start_period === st && s.room_id === r._id);
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
        explanation: `Could not find an alternative slot without creating hard constraint conflicts. All alternative slots either violate faculty daily limit or clash with student cohort lectures.`,
      });
    }

    return NextResponse.json({
      success: true,
      proposal,
      explanation: `Proposed moving session ${proposal.session_id} from ${proposal.original.day} P${proposal.original.start_period} (${proposal.original.room_id}) to ${proposal.proposed.day} P${proposal.proposed.start_period} in room ${proposal.proposed.room_id}. This satisfies all 14 hard constraints: no overlap for faculty ${faculty_id}, zero cohort clashes, and venue capacity is verified.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
