import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { Room } from '../../../models';
import { requireAuth } from '../../../lib/auth';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const minCapacity = searchParams.get('min_capacity');
    const feature = searchParams.get('feature');
    const accessible = searchParams.get('accessible');

    await connectToDatabase();

    const query = {};
    if (type) query.type = type;
    if (minCapacity) query.capacity = { $gte: Number(minCapacity) };
    if (feature) query.features = feature;
    if (accessible === 'true') query.accessible = true;
    else if (accessible === 'false') query.accessible = false;

    const rooms = await Room.find(query).sort({ capacity: -1 }).lean();

    return NextResponse.json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
