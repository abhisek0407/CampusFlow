import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/mongodb';
import { BookingRequest, Schedule } from '../../../../../models';
import { requireAuth } from '../../../../../lib/auth';

const PRIORITY_ORDER = ['exam', 'regular_session', 'institute_event', 'guest_lecture', 'department_event', 'club_event'];
const ROLE_CAP = {
  admin: 'institute_event',
  faculty: 'guest_lecture',
  department_coordinator: 'department_event',
  club: 'club_event',
};

export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    const [booking, schedule] = await Promise.all([
      BookingRequest.findById(id).lean(),
      Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean(),
    ]);

    if (!booking) {
      return NextResponse.json({ success: false, error: `Booking '${id}' not found` }, { status: 404 });
    }

    // Authorization: owner, admin, or department_coordinator
    const isOwner = (booking.requester === user.name || booking.role === user.role);
    const isStaff = (user.role === 'admin' || user.role === 'department_coordinator');

    if (!isOwner && !isStaff) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden: You do not have permission to inspect this decision',
      }, { status: 403 });
    }

    // Role category cap
    const cap = ROLE_CAP[booking.role] || 'club_event';
    const requested = booking.requested_category || cap;
    const reqIdx = PRIORITY_ORDER.indexOf(requested);
    const capIdx = PRIORITY_ORDER.indexOf(cap);
    const effectiveCategory = PRIORITY_ORDER[Math.max(reqIdx !== -1 ? reqIdx : capIdx, capIdx)];

    // Check decision in fest_week.bookings
    let festDecision = null;
    if (schedule && schedule.fest_week && schedule.fest_week.bookings) {
      festDecision = schedule.fest_week.bookings.find(
        (b) => (b.request_id || b.id) === id
      ) || null;
    }

    const decisionReason = booking.decision_reason || festDecision?.reason || null;
    const hasReason = Boolean(decisionReason && decisionReason.trim());

    return NextResponse.json({
      success: true,
      booking_id: booking._id,
      title: booking.title,
      requester: booking.requester,
      role: booking.role,
      status: booking.status,
      requested_category: booking.requested_category,
      effective_category: effectiveCategory,
      priority_order: PRIORITY_ORDER,
      priority_rank: PRIORITY_ORDER.indexOf(effectiveCategory) + 1,
      reason_recorded: hasReason,
      decision_reason: hasReason ? decisionReason : null,
      reviewed_by: booking.reviewed_by || null,
      reviewed_at: booking.reviewed_at || null,
      assigned_room: booking.assigned_room || festDecision?.room_id || null,
      assigned_day: booking.assigned_day || festDecision?.day || null,
      assigned_start_period: booking.assigned_start_period || festDecision?.start_period || null,
      assigned_end_period: booking.assigned_end_period || festDecision?.end_period || null,
      check_result_reasons: booking.check_result?.reasons || [],
      fest_week_decision: festDecision,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
