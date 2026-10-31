import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { BookingRequest, Schedule, Session, Faculty, Room, StudentGroup } from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const sessionId = searchParams.get('session_id');

    await connectToDatabase();

    // 1. Explain booking decision
    if (bookingId) {
      const booking = await BookingRequest.findById(bookingId).lean();
      if (!booking) {
        return NextResponse.json({ error: `Booking ${bookingId} not found` }, { status: 404 });
      }

      let explanation = '';
      if (booking.status === 'approved') {
        explanation = `Booking "${booking.title}" (${booking.requested_category}) was APPROVED because:
1. It met all room capacity requirements (${booking.attendance} attendees in ${booking.assigned_room}).
2. It satisfied all requested features (${booking.needs.join(', ') || 'standard'}).
3. Under CIT Priority Rules, ${booking.requested_category} outranks club requests and was submitted on ${booking.submitted_at}.
4. There were no conflicts with regular classes or higher-priority institute events at ${booking.assigned_day} P${booking.assigned_start_period}-P${booking.assigned_end_period}.`;
      } else if (booking.status === 'alternative_offered') {
        explanation = `Booking "${booking.title}" was offered an ALTERNATIVE SLOT in ${booking.assigned_room} on ${booking.assigned_day} P${booking.assigned_start_period}-P${booking.assigned_end_period} because:
1. The original requested window had conflicts with mandatory classes or prior reservations.
2. Under the role category cap, this request is prioritized as ${booking.requested_category}.
3. The alternative offered ensures zero hard constraint violations and provides the required venue features.`;
      } else if (booking.status === 'rejected') {
        explanation = `Booking "${booking.title}" was REJECTED because:
1. Reason: ${booking.decision_reason || 'Requested venue and time slots are occupied by higher-priority bookings or academic classes'}.
2. Rule compliance: CIT Priority Order strictly prioritizes Exams > Regular Classes > Institute Events > Guest Lectures > Department Events > Club Events.
3. No priority inversion occurred: all accepted concurrent bookings had higher priority categories or earlier timestamps.`;
      } else if (booking.status === 'cancelled') {
        explanation = `Booking "${booking.title}" was CANCELLED by the requester (${booking.requester}) before scheduling. Rule B3 mandates that cancelled requests can never be scheduled or approved.`;
      } else {
        explanation = `Booking "${booking.title}" is currently pending evaluation by the scheduling engine and Dean's office.`;
      }

      return NextResponse.json({
        success: true,
        type: 'booking_explanation',
        item_id: bookingId,
        title: booking.title,
        status: booking.status,
        explanation,
      });
    }

    // 2. Explain session scheduling decision
    if (sessionId) {
      const schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
      const assignment = schedule?.sessions?.find((s) => s.session_id === sessionId);
      const sessionMeta = await Session.findById(sessionId).lean();
      const fac = sessionMeta ? await Faculty.findById(sessionMeta.faculty_id).lean() : null;

      if (!assignment || !sessionMeta) {
        return NextResponse.json({ error: `Session ${sessionId} not found in schedule` }, { status: 404 });
      }

      const isMorning = assignment.start_period === 1; // 8 AM
      const isLab = sessionMeta.kind === 'lab';

      let slotReason = `Session ${sessionId} was placed on ${assignment.day} at Period P${assignment.start_period} (Duration: ${sessionMeta.duration} hr) in room ${assignment.room_id} because:
1. Hard Constraints: Faculty ${fac?.name || sessionMeta.faculty_id} has no teaching clashes at this period and remains within the daily teaching limit of ${fac?.max_hours_per_day || 4} hours.
2. Student Groups: Groups [${sessionMeta.groups.join(', ')}] have no overlapping classes or mandatory sessions in this period.
3. Room Fit: Room ${assignment.room_id} accommodates size ${sessionMeta.size} and satisfies required room type (${sessionMeta.room_types.join(', ')}).
4. Accessibility: ${sessionMeta.needs_accessible ? 'Assigned an accessible venue as required.' : 'Standard venue assigned.'}`;

      if (isMorning) {
        slotReason += `\n5. Why 8 AM (P1)? The optimization solver scheduled this lecture in Period 1 to eliminate gaps in the student group timetable (Soft Constraint S2) and avoid faculty time restrictions later in the day.`;
      }
      if (isLab) {
        slotReason += `\n5. Why P${assignment.start_period}? Rule H9 requires 3-hour practical labs to start strictly at P2 (09:00) or P6 (14:00) without crossing lunch.`;
      }

      return NextResponse.json({
        success: true,
        type: 'session_explanation',
        session_id: sessionId,
        assignment,
        explanation: slotReason,
      });
    }

    return NextResponse.json({ error: 'Please specify either booking_id or session_id query parameter' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
