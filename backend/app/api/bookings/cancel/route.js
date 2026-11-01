import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { BookingRequest, Cancellation, AuditLog } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const body = await request.json();
    const request_id = body.request_id || body.booking_id || body.id;
    const note = body.note || 'Withdrawn by requester per Section 4';

    if (!request_id) {
      return NextResponse.json({ success: false, error: 'request_id is required' }, { status: 400 });
    }

    const booking = (await BookingRequest.findById(request_id)) || (await BookingRequest.findOne({ _id: request_id }));
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking request not found' }, { status: 404 });
    }

    // Only owner or admin can cancel
    if (user.role !== 'admin' && booking.requester !== user.name && booking.role !== user.role) {
      return NextResponse.json({ success: false, error: 'Forbidden: You can only cancel your own bookings' }, { status: 403 });
    }

    const cancelled_by = user.name;
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
        user_id: user.id || cancelled_by,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
