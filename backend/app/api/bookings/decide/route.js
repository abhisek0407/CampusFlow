import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { BookingRequest, AuditLog } from '../../../../models';

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const request_id = body.request_id;
    const status = body.status || (body.decision === 'alternative' ? 'alternative_offered' : (body.decision === 'approve' ? 'approved' : (body.decision === 'reject' ? 'rejected' : body.decision)));
    const assigned_room = body.assigned_room || body.room_id;
    const assigned_day = body.assigned_day || body.day;
    const assigned_start_period = body.assigned_start_period || body.start_period;
    const assigned_end_period = body.assigned_end_period || body.end_period;
    const decision_reason = body.decision_reason || body.reason;
    const reviewer_name = body.reviewer_name || 'Admin Officer';

    if (!request_id || !status) {
      return NextResponse.json({ error: 'request_id and status are required' }, { status: 400 });
    }

    const booking = await BookingRequest.findById(request_id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking request not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot approve or decide a cancelled booking request (Rule B3)' }, { status: 400 });
    }

    booking.status = status;
    booking.decision_reason = decision_reason || (status === 'approved' ? 'Approved by Admin' : 'Slot unavailable');
    if (assigned_room) booking.assigned_room = assigned_room;
    if (assigned_day) booking.assigned_day = assigned_day;
    if (assigned_start_period) booking.assigned_start_period = Number(assigned_start_period);
    if (assigned_end_period) booking.assigned_end_period = Number(assigned_end_period);
    booking.reviewed_by = reviewer_name;
    booking.reviewed_at = new Date();

    await booking.save();

    try {
      await AuditLog.create({
        _id: `LOG-DECIDE-${Date.now()}`,
        user_id: reviewer_name,
        action: `BOOKING_${status.toUpperCase()}`,
        entity_type: 'booking_request',
        entity_id: request_id,
        description: `Booking "${booking.title}" was ${status}: ${booking.decision_reason}`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Booking decision saved: ${status}`,
      booking,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
