import { NextResponse } from 'next/server';
import { parseNaturalLanguageBooking } from '../../../../lib/aiParser';
import connectToDatabase from '../../../../lib/mongodb';
import { Room, Schedule } from '../../../../models';

export async function POST(request) {
  try {
    const { prompt, user = {} } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Extract structured fields
    const structured = parseNaturalLanguageBooking(prompt, user);

    // 2. Deterministic conflict checking against available rooms and timetable
    const rooms = await Room.find().lean();
    const schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();

    const candidateRooms = rooms.filter((r) => {
      if (!r.allowed_uses || !r.allowed_uses.includes('event')) return false;
      if (!structured.room_types.includes(r.type)) return false;
      if (r.capacity < structured.attendance) return false;
      const feats = new Set(r.features || []);
      if (r.accessible) feats.add('accessible');
      for (const n of structured.needs) {
        if (!feats.has(n)) return false;
      }
      return true;
    });

    // Check potential conflicts in requested window
    const win = structured.windows[0];
    const conflicts = [];
    if (schedule && schedule.sessions) {
      for (const s of schedule.sessions) {
        if (s.day === win.day && s.start_period >= win.from_period && s.start_period <= win.to_period) {
          conflicts.push(`Scheduled session ${s.session_id} in ${s.room_id} at P${s.start_period}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      extracted_booking: structured,
      suitable_rooms: candidateRooms.map((r) => ({
        id: r._id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        features: r.features,
      })),
      clashes_detected: conflicts.length > 0,
      potential_conflicts: conflicts.slice(0, 5),
      validation_notes: candidateRooms.length > 0
        ? `Found ${candidateRooms.length} venue(s) matching capacity and features.`
        : 'Warning: No standard venue satisfies capacity and feature requirements without adjustments.',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
