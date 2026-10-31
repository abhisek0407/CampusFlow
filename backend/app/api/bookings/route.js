import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { BookingRequest, Room, Schedule, AuditLog } from '../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    await connectToDatabase();
    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;

    const bookings = await BookingRequest.find(query).sort({ submitted_at: 1 }).lean();

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      title,
      requester,
      role = 'club',
      requested_category = 'club_event',
      attendance = 50,
      duration_periods = 2,
      windows,
      room_types = ['seminar_hall', 'classroom'],
      needs = [],
      requested_room = null,
      mandatory_for_groups = [],
      raw_text = '',
    } = body;

    if (!title || !windows || windows.length === 0) {
      return NextResponse.json({ error: 'Title and windows are required' }, { status: 400 });
    }

    const newId = `BR-REQ-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const newBooking = await BookingRequest.create({
      _id: newId,
      submitted_at: nowIso,
      requester: requester || 'Club Representative',
      role,
      requested_category,
      title,
      attendance: Number(attendance),
      duration_periods: Number(duration_periods),
      windows,
      room_types,
      needs,
      requested_room,
      mandatory_for_groups,
      raw_text,
      status: 'pending',
    });

    try {
      await AuditLog.create({
        _id: `LOG-BR-${Date.now()}`,
        user_id: requester || role,
        action: 'BOOKING_REQUESTED',
        entity_type: 'booking_request',
        entity_id: newId,
        description: `New booking request "${title}" submitted for ${attendance} attendees on ${windows[0]?.day}.`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Venue booking request submitted successfully',
      booking: newBooking,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
