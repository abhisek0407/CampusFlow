import { NextResponse } from 'next/server';
import { parseNaturalLanguageBooking } from '../../../../lib/aiParser.js';
import connectToDatabase from '../../../../lib/mongodb.js';
import { Room, Schedule } from '../../../../models/index.js';
import { requireAuth } from '../../../../lib/auth.js';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user: authUser } = authResult;

    const body = await request.json();
    const prompt = body.prompt || body.raw_text;
    const user = { role: authUser.role, requester: authUser.name };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: 'Text prompt (prompt or raw_text) is required' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Extract structured fields
    const structured = parseNaturalLanguageBooking(prompt, user);

    // 2. Deterministic conflict checking against available rooms and timetable
    const rooms = await Room.find().lean();
    const schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();

    const candidateRooms = rooms.filter((r) => {
      if (!r.allowed_uses || !r.allowed_uses.includes('event')) return false;
      if (structured.room_types && structured.room_types.length > 0 && !structured.room_types.includes(r.type)) return false;
      if (structured.attendance && r.capacity < structured.attendance) return false;
      const feats = new Set(r.features || []);
      if (r.accessible) feats.add('accessible');
      if (structured.needs) {
        for (const n of structured.needs) {
          if (!feats.has(n)) return false;
        }
      }
      return true;
    });

    // Check potential conflicts in requested window
    const win = structured.windows && structured.windows[0] ? structured.windows[0] : { day: 'THU', from_period: 10, to_period: 12 };
    const conflicts = [];
    if (schedule && schedule.sessions) {
      const sessionList = Array.isArray(schedule.sessions) ? schedule.sessions : Object.values(schedule.sessions);
      for (const s of sessionList) {
        const sPeriod = s.start_period || s.period;
        if (s.day === win.day && sPeriod >= win.from_period && sPeriod <= win.to_period) {
          conflicts.push(`Scheduled session ${s.session_id || s.id} in ${s.room_id} at P${sPeriod}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      booking: structured,
      extracted_booking: structured,
      parsed: structured,
      conflict_check: conflicts.length > 0 ? { has_conflict: true, conflicts } : { has_conflict: false },
      suitable_rooms: candidateRooms.map((r) => ({
        id: r._id,
        name: r.name,
        capacity: r.capacity,
        type: r.type,
      })),
      potential_conflicts: conflicts,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
