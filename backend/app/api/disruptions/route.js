import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { Disruption, AuditLog } from '../../../models';

export async function GET() {
  try {
    await connectToDatabase();
    const disruptions = await Disruption.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, count: disruptions.length, disruptions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { title, source = 'admin', changes } = body;

    if (!title || !changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ error: 'Title and changes array are required' }, { status: 400 });
    }

    const disruptionId = `DISRUPT-${Date.now().toString().slice(-4)}`;
    const disruption = await Disruption.create({
      _id: disruptionId,
      title,
      source,
      changes,
      status: 'pending',
    });

    try {
      await AuditLog.create({
        _id: `LOG-DISRUPT-${Date.now()}`,
        user_id: source,
        action: 'DISRUPTION_SUBMITTED',
        entity_type: 'disruption',
        entity_id: disruptionId,
        description: `Disruption "${title}" submitted with ${changes.length} change(s).`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Disruption registered successfully',
      disruption,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
