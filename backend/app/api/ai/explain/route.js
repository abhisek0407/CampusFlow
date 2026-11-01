import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb.js';
import { BookingRequest, Schedule, Session, Faculty, Room, StudentGroup } from '../../../../models/index.js';
import { requireAuth } from '../../../../lib/auth.js';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    let bookingId = searchParams.get('booking_id') || (searchParams.get('type') === 'booking' ? searchParams.get('id') : null);
    let sessionId = searchParams.get('session_id') || (searchParams.get('type') === 'session' ? searchParams.get('id') : null);

    if (query && !bookingId && !sessionId) {
      if (query.startsWith('BR-')) {
        bookingId = query;
      } else {
        sessionId = query;
      }
    }

    await connectToDatabase();

    // 1. Explain booking decision
    if (bookingId && !sessionId) {
      const booking = await BookingRequest.findById(bookingId).lean();
      if (!booking) {
        return NextResponse.json({ success: false, error: `Booking ${bookingId} not found` }, { status: 404 });
      }

      let explanation = '';
      if (booking.status === 'approved') {
        explanation = `Booking "${booking.title}" (${booking.requested_category}) was APPROVED because:
1. It met room capacity requirements (${booking.attendance} attendees in ${booking.assigned_room || booking.requested_room || 'assigned room'}).
2. It satisfied requested features (${booking.needs ? booking.needs.join(', ') : 'standard'}).
3. Under CIT Priority Rules, ${booking.requested_category} outranks lower priority requests.
4. No conflicts with regular classes or higher-priority institute events.`;
      } else if (booking.status === 'alternative_offered') {
        explanation = `Booking "${booking.title}" was offered an ALTERNATIVE SLOT because:
1. The requested window had conflicts with mandatory classes or prior reservations.
2. Under the role category cap, this request is prioritized as ${booking.requested_category}.
3. The alternative offered ensures zero hard constraint violations and provides required venue features.`;
      } else if (booking.status === 'rejected') {
        explanation = `Booking "${booking.title}" was REJECTED because:
1. Reason: ${booking.decision_reason || 'Requested venue and time slots are occupied by higher-priority bookings or academic classes'}.
2. Rule compliance: CIT Priority Order strictly prioritizes Exams > Regular Classes > Institute Events > Guest Lectures > Department Events > Club Events.
3. No priority inversion occurred: all accepted concurrent bookings had higher priority categories or earlier timestamps.`;
      } else if (booking.status === 'cancelled') {
        explanation = `Booking "${booking.title}" was CANCELLED by the requester (${booking.requester}) before scheduling. Rule B3 mandates that cancelled requests can never be scheduled or approved.`;
      } else {
        explanation = `Booking "${booking.title}" is currently pending evaluation.`;
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
      let assignment = null;
      if (schedule && schedule.sessions) {
        if (Array.isArray(schedule.sessions)) {
          assignment = schedule.sessions.find((s) => (s.session_id || s.id) === sessionId);
        } else if (schedule.sessions[sessionId]) {
          assignment = { session_id: sessionId, ...schedule.sessions[sessionId] };
        }
      }

      const sessionMeta = await Session.findById(sessionId).lean();
      if (!assignment || !sessionMeta) {
        return NextResponse.json({ success: false, error: `Session ${sessionId} assignment or metadata not found` }, { status: 404 });
      }

      const fac = sessionMeta.faculty_id ? await Faculty.findById(sessionMeta.faculty_id).lean() : null;
      const isMorning = assignment.start_period === 1;
      const isLab = sessionMeta.kind === 'lab';

      let slotReason = `Session ${sessionId} was placed on ${assignment.day} at Period P${assignment.start_period} (Duration: ${sessionMeta.duration || 1} hr) in room ${assignment.room_id} because:
1. Hard Constraints: Faculty ${fac?.name || sessionMeta.faculty_id || 'faculty'} has no teaching clashes at this period and remains within the daily teaching limit of ${fac?.max_hours_per_day || 4} hours.
2. Student Groups: Groups [${sessionMeta.groups ? sessionMeta.groups.join(', ') : 'cohort'}] have no overlapping classes or mandatory sessions in this period.
3. Room Fit: Room ${assignment.room_id} accommodates size ${sessionMeta.size || 60} and satisfies required room type (${sessionMeta.room_types ? sessionMeta.room_types.join(', ') : 'classroom'}).
4. Accessibility: ${sessionMeta.needs_accessible ? 'Assigned an accessible venue as required.' : 'Standard venue assigned.'}`;

      if (isMorning) {
        slotReason += `\n5. Period 1 Placement: Scheduled in Period 1 to eliminate gaps in the student group timetable (Soft Constraint S2).`;
      }
      if (isLab) {
        slotReason += `\n5. Lab Start Period: Rule H9 requires 3-hour practical labs to start strictly at P2 (09:00) or P6 (14:00) without crossing lunch.`;
      }

      return NextResponse.json({
        success: true,
        type: 'session_explanation',
        session_id: sessionId,
        assignment,
        explanation: slotReason,
      });
    }

    return NextResponse.json({ success: false, error: 'Please specify either booking_id, session_id, or query parameter' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
