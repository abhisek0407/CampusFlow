import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { BookingRequest, Cancellation, AuditLog } from '../../../../models';

export async function POST(request) {
  try {
    await connectToDatabase();
    const { request_id, cancelled_by = 'Club Representative', note = 'Withdrawn by requester' } = await request.json();

    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
    }

    const booking = await BookingRequest.findById(request_id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking request not found' }, { status: 404 });
    }

    booking.status = 'cancelled';
    booking.decision_reason = note;
    await booking.save();

    await Cancellation.findOneAndUpdate(
      { request_id },
      {
        _id: request_id,
        request_id,
        cancelled_at: new Date().toISOString(),
        by: cancelled_by,
        note,
      },
      { upsert: true }
    );

    try {
      await AuditLog.create({
        _id: `LOG-CANCEL-${Date.now()}`,
        user_id: cancelled_by,
        action: 'BOOKING_CANCELLED',
        entity_type: 'booking_request',
        entity_id: request_id,
        description: `Booking "${booking.title}" cancelled by ${cancelled_by}: ${note}`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Booking request cancelled successfully',
      booking,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
