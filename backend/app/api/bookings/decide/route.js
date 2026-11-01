import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { BookingRequest, AuditLog } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const body = await request.json();
    const requestId = body.request_id || body.booking_id || body.id;
    const rawStatus = body.status || body.decision;
    const statusMap = {
      approve: 'approved',
      approved: 'approved',
      reject: 'rejected',
      rejected: 'rejected',
      alternative: 'alternative_offered',
      alternative_offered: 'alternative_offered',
    };
    const status = typeof rawStatus === 'string'
      ? (statusMap[rawStatus.toLowerCase()] || rawStatus)
      : null;
    const assignedRoom = body.assigned_room || body.room_id;
    const assignedDay = body.assigned_day || body.day;
    const assignedStartPeriod = body.assigned_start_period ?? body.start_period;
    const assignedEndPeriod = body.assigned_end_period ?? body.end_period;
    const reviewerName = user.name || 'Admin Officer';

    if (!requestId || !status) {
      return NextResponse.json({ success: false, error: 'request_id and status are required' }, { status: 400 });
    }

    const booking = await BookingRequest.findById(requestId);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking request not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Cannot approve or decide a cancelled booking request (Rule B3)' }, { status: 400 });
    }

    booking.status = status;
    booking.decision_reason = body.decision_reason || body.reason || (
      status === 'approved' ? 'Approved by Admin'
        : status === 'rejected' ? 'Slot unavailable due to capacity or conflict'
          : 'Alternative offered'
    );
    if (assignedRoom) booking.assigned_room = assignedRoom;
    if (assignedDay) booking.assigned_day = assignedDay;
    if (assignedStartPeriod !== undefined && assignedStartPeriod !== null) {
      booking.assigned_start_period = Number(assignedStartPeriod);
    }
    if (assignedEndPeriod !== undefined && assignedEndPeriod !== null) {
      booking.assigned_end_period = Number(assignedEndPeriod);
    }
    booking.reviewed_by = reviewerName;
    booking.reviewed_at = new Date();
    await booking.save();

    try {
      await AuditLog.create({
        _id: `LOG-DECIDE-${Date.now()}`,
        user_id: user.id || reviewerName,
        action: `BOOKING_${status.toUpperCase()}`,
        entity_type: 'booking_request',
        entity_id: requestId,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
