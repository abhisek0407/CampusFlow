import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { BookingRequest, Schedule, AuditLog } from '../../../models';
import { requireAuth } from '../../../lib/auth';
import { checkBooking } from '../../../lib/pythonBridge';

const PRIORITY_ORDER = ['exam', 'regular_session', 'institute_event', 'guest_lecture', 'department_event', 'club_event'];
const ROLE_CAP = {
  admin: 'institute_event',
  faculty: 'guest_lecture',
  department_coordinator: 'department_event',
  club: 'club_event',
};

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const requester = searchParams.get('requester');

    await connectToDatabase();
    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;
    if (requester) query.requester = requester;

    const bookings = await BookingRequest.find(query).sort({ submitted_at: 1 }).lean();

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();

    // 1. Check idempotency key if provided
    const idempotencyKey = request.headers.get('idempotency-key') || null;
    if (idempotencyKey) {
      const existing = await BookingRequest.findOne({ idempotency_key: idempotencyKey }).lean();
      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Booking already processed (idempotent)',
          booking: existing,
        });
      }
    }

    const body = await request.json();

    const {
      title,
      attendance = 50,
      duration_periods = 2,
      windows,
      room_types = ['seminar_hall', 'classroom'],
      needs = [],
      requested_room = null,
      mandatory_for_groups = [],
      raw_text = '',
    } = body;

    // Requester & role strictly from verified JWT
    const requester = user.name;
    const role = user.role;

    // Enforce role category cap: lower of requested and role cap
    const cap = ROLE_CAP[role] || 'club_event';
    const requested = body.requested_category || cap;
    const reqIdx = PRIORITY_ORDER.indexOf(requested);
    const capIdx = PRIORITY_ORDER.indexOf(cap);
    const effectiveCategory = PRIORITY_ORDER[Math.max(reqIdx !== -1 ? reqIdx : capIdx, capIdx)];

    if (!title || !windows || !Array.isArray(windows) || windows.length === 0) {
      return NextResponse.json({ success: false, error: 'Title and windows array are required' }, { status: 400 });
    }

    // 2. Re-run feasibility check server-side via Python bridge
    const currentSchedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!currentSchedule) {
      return NextResponse.json({ success: false, error: 'SCHEDULE_CURRENT schedule not found' }, { status: 500 });
    }

    const draft = {
      title,
      requester,
      role,
      requested_category: effectiveCategory,
      attendance: Number(attendance),
      duration_periods: Number(duration_periods),
      windows,
      room_types,
      needs,
      requested_room,
      mandatory_for_groups,
      raw_text,
    };

    let checkResult;
    try {
      checkResult = await checkBooking(draft, currentSchedule);
    } catch (checkErr) {
      return NextResponse.json({ success: false, error: `Feasibility check error: ${checkErr.message}` }, { status: 500 });
    }

    if (checkResult.verdict === 'invalid') {
      return NextResponse.json({
        success: false,
        error: checkResult.reason || 'Invalid booking request parameters',
        reasons: checkResult.reasons || [],
      }, { status: 400 });
    }

    // 3. Generate collision-free ID and save
    let newBooking = null;
    let attempts = 0;
    while (!newBooking && attempts < 5) {
      attempts++;
      const count = await BookingRequest.countDocuments();
      const newId = `BR-${count + attempts}-${Date.now().toString().slice(-4)}`;
      try {
        newBooking = await BookingRequest.create({
          _id: newId,
          submitted_at: new Date().toISOString(),
          requester,
          role,
          requested_category: effectiveCategory,
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
          idempotency_key: idempotencyKey,
          check_result: checkResult,
        });
      } catch (e) {
        if (e.code === 11000) continue;
        throw e;
      }
    }

    // 4. Audit Log
    try {
      await AuditLog.create({
        _id: `LOG-BR-${Date.now()}`,
        user_id: user.id || requester,
        action: 'BOOKING_REQUESTED',
        entity_type: 'booking_request',
        entity_id: newBooking._id,
        description: `New booking request "${title}" (${effectiveCategory}) submitted by ${requester} for ${attendance} attendees. Check verdict: ${checkResult.verdict}.`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Venue booking request submitted successfully',
      booking: newBooking,
      check_result: checkResult,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
