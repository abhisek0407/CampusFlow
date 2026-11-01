import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { BookingRequest } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';

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
    const booking = await BookingRequest.findById(id).lean();

    if (!booking) {
      return NextResponse.json({ success: false, error: `Booking request '${id}' not found` }, { status: 404 });
    }

    // Role check: admin and department_coordinator can view any booking; others can only view their own
    const isOwner = (booking.requester === user.name || booking.role === user.role);
    const isStaff = (user.role === 'admin' || user.role === 'department_coordinator');

    if (!isOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not have permission to view this booking' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
