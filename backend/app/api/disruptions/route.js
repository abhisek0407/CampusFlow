import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { Disruption, AuditLog } from '../../../models';
import { requireAuth } from '../../../lib/auth';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    await connectToDatabase();
    // drafts are private to the faculty who created them
    const disruptions = await Disruption.find({
      $or: [{ status: { $ne: 'draft' } }, { requested_by: { $in: [user.id, user.name] } }],
    }).sort({ createdAt: -1 }).lean();
    for (const d of disruptions) {
      if (d.status === 'approved' && d.applied_version == null) {
        d.applied_version = (d.base_version || 1) + 1; // legacy rows approved before applied_version existed
      }
    }
    return NextResponse.json({ success: true, count: disruptions.length, disruptions });
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
    const body = await request.json();
    const { title, changes } = body;
    const source = user.role;

    if (!title || !changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ success: false, error: 'Title and changes array are required' }, { status: 400 });
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
        user_id: user.id || source,
        action: 'DISRUPTION_SUBMITTED',
        entity_type: 'disruption',
        entity_id: disruptionId,
        description: `Disruption "${title}" submitted with ${changes.length} change(s).`,
        timestamp: new Date(),
      });
    } catch (e) { }

    return NextResponse.json({
      success: true,
      message: 'Disruption registered successfully',
      disruption,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}