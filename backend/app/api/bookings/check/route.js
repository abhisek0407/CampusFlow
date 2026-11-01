import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Schedule } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';
import { checkBooking } from '../../../../lib/pythonBridge';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const body = await request.json();
    const draft = body.draft || body;

    // Use requester and role from JWT if not specified or to enforce user role
    const checkedDraft = {
      ...draft,
      requester: user.name || draft.requester || 'Requester',
      role: user.role || draft.role || 'club',
    };

    // Load active schedule as baseline
    const currentSchedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!currentSchedule) {
      return NextResponse.json({ success: false, error: 'SCHEDULE_CURRENT not found in database' }, { status: 500 });
    }

    // Call python bridge (read-only, never writes to database)
    const result = await checkBooking(checkedDraft, currentSchedule);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Bookings check error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
